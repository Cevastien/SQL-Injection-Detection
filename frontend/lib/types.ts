export type ViewKey = "overview" | "analyzer" | "explainability" | "performance" | "management" | "logs";

export type ExplanationRow = {
  indicator: string;
  attack_type: string;
  severity: string;
  interpretation: string;
};

export type RuleBasedIndicators = {
  suspicious: boolean;
  detected_keywords: string[];
  matched_rules: Array<{
    attack_type: string;
    severity: string;
    matched_pattern: string;
    meaning: string;
  }>;
  interpreted_severity: string;
};

export type PredictionResult = {
  prediction: string;
  prediction_label: number;
  ml_prediction: string;
  ml_prediction_label: number;
  rule_based_indicators: RuleBasedIndicators;
  final_security_decision: string;
  confidence: number;
  attack_probability: number;
  risk_level: string;
  attack_type: string;
  detected_sql_keywords: string[];
  processed_query: string;
  explanation: string;
  security_recommendation: string;
  explanation_table: ExplanationRow[];
  timestamp: string;
};

export type DetectionLog = PredictionResult & {
  id: string;
  query: string;
};

export type ExplainabilityResponse = {
  processed_query: string;
  detected_sql_keywords: string[];
  possible_attack_type: string;
  severity: string;
  explanation_table: ExplanationRow[];
  shap_note: string;
};

export type ModelInfo = {
  model_file_name: string;
  vectorizer_file_name: string;
  rf_model_file_name: string;
  xgb_model_file_name: string;
  metrics_file_name?: string | null;
  dataset_used: string;
  last_updated?: string | null;
  model_source?: string | null;
  uploaded_from_management?: boolean;
  runtime_upload_active?: boolean;
  runtime_model_source?: string | null;
  runtime_dataset_used?: string | null;
  runtime_loaded_at?: string | null;
  model_classes: Array<string | number>;
  model_loaded_status: boolean;
  vectorizer_loaded_status: boolean;
  artifact_status: Record<string, boolean>;
  model_type?: string | null;
  vectorizer_type?: string | null;
  inference_flow?: string[];
};

export type ModelManagementResponse = {
  message: string;
  model_info: ModelInfo;
};

export type ConfusionMatrixData = {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
};

export type ModelMetric = {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1?: number;
  f1_score?: number;
  rocAuc?: number;
  roc_auc?: number;
  confusion_matrix?: ConfusionMatrixData | null;
};

export type MetricsResponse = {
  models: ModelMetric[];
  hybrid_confusion_matrix: ConfusionMatrixData;
  source?: string;
  dataset?: string;
  last_updated?: string | null;
  rows_evaluated?: number | null;
  rows_after_cleaning?: number | null;
  removed_noise_records?: number | null;
  duplicate_records_removed?: number | null;
  evaluation_basis?: string | null;
  dynamic?: boolean;
};
