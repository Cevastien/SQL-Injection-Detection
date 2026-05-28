import type { BadgeProps } from "@/components/ui/badge";

export function riskTone(risk: string): BadgeProps["tone"] {
  const normalized = risk.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("high")) return "destructive";
  if (normalized.includes("medium")) return "default";
  if (normalized.includes("low") || normalized.includes("informational")) return "secondary";
  return "outline";
}

export function predictionTone(prediction: string): BadgeProps["tone"] {
  const normalized = prediction.toLowerCase();
  if (normalized.includes("attack")) return "destructive";
  if (normalized.includes("suspicious") || normalized.includes("review")) return "default";
  return "secondary";
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
