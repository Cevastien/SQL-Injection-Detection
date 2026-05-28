import type { SecurityReasoning } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type SecurityReasoningDetailsProps = {
  reasoning: SecurityReasoning;
  className?: string;
  compact?: boolean;
};

export function SecurityReasoningDetails({ reasoning, className, compact = false }: SecurityReasoningDetailsProps) {
  const sections = [
    ["Goal of the Attack", reasoning.goalOfAttack],
    ["Technical Method", reasoning.technicalMethod],
    ["Impact", reasoning.impact],
    ["Risk Basis", reasoning.riskJustification]
  ];

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", compact && "gap-2", className)}>
      {sections.map(([label, value]) => (
        <div key={label} className={cn("rounded-lg border border-border bg-background/35 p-3", compact && "p-2.5")}>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-sm leading-5 text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}
