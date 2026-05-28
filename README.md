# SQL Injection Detection Dashboard

A machine-learning SQL injection detector using a hybrid Random Forest + XGBoost pipeline, TF-IDF character n-gram features, rule-based validation, risk scoring, explainability, and scan history.

## Links

- Live dashboard: https://sqli-rho.vercel.app/
- Model and dataset files: https://drive.google.com/drive/folders/1qtb3YTUzbmE7ohLjInDcx7naNUMmGyUz
- Training pipeline notebook: `notebooks/SQL_ATTACK_fixedpipeline.ipynb`

## 5-Step Setup

### 1. Clone the repository

```powershell
git clone https://github.com/Cevastien/SQL-Injection-Detection.git
cd SQL-Injection-Detection
```

### 2. Start the FastAPI backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Start the Next.js frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Local app: http://127.0.0.1:3000/

### 4. Upload the model and dataset

Open the dashboard, go to **Model Management**, then upload:

- `model_artifacts.zip`
- `Modified_SQL_Dataset.csv`

Download both files from the Google Drive link above. The Query Analyzer and Model Performance charts stay locked until the model ZIP and dataset CSV are uploaded.

### 5. Run a detection test

Go to **Query Analyzer**, paste a SQL query, and click **Analyze**.

Sample attack input:

```sql
' OR 1=1 /*
```

Sample benign input:

```sql
SELECT id, username FROM users WHERE username = 'maria';
```

## Notes

- Vercel runs the Next.js dashboard.
- FastAPI runs the ML inference backend.
- The backend loads the uploaded `.pkl` model artifacts at runtime.
- Scan history is stored locally in the browser for the active uploaded model session.
