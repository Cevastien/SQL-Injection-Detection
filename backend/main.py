from datetime import datetime, timezone
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from explainability import explanation_rows, interpret_sqli_type, preprocess_text
from model_loader import (
    InvalidModelArtifacts,
    MissingModelArtifacts,
    ModelArtifactLoadError,
    model_service,
)


def _as_percent(value: object) -> float:
    numeric = float(value)
    return numeric * 100 if numeric <= 1 else numeric


def _metric_payload(model_name: str, metrics: Dict[str, object]) -> Dict[str, object]:
    return {
        "model": model_name,
        "accuracy": _as_percent(metrics.get("accuracy", 0.0)),
        "precision": _as_percent(metrics.get("precision", 0.0)),
        "recall": _as_percent(metrics.get("recall", 0.0)),
        "f1": _as_percent(metrics.get("f1_score", metrics.get("f1", 0.0))),
        "rocAuc": float(metrics.get("roc_auc", metrics.get("rocAuc", 0.0))),
        "confusion_matrix": metrics.get("confusion_matrix"),
    }


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="SQL query or request fragment to analyze")


class ExplainabilityRequest(BaseModel):
    query: str = Field(..., min_length=1)


REQUIRED_UPLOAD_MESSAGE = "Upload failed. Required model artifacts are incomplete."


app = FastAPI(
    title="SQL Injection Detection API",
    description="FastAPI service for the subject project hybrid ensemble SQLi detection model.",
    version="1.0.0",
)

configured_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        *configured_origins,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_load_model() -> None:
    # Streamlit-style workflow: the deployed dashboard starts without an active model.
    # Users upload the exported model ZIP and dataset CSV to activate inference.
    model_service.reset()


@app.get("/health")
def health() -> Dict[str, object]:
    return {
        "status": "ready" if model_service.loaded else "model_artifacts_missing",
        "model_loaded": model_service.loaded,
        "artifacts": model_service.artifact_status(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/debug-model")
def debug_model() -> Dict[str, object]:
    return model_service.debug_info()


@app.get("/model-info")
def model_info() -> Dict[str, object]:
    return model_service.debug_info()


@app.post("/reload-model")
def reload_model() -> Dict[str, object]:
    model_service.reset()

    return {
        "message": "Uploaded model cleared. Upload a model ZIP and dataset CSV before analyzing queries.",
        "model_info": model_service.debug_info(),
    }


@app.post("/upload/artifacts")
async def upload_artifacts(
    hybrid_model: UploadFile | None = File(default=None),
    tfidf_vectorizer: UploadFile | None = File(default=None),
    rf_model: UploadFile | None = File(default=None),
    xgb_model: UploadFile | None = File(default=None),
    artifact_zip: UploadFile | None = File(default=None),
    dataset_file: UploadFile | None = File(default=None),
) -> Dict[str, object]:
    uploads = {
        "hybrid_model.pkl": hybrid_model,
        "tfidf_vectorizer.pkl": tfidf_vectorizer,
        "rf_model.pkl": rf_model,
        "xgb_model.pkl": xgb_model,
    }

    invalid_file = next(
        (file.filename for file in uploads.values() if file and not file.filename.lower().endswith(".pkl")),
        None,
    )
    if invalid_file:
        raise HTTPException(status_code=400, detail=f"Upload failed. Invalid file type: {invalid_file}. Only .pkl files are accepted.")

    zip_filename = Path(artifact_zip.filename).name if artifact_zip and artifact_zip.filename else ""
    if artifact_zip and not zip_filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail=f"Upload failed. Invalid archive file type: {artifact_zip.filename}. Only .zip files are accepted.")

    dataset_filename = Path(dataset_file.filename).name if dataset_file and dataset_file.filename else ""
    if dataset_file and not dataset_filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail=f"Upload failed. Invalid dataset file type: {dataset_file.filename}. Only .csv files are accepted.")

    if dataset_file is None:
        raise HTTPException(status_code=400, detail="Upload failed. Dataset CSV is required before the dashboard can analyze queries.")

    temp_dir = Path(tempfile.mkdtemp(prefix="sqli_artifacts_"))
    zip_extract_dir = temp_dir / "artifact_zip"
    temp_paths: Dict[str, Path] = {}
    dataset_path: Path | None = None

    try:
        if artifact_zip:
            zip_path = temp_dir / zip_filename
            with zip_path.open("wb") as output:
                shutil.copyfileobj(artifact_zip.file, output)

            try:
                with zipfile.ZipFile(zip_path) as archive:
                    zip_extract_dir.mkdir(parents=True, exist_ok=True)
                    for member in archive.infolist():
                        if member.is_dir():
                            continue

                        filename = Path(member.filename).name
                        if filename not in uploads or uploads[filename] is not None:
                            continue

                        target = zip_extract_dir / filename
                        with archive.open(member) as source, target.open("wb") as output:
                            shutil.copyfileobj(source, output)
                        temp_paths[filename] = target
            except zipfile.BadZipFile as exc:
                raise InvalidModelArtifacts("Upload failed. The artifact ZIP could not be opened.") from exc

        for filename, upload in uploads.items():
            if upload is None:
                continue
            target = temp_dir / filename
            with target.open("wb") as output:
                shutil.copyfileobj(upload.file, output)
            temp_paths[filename] = target

        if any(filename not in temp_paths for filename in uploads):
            raise HTTPException(status_code=400, detail=REQUIRED_UPLOAD_MESSAGE)

        if dataset_file:
            dataset_path = temp_dir / dataset_filename
            with dataset_path.open("wb") as output:
                shutil.copyfileobj(dataset_file.file, output)

        model_info_after_upload = model_service.load_runtime_artifact_set(temp_paths, dataset_path)
    except InvalidModelArtifacts as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelArtifactLoadError as exc:
        raise HTTPException(status_code=400, detail=f"Upload failed. {exc}") from exc
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        for upload in uploads.values():
            if upload is not None:
                await upload.close()
        if artifact_zip is not None:
            await artifact_zip.close()
        if dataset_file is not None:
            await dataset_file.close()

    return {
        "message": "Upload success. Model ZIP and dataset CSV validated and loaded. The dashboard can now analyze queries.",
        "model_info": model_info_after_upload,
    }


@app.post("/debug-predict")
def debug_predict(payload: QueryRequest) -> Dict[str, object]:
    try:
        return model_service.debug_predict(payload.query)
    except (MissingModelArtifacts, ModelArtifactLoadError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/metrics")
def metrics() -> Dict[str, object]:
    metadata = model_service.runtime_upload_metadata.get("metrics_metadata")
    if not isinstance(metadata, dict) or not metadata.get("metrics"):
        raise HTTPException(
            status_code=409,
            detail="Upload the model artifact ZIP and dataset CSV before viewing model performance metrics.",
        )

    return {
        "models": [
            _metric_payload("Random Forest", metadata["metrics"]["random_forest"]),
            _metric_payload("XGBoost", metadata["metrics"]["xgboost"]),
            _metric_payload("Hybrid Ensemble", metadata["metrics"]["hybrid_ensemble"]),
        ],
        "hybrid_confusion_matrix": metadata["metrics"]["hybrid_ensemble"]["confusion_matrix"],
        "source": metadata.get("source_notebook", "Uploaded artifacts evaluated by FastAPI"),
        "dataset": metadata.get("dataset_name", "Uploaded dataset"),
        "last_updated": metadata.get("exported_at"),
        "rows_evaluated": metadata.get("rows_evaluated"),
        "rows_after_cleaning": metadata.get("rows_after_cleaning"),
        "removed_noise_records": metadata.get("removed_noise_records"),
        "duplicate_records_removed": metadata.get("duplicate_records_removed"),
        "evaluation_basis": metadata.get("evaluation_basis"),
        "dynamic": True,
    }


@app.post("/predict")
def predict(payload: QueryRequest) -> Dict[str, object]:
    try:
        result = model_service.predict(payload.query)
    except (MissingModelArtifacts, ModelArtifactLoadError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    return result


@app.post("/explain")
def explain(payload: ExplainabilityRequest) -> Dict[str, object]:
    processed = preprocess_text(payload.query)
    attack_type, keywords, severity, matches = interpret_sqli_type(processed)

    return {
        "processed_query": processed,
        "detected_sql_keywords": keywords,
        "possible_attack_type": attack_type if matches else "No suspicious SQL patterns detected",
        "severity": severity if matches else "Informational",
        "explanation_table": explanation_rows(processed),
        "shap_note": "Full SHAP summary, bar, waterfall, and force plots are available in the official Colab notebook.",
    }
