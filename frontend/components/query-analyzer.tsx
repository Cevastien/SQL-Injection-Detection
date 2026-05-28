"use client";

import { useEffect, useState } from "react";
import { IconLoader2, IconPlayerPlay, IconRefresh, IconShieldCheck, IconShieldExclamation } from "@tabler/icons-react";

import { SecurityReasoningDetails } from "@/components/security-reasoning-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { analyzeQuery, getModelInfo } from "@/lib/api";
import { sampleQueries } from "@/lib/data";
import { formatPercent, predictionTone, riskTone } from "@/lib/ui-helpers";
import { displayAttackTypeLabel, displayDetectionStatus, displayResultText, displayRiskLabel, getSecurityReasoning, uiLabels } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";
import type { ModelInfo, PredictionResult } from "@/lib/types";

const requiredArtifactNames = ["hybrid_model.pkl", "tfidf_vectorizer.pkl", "rf_model.pkl", "xgb_model.pkl"];

function isModelReady(modelInfo: ModelInfo | null) {
  if (!modelInfo?.model_loaded_status || !modelInfo.vectorizer_loaded_status) {
    return false;
  }

  return requiredArtifactNames.every((filename) => modelInfo.artifact_status?.[filename]);
}

export function QueryAnalyzer({ onResult }: { onResult: (query: string, result: PredictionResult) => void }) {
  const [query, setQuery] = useState(sampleQueries[0].query);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loadingModelInfo, setLoadingModelInfo] = useState(true);
  const [modelInfoError, setModelInfoError] = useState("");

  async function refreshModelInfo() {
    setLoadingModelInfo(true);
    setModelInfoError("");
    try {
      const nextModelInfo = await getModelInfo();
      setModelInfo(nextModelInfo);
      return nextModelInfo;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to verify model status";
      setModelInfoError(message);
      return null;
    } finally {
      setLoadingModelInfo(false);
    }
  }

  useEffect(() => {
    void refreshModelInfo();
  }, []);

  async function handleAnalyze() {
    setError("");
    setLoading(true);
    try {
      const latestModelInfo = await refreshModelInfo();
      if (!isModelReady(latestModelInfo)) {
        setError("Model artifacts are not loaded yet. Upload the model ZIP or reload the model before analyzing a query.");
        return;
      }

      const nextResult = await analyzeQuery(query);
      setResult(nextResult);
      onResult(query, nextResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze query");
    } finally {
      setLoading(false);
    }
  }

  const mlPrediction = result?.ml_prediction ?? (result?.prediction_label === 1 ? "SQL Injection Attack" : "Benign");
  const finalDecision = result?.final_security_decision ?? result?.prediction ?? "Benign";
  const mlPredictionStatus = displayDetectionStatus(mlPrediction);
  const finalDecisionStatus = displayDetectionStatus(finalDecision);
  const ruleIndicators = result?.rule_based_indicators;
  const suspiciousIndicators = ruleIndicators?.suspicious ?? false;
  const securityReasoning = result
    ? getSecurityReasoning(result.attack_type, result.risk_level, result.detected_sql_keywords.join(", "))
    : null;
  const alertingDecision = finalDecisionStatus !== uiLabels.benignQuery;
  const modelReady = isModelReady(modelInfo);
  const modelStatusText = modelInfoError
    ? `Unable to verify model status: ${modelInfoError}`
    : loadingModelInfo
      ? "Checking model artifacts"
      : modelReady
        ? "Model artifacts loaded and ready"
        : "Model artifacts are not loaded";
  const decisionTone = finalDecisionStatus.toLowerCase().includes("attack")
    ? "attack"
    : finalDecisionStatus === uiLabels.benignQuery
      ? "safe"
      : "review";

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>SQL Query Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} spellCheck={false} />

          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sample) => (
              <Button key={sample.label} variant="secondary" size="sm" className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm" onClick={() => setQuery(sample.query)}>
                {sample.label}
              </Button>
            ))}
          </div>

          <div
            className={cn(
              "flex flex-col gap-3 rounded-xl border border-border p-4 text-sm sm:flex-row sm:items-center sm:justify-between",
              modelReady ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"
            )}
          >
            <span>{modelStatusText}</span>
            <Button variant="secondary" size="sm" onClick={refreshModelInfo} disabled={loadingModelInfo || loading}>
              <IconRefresh className={cn("mr-2", loadingModelInfo && "animate-spin")} size={16} stroke={1.8} />
              Refresh model status
            </Button>
          </div>

          <Button onClick={handleAnalyze} disabled={loading || loadingModelInfo || !modelReady || !query.trim()} className="w-full sm:w-auto">
            {loading ? <IconLoader2 className="mr-2 animate-spin" size={16} stroke={1.8} /> : <IconPlayerPlay className="mr-2" size={16} stroke={1.8} />}
            {modelReady ? "Analyze" : "Load model first"}
          </Button>

          {error && (
            <div className="rounded-xl border border-border bg-warning p-4 text-sm text-warning-foreground">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Output</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground sm:min-h-[380px]">
              Waiting for inference
            </div>
          ) : (
            <div className="space-y-5">
              <div
                className={cn(
                  "flex flex-col items-start justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center",
                  decisionTone === "attack" && "border-[color:var(--attack-border)] bg-attack text-attack-foreground",
                  decisionTone === "safe" && "border-border bg-safe text-success-foreground",
                  decisionTone === "review" && "border-border bg-review text-warning-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border",
                      decisionTone === "attack" && "border-[color:var(--attack-border)] bg-attack text-attack-foreground",
                      decisionTone === "review" && "border-warning-border bg-warning text-warning-foreground",
                      decisionTone === "safe" && "border-success-border bg-safe text-success-foreground"
                    )}
                  >
                    {alertingDecision ? <IconShieldExclamation size={20} stroke={1.8} /> : <IconShieldCheck size={20} stroke={1.8} />}
                  </div>
                  <div>
                    <p className="text-sm text-current/80">Final Security Decision</p>
                    <p className="text-lg font-semibold text-current sm:text-xl">{finalDecisionStatus}</p>
                  </div>
                </div>
                <Badge tone={predictionTone(finalDecisionStatus)}>{finalDecisionStatus}</Badge>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">ML Prediction</p>
                  <p className="mt-2 break-words text-lg font-semibold text-foreground">{mlPredictionStatus}</p>
                  <Badge className="mt-3" tone={predictionTone(mlPredictionStatus)}>
                    {mlPredictionStatus}
                  </Badge>
                </div>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{uiLabels.suspiciousPatterns}</p>
                  <p className="mt-2 break-words text-lg font-semibold text-foreground">
                    {suspiciousIndicators ? "Suspicious SQL patterns detected" : uiLabels.noSuspiciousPatterns}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={suspiciousIndicators ? "default" : "secondary"}>
                      {suspiciousIndicators ? uiLabels.suspiciousQuery : uiLabels.benignQuery}
                    </Badge>
                    <Badge tone="outline">{result.detected_sql_keywords.length} keyword(s)</Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Final Security Decision</p>
                  <p className="mt-2 break-words text-lg font-semibold text-foreground">{finalDecisionStatus}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={predictionTone(finalDecisionStatus)}>{finalDecisionStatus}</Badge>
                    <Badge tone={riskTone(result.risk_level)}>{displayRiskLabel(result.risk_level)}</Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{uiLabels.detectionConfidence}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatPercent(result.confidence)}</p>
                <Progress value={result.confidence} className="mt-3" />
              </div>

              <div className="rounded-xl border border-border bg-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Attack type</p>
                <p className="mt-2 font-medium text-foreground">{displayAttackTypeLabel(result.attack_type)}</p>
              </div>

              <div className="rounded-xl border border-border bg-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{uiLabels.detectedSqlKeywords}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.detected_sql_keywords.length ? (
                    result.detected_sql_keywords.map((keyword) => (
                      <Badge key={keyword} tone="outline">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{uiLabels.securityReasoning}</p>
                  {securityReasoning && <SecurityReasoningDetails className="mt-3" reasoning={securityReasoning} />}
                </div>
                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Recommendation</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{displayResultText(result.security_recommendation)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
