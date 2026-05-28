import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { displayDetectionStatus, displayRiskLabel, uiLabels } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 max-h-5 shrink-0 items-center whitespace-nowrap rounded border px-2 py-0 text-[11px] font-normal leading-none transition-[background-color,color,border-color,opacity] duration-200",
  {
    variants: {
      tone: {
        default: "border-transparent bg-warning text-warning-foreground",
        secondary: "border-transparent bg-success text-success-foreground",
        destructive: "border-transparent bg-attack text-attack-foreground",
        outline: "border-transparent bg-sidebar-accent text-subtle-foreground",
        accent: "border-transparent bg-sidebar-accent text-subtle-foreground"
      }
    },
    defaultVariants: {
      tone: "outline"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function normalizeBadgeText(children: React.ReactNode) {
  if (typeof children !== "string") return children;

  const normalized = children.trim().toLowerCase();
  if (
    normalized === "sql injection attack" ||
    normalized === "suspicious / needs review" ||
    normalized === "attack/review" ||
    normalized === "review-oriented detection" ||
    normalized === "benign"
  ) {
    return displayDetectionStatus(children);
  }

  if (
    normalized === "critical" ||
    normalized === "high" ||
    normalized === "medium" ||
    normalized === "low" ||
    normalized === "informational" ||
    normalized === "elevated threat"
  ) {
    return displayRiskLabel(children);
  }

  if (normalized === "detected") return uiLabels.suspiciousQuery;
  if (normalized === "none") return displayDetectionStatus("Benign");
  if (normalized === "present") return "Present";
  if (normalized === "loaded") return "Loaded";
  return children;
}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone }), className)} {...props}>{normalizeBadgeText(props.children)}</div>;
}

export { badgeVariants };
