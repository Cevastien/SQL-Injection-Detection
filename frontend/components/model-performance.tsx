"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { confusionMatrix, modelMetrics } from "@/lib/data";
import { cn } from "@/lib/utils";

const metricChartData = modelMetrics.map((metric) => ({
  model: metric.model,
  Accuracy: metric.accuracy,
  Precision: metric.precision,
  Recall: metric.recall,
  F1: metric.f1
}));

const metricByModel = Object.fromEntries(modelMetrics.map((metric) => [metric.model, metric]));

const mobileMetricChartData = [
  {
    metric: "Accuracy",
    rf: metricByModel["Random Forest"]?.accuracy ?? 0,
    xgb: metricByModel.XGBoost?.accuracy ?? 0,
    hybrid: metricByModel["Hybrid Ensemble"]?.accuracy ?? 0
  },
  {
    metric: "Precision",
    rf: metricByModel["Random Forest"]?.precision ?? 0,
    xgb: metricByModel.XGBoost?.precision ?? 0,
    hybrid: metricByModel["Hybrid Ensemble"]?.precision ?? 0
  },
  {
    metric: "Recall",
    rf: metricByModel["Random Forest"]?.recall ?? 0,
    xgb: metricByModel.XGBoost?.recall ?? 0,
    hybrid: metricByModel["Hybrid Ensemble"]?.recall ?? 0
  },
  {
    metric: "F1",
    rf: metricByModel["Random Forest"]?.f1 ?? 0,
    xgb: metricByModel.XGBoost?.f1 ?? 0,
    hybrid: metricByModel["Hybrid Ensemble"]?.f1 ?? 0
  }
];

const rocData = modelMetrics.map((metric) => ({
  model: metric.model,
  "ROC-AUC": metric.rocAuc
}));

const mobileRocData = modelMetrics.map((metric) => ({
  model: metric.model === "Random Forest" ? "RF" : metric.model === "Hybrid Ensemble" ? "Hybrid" : "XGB",
  "ROC-AUC": metric.rocAuc,
  fullModel: metric.model
}));

const chartStyle = {
  grid: "var(--border)",
  text: "var(--muted-foreground)",
  tooltip: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    color: "var(--popover-foreground)"
  },
  tooltipLabel: {
    color: "var(--foreground)",
    fontWeight: 600
  },
  tooltipItem: {
    color: "var(--subtle-foreground)",
    fontWeight: 400
  }
};

const baselineFill = "var(--subtle-foreground)";
const baselineAltFill = "var(--muted-foreground)";
const hybridFill = "var(--chart-1)";

type ModelPerformanceProps = {
  checkingModel: boolean;
  modelReady: boolean;
  onGoToModelManagement: () => void;
};

export function ModelPerformance({ checkingModel, modelReady, onGoToModelManagement }: ModelPerformanceProps) {
  if (checkingModel) {
    return (
      <PerformanceGate
        title="Checking Uploaded Model"
        description="The dashboard is verifying that the model ZIP and dataset CSV are loaded before showing performance charts."
      />
    );
  }

  if (!modelReady) {
    return (
      <PerformanceGate
        title="Upload Required Before Charts"
        description="Model performance is hidden until the model artifact ZIP and dataset CSV are uploaded in Model Management."
        actionLabel="Go to Model Management"
        onAction={onGoToModelManagement}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Official Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Precision</TableHead>
                <TableHead>Recall</TableHead>
                <TableHead>F1-score</TableHead>
                <TableHead>ROC-AUC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelMetrics.map((metric) => (
                <TableRow key={metric.model}>
                  <TableCell className="font-medium text-foreground">
                    {metric.model}
                  </TableCell>
                  <TableCell>{metric.accuracy.toFixed(4)}%</TableCell>
                  <TableCell>{metric.precision.toFixed(4)}%</TableCell>
                  <TableCell>{metric.recall.toFixed(4)}%</TableCell>
                  <TableCell>{metric.f1.toFixed(4)}%</TableCell>
                  <TableCell>{metric.rocAuc.toFixed(5)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Metric Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden flex-wrap items-center justify-center gap-4 text-xs text-subtle-foreground sm:flex">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-subtle-foreground" />
                Random Forest / XGBoost
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                Hybrid Ensemble
              </span>
            </div>
            <div className="sm:hidden">
              <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-subtle-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-subtle-foreground" />
                  RF
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-muted-foreground" />
                  XGB
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-primary" />
                  Hybrid
                </span>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mobileMetricChartData}
                    layout="vertical"
                    margin={{ left: 8, right: 8, top: 8, bottom: 4 }}
                    barGap={3}
                    barCategoryGap={12}
                  >
                    <CartesianGrid stroke={chartStyle.grid} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[98, 100]} stroke={chartStyle.text} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <YAxis type="category" dataKey="metric" width={86} stroke={chartStyle.text} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} itemStyle={chartStyle.tooltipItem} />
                    <Bar dataKey="rf" name="Random Forest" fill={baselineFill} radius={[0, 6, 6, 0]} animationDuration={720} animationEasing="ease-out" />
                    <Bar dataKey="xgb" name="XGBoost" fill={baselineAltFill} radius={[0, 6, 6, 0]} animationDuration={720} animationEasing="ease-out" />
                    <Bar dataKey="hybrid" name="Hybrid Ensemble" fill={hybridFill} radius={[0, 6, 6, 0]} animationDuration={720} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="-mx-2 hidden overflow-x-auto px-2 pb-2 sm:block">
              <div className="h-[320px] min-w-[620px] sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricChartData} margin={{ left: 0, right: 16, top: 12, bottom: 8 }}>
                  <CartesianGrid stroke={chartStyle.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="model" stroke={chartStyle.text} tickLine={false} axisLine={false} />
                  <YAxis domain={[98, 100]} stroke={chartStyle.text} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} itemStyle={chartStyle.tooltipItem} />
                  <Bar dataKey="Accuracy" radius={[6, 6, 0, 0]} animationDuration={720} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`accuracy-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineFill} />
                    ))}
                  </Bar>
                  <Bar dataKey="Precision" radius={[6, 6, 0, 0]} animationDuration={720} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`precision-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineAltFill} />
                    ))}
                  </Bar>
                  <Bar dataKey="Recall" radius={[6, 6, 0, 0]} animationDuration={720} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`recall-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineFill} />
                    ))}
                  </Bar>
                  <Bar dataKey="F1" radius={[6, 6, 0, 0]} animationDuration={720} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`f1-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineAltFill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hybrid Confusion Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfusionMatrix />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROC-AUC Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="sm:hidden">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mobileRocData} margin={{ left: 2, right: 8, top: 12, bottom: 8 }}>
                  <CartesianGrid stroke={chartStyle.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="model" stroke={chartStyle.text} tickLine={false} axisLine={false} />
                  <YAxis domain={[0.999, 1]} stroke={chartStyle.text} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} itemStyle={chartStyle.tooltipItem} />
                  <Bar dataKey="ROC-AUC" radius={[6, 6, 0, 0]} animationDuration={720} animationEasing="ease-out">
                    {mobileRocData.map((entry) => (
                      <Cell key={`mobile-roc-${entry.fullModel}`} fill={entry.fullModel === "Hybrid Ensemble" ? "var(--chart-1)" : "var(--subtle-foreground)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="-mx-2 hidden overflow-x-auto px-2 pb-2 sm:block">
            <div className="h-[240px] min-w-[520px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rocData} margin={{ left: 0, right: 16, top: 12, bottom: 8 }}>
                <CartesianGrid stroke={chartStyle.grid} strokeDasharray="3 3" />
                <XAxis dataKey="model" stroke={chartStyle.text} tickLine={false} axisLine={false} />
                <YAxis domain={[0.999, 1]} stroke={chartStyle.text} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} itemStyle={chartStyle.tooltipItem} />
                <Bar dataKey="ROC-AUC" radius={[6, 6, 0, 0]} animationDuration={720} animationEasing="ease-out">
                  {rocData.map((entry) => (
                    <Cell key={`roc-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? "var(--chart-1)" : "var(--subtle-foreground)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceGate({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-w-2xl space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="w-full sm:w-auto">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ConfusionMatrix() {
  const total = confusionMatrix.tn + confusionMatrix.fp + confusionMatrix.fn + confusionMatrix.tp;
  const accuracy = total ? ((confusionMatrix.tn + confusionMatrix.tp) / total) * 100 : 0;
  const falsePositiveRate = confusionMatrix.tn + confusionMatrix.fp
    ? (confusionMatrix.fp / (confusionMatrix.tn + confusionMatrix.fp)) * 100
    : 0;
  const falseNegativeRate = confusionMatrix.fn + confusionMatrix.tp
    ? (confusionMatrix.fn / (confusionMatrix.fn + confusionMatrix.tp)) * 100
    : 0;

  return (
    <div className="space-y-4">
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Predicted status
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[62px_repeat(2,minmax(0,1fr))] sm:grid-cols-[78px_repeat(2,minmax(0,1fr))]">
          <MatrixHeader className="border-b border-r border-border">Actual</MatrixHeader>
          <MatrixHeader className="border-b border-r border-border">Benign</MatrixHeader>
          <MatrixHeader className="border-b border-border">Attack</MatrixHeader>

          <MatrixRowHeader className="border-b border-r border-border">Benign</MatrixRowHeader>
          <MatrixCell
            label="TN"
            value={confusionMatrix.tn}
            tone="success"
            subtitle="Correct clear"
            className="border-b border-r border-border"
          />
          <MatrixCell
            label="FP"
            value={confusionMatrix.fp}
            tone="danger"
            subtitle="False alarm"
            className="border-b border-border"
          />

          <MatrixRowHeader className="border-r border-border">Attack</MatrixRowHeader>
          <MatrixCell
            label="FN"
            value={confusionMatrix.fn}
            tone="danger"
            subtitle="Missed attack"
            className="border-r border-border"
          />
          <MatrixCell
            label="TP"
            value={confusionMatrix.tp}
            tone="success"
            subtitle="Correct detect"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-muted text-xs">
        <MatrixSummary label="Accuracy" value={`${accuracy.toFixed(2)}%`} />
        <MatrixSummary label="FPR" value={`${falsePositiveRate.toFixed(2)}%`} className="border-x border-border" />
        <MatrixSummary label="FNR" value={`${falseNegativeRate.toFixed(2)}%`} />
      </div>
    </div>
  );
}

function MatrixHeader({ className, children }: { className?: string; children: string }) {
  return (
    <div className={cn("flex h-11 items-center justify-center bg-muted px-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground", className)}>
      {children}
    </div>
  );
}

function MatrixRowHeader({ className, children }: { className?: string; children: string }) {
  return (
    <div className={cn("flex min-h-[96px] items-center justify-center bg-muted px-2 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:min-h-[116px]", className)}>
      <span className="[writing-mode:vertical-rl] rotate-180">{children}</span>
    </div>
  );
}

function MatrixCell({
  label,
  value,
  subtitle,
  tone,
  className
}: {
  label: string;
  value: number;
  subtitle: string;
  tone: "success" | "danger";
  className?: string;
}) {
  const toneClass = {
    success: "bg-success/10 text-success-foreground",
    danger: "bg-attack/10 text-attack-foreground"
  }[tone];

  return (
    <div
      className={cn("min-h-[96px] p-3 transition-[filter] duration-200 hover:brightness-110 sm:min-h-[116px] sm:p-4", toneClass, className)}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-95">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none sm:text-[34px]">{value}</p>
      <p className="mt-1 text-xs opacity-95">{subtitle}</p>
    </div>
  );
}

function MatrixSummary({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("px-3 py-3 text-center", className)}>
      <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}
