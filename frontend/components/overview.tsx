"use client";

import { IconCrosshair, IconShieldCheck, IconSum, IconTarget } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/ui-helpers";
import { displayAttackTypeLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";
import type { DetectionLog, MetricsResponse, ModelMetric } from "@/lib/types";

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

const threatColors = [
  "#e85002",
  "#ff9f1c",
  "#b94700",
  "#f6c177",
  "#8f5a1a"
];

type NormalizedMetric = {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
};

function normalizeMetric(metric: ModelMetric): NormalizedMetric {
  return {
    model: metric.model,
    accuracy: metric.accuracy,
    precision: metric.precision,
    recall: metric.recall,
    f1: metric.f1 ?? metric.f1_score ?? 0
  };
}

function buildMetricChartData(metrics: NormalizedMetric[]) {
  return metrics.map((metric) => ({
    model: metric.model,
    Accuracy: metric.accuracy,
    Precision: metric.precision,
    Recall: metric.recall,
    F1: metric.f1
  }));
}

function buildMobileMetricChartData(metrics: NormalizedMetric[]) {
  const metricByModel = Object.fromEntries(metrics.map((metric) => [metric.model, metric]));
  return [
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
}

const baselineFill = "var(--subtle-foreground)";
const baselineAltFill = "var(--muted-foreground)";
const hybridFill = "var(--chart-1)";

function StatCard({
  label,
  value,
  subtext,
  accent,
  icon: Icon
}: {
  label: string;
  value: string;
  subtext: string;
  accent?: boolean;
  icon: typeof IconSum;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-muted-foreground" stroke={1.8} />
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">{label}</p>
        </div>
        <p
          className={cn(
            "mt-4 text-2xl font-semibold leading-none tracking-normal text-card-foreground sm:text-[28px]"
          )}
          style={accent ? { color: "var(--primary)" } : undefined}
        >
          {value}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
}

export function Overview({ logs, modelReady }: { logs: DetectionLog[]; modelReady: boolean }) {
  const [metricsResponse, setMetricsResponse] = useState<MetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelReady) {
      setMetricsResponse(null);
      setMetricsError(null);
      setMetricsLoading(false);
      return;
    }

    let cancelled = false;
    setMetricsLoading(true);
    setMetricsError(null);

    fetch("/api/metrics", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail ?? "Unable to load model metrics");
        }
        return data as MetricsResponse;
      })
      .then((data) => {
        if (!cancelled) {
          setMetricsResponse(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMetricsError(error instanceof Error ? error.message : "Unable to load model metrics");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [modelReady]);

  const modelMetrics = useMemo(
    () => (metricsResponse?.models ?? []).map(normalizeMetric),
    [metricsResponse]
  );
  const metricChartData = useMemo(() => buildMetricChartData(modelMetrics), [modelMetrics]);
  const mobileMetricChartData = useMemo(() => buildMobileMetricChartData(modelMetrics), [modelMetrics]);

  const total = logs.length;
  const finalDecisionFor = (log: DetectionLog) => log.final_security_decision ?? log.prediction;
  const isAttack = (log: DetectionLog) => finalDecisionFor(log).toLowerCase().includes("attack");
  const isBenign = (log: DetectionLog) => finalDecisionFor(log).toLowerCase() === "benign";
  const attacks = logs.filter(isAttack).length;
  const benign = logs.filter(isBenign).length;
  const averageConfidence = total ? logs.reduce((sum, log) => sum + log.confidence, 0) / total : 0;

  const distribution = Object.entries(
    logs
      .filter((log) => !isBenign(log))
      .reduce<Record<string, number>>((acc, log) => {
        const attackType = displayAttackTypeLabel(log.attack_type);
        acc[attackType] = (acc[attackType] ?? 0) + 1;
        return acc;
      }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalThreats = distribution.reduce((sum, item) => sum + item.value, 0);
  const distributionData = distribution.length ? distribution : [{ name: "No threats", value: 1 }];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard label="Total scanned" value={String(total)} subtext="Queries analyzed" icon={IconSum} />
        <StatCard label="Detected attacks" value={String(attacks)} subtext="Final attack decisions" icon={IconCrosshair} accent />
        <StatCard label="Benign queries" value={String(benign)} subtext="Final benign decisions" icon={IconShieldCheck} />
        <StatCard label="Avg detection confidence" value={formatPercent(averageConfidence)} subtext="Average scan confidence" icon={IconTarget} />
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Metric Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {!modelReady || metricsLoading || metricsError || !modelMetrics.length ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {!modelReady
                  ? "Upload the model ZIP and dataset CSV to show model performance."
                  : metricsLoading
                    ? "Loading uploaded model metrics..."
                    : metricsError ?? "No uploaded model metrics are available yet."}
              </div>
            ) : (
              <>
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
                    <Bar dataKey="rf" name="Random Forest" fill={baselineFill} radius={[0, 6, 6, 0]} animationDuration={700} animationEasing="ease-out" />
                    <Bar dataKey="xgb" name="XGBoost" fill={baselineAltFill} radius={[0, 6, 6, 0]} animationDuration={700} animationEasing="ease-out" />
                    <Bar dataKey="hybrid" name="Hybrid Ensemble" fill={hybridFill} radius={[0, 6, 6, 0]} animationDuration={700} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <div className="h-[300px] min-w-[620px] sm:h-[330px]">
              <div className="mb-4 flex flex-wrap justify-center gap-4 text-xs text-subtle-foreground">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-subtle-foreground" />
                  Random Forest / XGBoost
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  Hybrid Ensemble
                </span>
              </div>
              <ResponsiveContainer width="100%" height="86%">
                <BarChart data={metricChartData} margin={{ left: 0, right: 16, top: 12, bottom: 8 }}>
                  <CartesianGrid stroke={chartStyle.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="model" stroke={chartStyle.text} tickLine={false} axisLine={false} />
                  <YAxis domain={[98, 100]} stroke={chartStyle.text} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} itemStyle={chartStyle.tooltipItem} />
                  <Bar dataKey="Accuracy" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`overview-accuracy-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineFill} />
                    ))}
                  </Bar>
                  <Bar dataKey="Precision" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`overview-precision-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineAltFill} />
                    ))}
                  </Bar>
                  <Bar dataKey="Recall" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`overview-recall-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineFill} />
                    ))}
                  </Bar>
                  <Bar dataKey="F1" radius={[6, 6, 0, 0]} animationDuration={700} animationEasing="ease-out">
                    {metricChartData.map((entry) => (
                      <Cell key={`overview-f1-${entry.model}`} fill={entry.model === "Hybrid Ensemble" ? hybridFill : baselineAltFill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threat Composition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid min-h-[280px] gap-5 sm:min-h-[330px] lg:grid-cols-[0.8fr_1fr] xl:grid-cols-1 2xl:grid-cols-[0.8fr_1fr]">
              <div className="relative h-[180px] lg:h-full xl:h-[180px] 2xl:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={chartStyle.tooltip} labelStyle={chartStyle.tooltipLabel} itemStyle={chartStyle.tooltipItem} />
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="64%"
                      outerRadius="88%"
                      paddingAngle={distribution.length > 1 ? 3 : 0}
                      stroke="var(--card)"
                      strokeWidth={4}
                      animationDuration={700}
                      animationEasing="ease-out"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell
                          key={`threat-${entry.name}`}
                          fill={distribution.length ? threatColors[index % threatColors.length] : "var(--muted)"}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Threats</p>
                  <p className="mt-1 text-3xl font-semibold text-foreground">{totalThreats}</p>
                </div>
              </div>

              <div className="space-y-3">
                {distribution.length ? (
                  distribution.map((item, index) => {
                    const percent = totalThreats ? (item.value / totalThreats) * 100 : 0;
                    return (
                      <div key={item.name} className="rounded-xl border border-border bg-muted p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{ backgroundColor: threatColors[index % threatColors.length] }}
                            />
                            <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{item.name}</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-foreground">{item.value}</p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: threatColors[index % threatColors.length]
                            }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">{formatPercent(percent, 0)} of threats</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
                    No threat types recorded
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
