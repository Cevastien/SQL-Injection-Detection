import pickle
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import joblib

from explainability import (
    build_explanation,
    explanation_rows,
    final_security_decision,
    has_suspicious_indicators,
    interpret_sqli_type,
    preprocess_text,
    security_recommendation,
)


MODEL_DIR = Path(__file__).resolve().parent / "models"
HYBRID_MODEL_PATH = MODEL_DIR / "hybrid_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "tfidf_vectorizer.pkl"
XGB_MODEL_PATH = MODEL_DIR / "xgb_model.pkl"
RF_MODEL_PATH = MODEL_DIR / "rf_model.pkl"
METRICS_PATH = MODEL_DIR / "metrics.json"
REQUIRED_ARTIFACTS = {
    "hybrid_model.pkl": HYBRID_MODEL_PATH,
    "tfidf_vectorizer.pkl": VECTORIZER_PATH,
    "rf_model.pkl": RF_MODEL_PATH,
    "xgb_model.pkl": XGB_MODEL_PATH,
}


class MissingModelArtifacts(RuntimeError):
    pass


class ModelArtifactLoadError(RuntimeError):
    pass


class InvalidModelArtifacts(RuntimeError):
    pass


VALIDATION_QUERY = "SELECT id, username FROM users WHERE id = 5"


def _python_value(value: object) -> object:
    return value.item() if hasattr(value, "item") else value


def _load_serialized_artifact(path: Path) -> object:
    # Keep the loader compatible with both joblib dumps and plain pickle artifacts.
    try:
        return joblib.load(path)
    except Exception as joblib_error:
        try:
            with path.open("rb") as file:
                return pickle.load(file)
        except Exception as pickle_error:
            raise ModelArtifactLoadError(
                f"Unable to load serialized artifact {path.name} with joblib or pickle. "
                f"joblib={joblib_error}; pickle={pickle_error}"
            ) from pickle_error


def _file_updated_at(path: Path) -> str | None:
    if not path.exists():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def _latest_artifact_updated_at() -> str | None:
    timestamps = [
        path.stat().st_mtime
        for path in REQUIRED_ARTIFACTS.values()
        if path.exists()
    ]
    if not timestamps:
        return None
    return datetime.fromtimestamp(max(timestamps), tz=timezone.utc).isoformat()


class SQLiModelService:
    def __init__(self) -> None:
        self.hybrid_model = None
        self.vectorizer = None
        self.runtime_upload_metadata: Dict[str, object] = {}
        self.active_artifact_status = {filename: False for filename in REQUIRED_ARTIFACTS}

    def reset(self) -> None:
        self.hybrid_model = None
        self.vectorizer = None
        self.runtime_upload_metadata = {}
        self.active_artifact_status = {filename: False for filename in REQUIRED_ARTIFACTS}

    def artifact_status(self) -> Dict[str, bool]:
        status = dict(self.active_artifact_status)
        status["metrics.json"] = METRICS_PATH.exists()
        return status

    def metrics_metadata(self) -> Dict[str, object]:
        if not METRICS_PATH.exists():
            return {}

        try:
            return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def debug_info(self) -> Dict[str, object]:
        runtime_upload = self.runtime_upload_metadata
        model_source = runtime_upload.get("source", "No uploaded model active")
        return {
            "model_file_name": HYBRID_MODEL_PATH.name,
            "vectorizer_file_name": VECTORIZER_PATH.name,
            "rf_model_file_name": RF_MODEL_PATH.name,
            "xgb_model_file_name": XGB_MODEL_PATH.name,
            "metrics_file_name": METRICS_PATH.name if METRICS_PATH.exists() else None,
            "dataset_used": runtime_upload.get("dataset_name", "No dataset uploaded"),
            "last_updated": runtime_upload.get("last_updated"),
            "model_source": model_source,
            "uploaded_from_management": bool(runtime_upload),
            "runtime_upload_active": bool(runtime_upload),
            "runtime_model_source": runtime_upload.get("source"),
            "runtime_dataset_used": runtime_upload.get("dataset_name"),
            "runtime_loaded_at": runtime_upload.get("last_updated"),
            "model_classes": self.model_classes(),
            "model_loaded_status": self.hybrid_model is not None,
            "vectorizer_loaded_status": self.vectorizer is not None,
            "artifact_status": self.artifact_status(),
            "model_type": type(self.hybrid_model).__name__ if self.hybrid_model is not None else None,
            "vectorizer_type": type(self.vectorizer).__name__ if self.vectorizer is not None else None,
            "inference_flow": [
                "preprocess_text",
                "tfidf_vectorizer.transform",
                "hybrid_model.predict",
                "hybrid_model.predict_proba",
                "rule_based_security_validation",
            ],
        }

    def load(self) -> None:
        missing = [
            filename
            for filename, path in REQUIRED_ARTIFACTS.items()
            if not path.exists()
        ]

        if missing:
            raise MissingModelArtifacts(
                "Missing required model artifact(s): "
                + ", ".join(missing)
                + ". Run backend/export_models.py using the official notebook dataset."
            )

        self.vectorizer = _load_serialized_artifact(VECTORIZER_PATH)
        self.hybrid_model = _load_serialized_artifact(HYBRID_MODEL_PATH)
        self.runtime_upload_metadata = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "dataset_name": self.metrics_metadata().get("dataset_name", "Bundled model artifacts"),
            "source": "Bundled artifacts loaded manually",
        }
        self.active_artifact_status = {filename: True for filename in REQUIRED_ARTIFACTS}

    @property
    def loaded(self) -> bool:
        return self.hybrid_model is not None and self.vectorizer is not None

    def ensure_loaded(self) -> None:
        if self.loaded:
            return

        raise MissingModelArtifacts(
            "No uploaded model artifacts are loaded. Upload the model ZIP and dataset CSV before analyzing a query."
        )

    def model_classes(self) -> List[object]:
        if self.hybrid_model is None or not hasattr(self.hybrid_model, "classes_"):
            return []

        return [_python_value(item) for item in self.hybrid_model.classes_]

    def _vectorize_query(self, processed_query: str):
        return self.vectorizer.transform([processed_query])

    def _predict_with_model(self, vectorized_query) -> Tuple[int, float, float]:
        raw_prediction = int(self.hybrid_model.predict(vectorized_query)[0])
        probabilities = self.hybrid_model.predict_proba(vectorized_query)[0]
        confidence = float(max(probabilities) * 100)
        classes = self.model_classes()
        probability_by_class = {
            class_value: float(probabilities[index] * 100)
            for index, class_value in enumerate(classes)
        }
        attack_probability = probability_by_class.get(1, 0.0)
        return raw_prediction, confidence, attack_probability

    def predict(self, query: str) -> Dict[str, object]:
        self.ensure_loaded()

        processed = preprocess_text(query)
        vectorized = self._vectorize_query(processed)
        raw_prediction, confidence, attack_probability = self._predict_with_model(vectorized)

        attack_type, keywords, interpreted_severity, matches = interpret_sqli_type(processed)
        suspicious_indicators = has_suspicious_indicators(processed, keywords, matches)
        final_decision, risk_level = final_security_decision(
            raw_prediction,
            confidence,
            suspicious_indicators,
            interpreted_severity,
        )
        final_prediction_label = 1 if final_decision == "SQL Injection Attack" else 0

        if raw_prediction == 0 and not suspicious_indicators:
            attack_type = "Legitimate / Benign Query"
        elif raw_prediction == 1 and not suspicious_indicators:
            attack_type = "ML-detected SQL Injection Pattern"

        ml_prediction = "SQL Injection Attack" if raw_prediction == 1 else "Benign"

        return {
            "prediction": final_decision,
            "prediction_label": final_prediction_label,
            "ml_prediction": ml_prediction,
            "ml_prediction_label": raw_prediction,
            "rule_based_indicators": {
                "suspicious": suspicious_indicators,
                "detected_keywords": keywords,
                "matched_rules": matches,
                "interpreted_severity": interpreted_severity,
            },
            "final_security_decision": final_decision,
            "confidence": round(confidence, 2),
            "attack_probability": round(attack_probability, 2),
            "risk_level": risk_level,
            "attack_type": attack_type,
            "detected_sql_keywords": keywords,
            "processed_query": processed,
            "explanation": build_explanation(
                processed,
                raw_prediction,
                attack_type,
                keywords,
                final_decision,
                suspicious_indicators,
            ),
            "security_recommendation": security_recommendation(raw_prediction, attack_type, final_decision),
            "explanation_table": explanation_rows(processed),
        }

    def debug_predict(self, query: str) -> Dict[str, object]:
        self.ensure_loaded()

        cleaned_query = preprocess_text(query)
        vectorized = self._vectorize_query(cleaned_query)
        raw_prediction = int(self.hybrid_model.predict(vectorized)[0])
        probabilities = self.hybrid_model.predict_proba(vectorized)[0]
        classes = self.model_classes()
        probability_by_class = {
            class_value: float(probabilities[index] * 100)
            for index, class_value in enumerate(classes)
        }
        attack_type, keywords, interpreted_severity, matches = interpret_sqli_type(cleaned_query)
        suspicious_indicators = has_suspicious_indicators(cleaned_query, keywords, matches)
        final_decision, risk_level = final_security_decision(
            raw_prediction,
            max(probability_by_class.values()) if probability_by_class else 0.0,
            suspicious_indicators,
            interpreted_severity,
        )
        final_prediction_label = 1 if final_decision == "SQL Injection Attack" else 0

        return {
            "raw_query": query,
            "cleaned_query": cleaned_query,
            "vector_shape": list(vectorized.shape),
            "model_classes": classes,
            "prediction": final_decision,
            "prediction_label": final_prediction_label,
            "ml_prediction": "SQL Injection Attack" if raw_prediction == 1 else "Benign",
            "ml_prediction_label": raw_prediction,
            "predict_proba": [round(float(value * 100), 4) for value in probabilities],
            "benign_probability": round(probability_by_class.get(0, 0.0), 4),
            "attack_probability": round(probability_by_class.get(1, 0.0), 4),
            "detected_keywords": keywords,
            "rule_based_indicators": {
                "suspicious": suspicious_indicators,
                "matched_rules": matches,
                "interpreted_severity": interpreted_severity,
                "attack_type": attack_type,
            },
            "final_security_decision": final_decision,
            "risk_level": risk_level,
        }

    def validate_artifact_set(self, artifact_paths: Dict[str, Path]) -> None:
        missing = [
            filename
            for filename in REQUIRED_ARTIFACTS
            if filename not in artifact_paths or not artifact_paths[filename].exists()
        ]
        if missing:
            raise InvalidModelArtifacts("Upload failed. Required model artifacts are incomplete.")

        invalid_types = [
            path.name
            for path in artifact_paths.values()
            if path.suffix.lower() != ".pkl"
        ]
        if invalid_types:
            raise InvalidModelArtifacts("Upload failed. All model artifacts must be .pkl files.")

        hybrid_model = _load_serialized_artifact(artifact_paths["hybrid_model.pkl"])
        vectorizer = _load_serialized_artifact(artifact_paths["tfidf_vectorizer.pkl"])
        _load_serialized_artifact(artifact_paths["rf_model.pkl"])
        _load_serialized_artifact(artifact_paths["xgb_model.pkl"])

        if not hasattr(hybrid_model, "predict") or not hasattr(hybrid_model, "predict_proba"):
            raise InvalidModelArtifacts("Upload failed. hybrid_model.pkl must provide predict() and predict_proba().")

        if not hasattr(vectorizer, "transform"):
            raise InvalidModelArtifacts("Upload failed. tfidf_vectorizer.pkl must provide transform().")

        try:
            validation_vector = vectorizer.transform([preprocess_text(VALIDATION_QUERY)])
            prediction = hybrid_model.predict(validation_vector)
            probabilities = hybrid_model.predict_proba(validation_vector)
        except Exception as exc:
            raise InvalidModelArtifacts(
                "Upload failed. The uploaded model and vectorizer could not run an end-to-end prediction together."
            ) from exc

        if len(prediction) != 1 or len(probabilities) != 1:
            raise InvalidModelArtifacts(
                "Upload failed. The uploaded model returned an invalid prediction shape during validation."
            )

    def load_runtime_artifact_set(self, artifact_paths: Dict[str, Path], dataset_path: Path | None = None) -> Dict[str, object]:
        self.validate_artifact_set(artifact_paths)

        metadata = self.metrics_metadata()
        self.hybrid_model = _load_serialized_artifact(artifact_paths["hybrid_model.pkl"])
        self.vectorizer = _load_serialized_artifact(artifact_paths["tfidf_vectorizer.pkl"])
        self.runtime_upload_metadata = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "dataset_name": dataset_path.name if dataset_path else metadata.get("dataset_name", "Temporary uploaded artifacts"),
            "source": "Uploaded through Model Management",
        }
        self.active_artifact_status = {filename: True for filename in REQUIRED_ARTIFACTS}

        return self.debug_info()


model_service = SQLiModelService()
