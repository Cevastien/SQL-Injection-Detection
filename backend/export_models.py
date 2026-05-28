import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

import joblib
import pandas as pd
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split


PREPROCESS_PATTERN = r'[^a-zA-Z0-9\s=\<\>\!\'"\(\)\[\]\{\}\-_\+\/\*\&\|\%\.\,\;\:\#\]]+'


def preprocess_text(text: object) -> str:
    text = unquote(str(text))
    if not isinstance(text, str):
        text = str(text)
    text = text.lower()
    text = re.sub(PREPROCESS_PATTERN, "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def evaluate(model, x_test, y_test):
    y_pred = model.predict(x_test)
    y_proba = model.predict_proba(x_test)[:, 1]
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred)),
        "recall": float(recall_score(y_test, y_pred)),
        "f1_score": float(f1_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def export_models(dataset_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path)
    if "Query" in df.columns:
        df = df.rename(columns={"Query": "Sentence"})

    initial_rows = len(df)
    union_noise_mask = df["Sentence"].str.contains("UNION SELECT", case=False, na=False) & (df["Label"] == 0)
    removed_noise = int(union_noise_mask.sum())
    df = df[~union_noise_mask].copy()

    df["Processed_Sentence"] = df["Sentence"].apply(preprocess_text)
    df = df.drop_duplicates(subset=["Processed_Sentence"])

    x = df["Processed_Sentence"]
    y = df["Label"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    tfidf_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 4),
        max_features=15000,
        sublinear_tf=True,
        min_df=2,
    )
    x_train_tfidf = tfidf_vectorizer.fit_transform(x_train)
    x_test_tfidf = tfidf_vectorizer.transform(x_test)

    rf_classifier = RandomForestClassifier(
        n_estimators=200,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    pos_weight = len(y_train[y_train == 0]) / len(y_train[y_train == 1])
    xgb_classifier = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )

    rf_classifier.fit(x_train_tfidf, y_train)
    xgb_classifier.fit(x_train_tfidf, y_train)

    hybrid_model = VotingClassifier(
        estimators=[("rf", rf_classifier), ("xgb", xgb_classifier)],
        voting="soft",
        n_jobs=-1,
    )
    hybrid_model.fit(x_train_tfidf, y_train)

    joblib.dump(hybrid_model, output_dir / "hybrid_model.pkl")
    joblib.dump(tfidf_vectorizer, output_dir / "tfidf_vectorizer.pkl")
    joblib.dump(xgb_classifier, output_dir / "xgb_model.pkl")
    joblib.dump(rf_classifier, output_dir / "rf_model.pkl")

    metadata = {
        "source_notebook": "SQL_Attack_Detection_30k_.ipynb",
        "dataset_name": "Modified_SQL_Dataset / 30k dataset",
        "dataset_path": str(dataset_path),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "initial_rows": int(initial_rows),
        "removed_noisy_benign_union_select_rows": removed_noise,
        "rows_after_duplicate_removal": int(len(df)),
        "test_size": 0.20,
        "random_state": 42,
        "stratified": True,
        "tfidf": {
            "analyzer": "char_wb",
            "ngram_range": [2, 4],
            "max_features": 15000,
            "sublinear_tf": True,
            "min_df": 2,
        },
        "random_forest": {
            "n_estimators": 200,
            "class_weight": "balanced",
            "random_state": 42,
            "n_jobs": -1,
        },
        "xgboost": {
            "n_estimators": 200,
            "max_depth": 6,
            "learning_rate": 0.1,
            "scale_pos_weight": float(pos_weight),
            "eval_metric": "logloss",
            "random_state": 42,
            "n_jobs": -1,
        },
        "metrics": {
            "random_forest": evaluate(rf_classifier, x_test_tfidf, y_test),
            "xgboost": evaluate(xgb_classifier, x_test_tfidf, y_test),
            "hybrid_ensemble": evaluate(hybrid_model, x_test_tfidf, y_test),
        },
    }
    (output_dir / "training_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (output_dir / "metrics.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print("Export complete.")
    print(f"Saved artifacts to: {output_dir}")
    print(json.dumps(metadata["metrics"]["hybrid_ensemble"], indent=2))


def parse_args():
    parser = argparse.ArgumentParser(description="Export official notebook SQLi detection model artifacts.")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path(r"C:\Users\USER\Downloads\Modified_SQL_Dataset.csv\Modified_SQL_Dataset.csv"),
        help="Path to the official Modified_SQL_Dataset 30k CSV.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "models",
        help="Directory where model artifact files will be written.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    export_models(args.dataset, args.output_dir)
