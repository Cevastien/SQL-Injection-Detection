"use client";

import { IconTrash } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent, formatTimestamp, predictionTone, riskTone } from "@/lib/ui-helpers";
import { displayDetectionStatus, displayRiskLabel, uiLabels } from "@/lib/ui-labels";
import type { DetectionLog } from "@/lib/types";

export function DetectionLogs({ logs, onClear }: { logs: DetectionLog[]; onClear: () => void }) {
  return (
    <Card>
      <CardHeader className="flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <CardTitle>Local {uiLabels.scanHistory}</CardTitle>
        <Button variant="secondary" size="sm" onClick={onClear} disabled={!logs.length}>
          <IconTrash className="mr-2" size={16} stroke={1.8} />
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Query</TableHead>
              <TableHead>ML Prediction</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Final Decision</TableHead>
              <TableHead>{uiLabels.detectionConfidence}</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length ? (
              logs.map((log) => {
                const mlPrediction = log.ml_prediction ?? (log.prediction_label === 1 ? "SQL Injection Attack" : "Benign");
                const finalDecision = log.final_security_decision ?? log.prediction;
                const mlPredictionStatus = displayDetectionStatus(mlPrediction);
                const finalDecisionStatus = displayDetectionStatus(finalDecision);
                const suspicious = log.rule_based_indicators?.suspicious ?? false;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatTimestamp(log.timestamp)}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs text-foreground" title={log.query}>
                      {log.query}
                    </TableCell>
                    <TableCell>
                      <Badge tone={predictionTone(mlPredictionStatus)}>{mlPredictionStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={suspicious ? "default" : "secondary"}>
                        {suspicious ? uiLabels.suspiciousQuery : uiLabels.benignQuery}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={predictionTone(finalDecisionStatus)}>{finalDecisionStatus}</Badge>
                    </TableCell>
                    <TableCell>{formatPercent(log.confidence)}</TableCell>
                    <TableCell>
                      <Badge tone={riskTone(log.risk_level)}>{displayRiskLabel(log.risk_level)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No scan history stored
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
