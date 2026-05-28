"use client";

import { useEffect, useState } from "react";
import { IconBulb, IconLoader2, IconSearch } from "@tabler/icons-react";

import { SecurityReasoningDetails } from "@/components/security-reasoning-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { explainQuery } from "@/lib/api";
import { sampleQueries } from "@/lib/data";
import { riskTone } from "@/lib/ui-helpers";
import { displayAttackTypeLabel, displayRiskLabel, getSecurityReasoning, uiLabels } from "@/lib/ui-labels";
import type { DetectionLog, ExplainabilityResponse } from "@/lib/types";

export function ExplainabilityPanel({ latestLog }: { latestLog?: DetectionLog }) {
  const [query, setQuery] = useState(latestLog?.query ?? sampleQueries[1].query);
  const [result, setResult] = useState<ExplainabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (latestLog?.query) {
      setQuery(latestLog.query);
    }
  }, [latestLog?.query]);

  async function handleExplain() {
    setError("");
    setLoading(true);
    try {
      setResult(await explainQuery(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load explanation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{uiLabels.queryInterpretation}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} spellCheck={false} />
          <Button className="w-full sm:w-auto" onClick={handleExplain} disabled={loading || !query.trim()}>
            {loading ? <IconLoader2 className="mr-2 animate-spin" size={16} stroke={1.8} /> : <IconSearch className="mr-2" size={16} stroke={1.8} />}
            Interpret query
          </Button>
          {error && (
            <div className="rounded-xl border border-border bg-warning p-4 text-sm text-warning-foreground">
              {error}
            </div>
          )}
          <div className="rounded-xl border border-border bg-muted p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <IconBulb size={16} className="text-muted-foreground" stroke={1.8} />
              Security reasoning
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              The prototype explains results using detected SQL keywords, matched attack patterns, risk level, and review-friendly security reasoning.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4 md:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{uiLabels.detectedSqlKeywords}</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="rounded-xl border border-dashed border-border bg-muted p-8 text-center text-sm text-muted-foreground">
                No explanation loaded
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="min-w-0 rounded-xl border border-border bg-muted p-4">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Possible attack type</p>
                    <p className="mt-2 break-words font-medium text-foreground">{displayAttackTypeLabel(result.possible_attack_type)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted p-4">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Risk</p>
                    <div className="mt-3">
                      <Badge tone={riskTone(result.severity)}>{displayRiskLabel(result.severity)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
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

                <div className="rounded-xl border border-border bg-muted p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Processed Query</p>
                  <p className="mt-2 break-words font-mono text-sm text-foreground">{result.processed_query}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explanation Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[1180px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">{uiLabels.suspiciousPatterns}</TableHead>
                  <TableHead className="w-[210px]">Attack Type</TableHead>
                  <TableHead className="w-[130px]">Risk</TableHead>
                  <TableHead className="w-[620px]">{uiLabels.securityReasoning}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result?.explanation_table.length ? (
                  result.explanation_table.map((row) => {
                    const reasoning = getSecurityReasoning(row.attack_type, row.severity, row.indicator);

                    return (
                      <TableRow key={`${row.indicator}-${row.attack_type}`}>
                        <TableCell className="break-words font-mono text-foreground">{row.indicator}</TableCell>
                        <TableCell className="break-words">{displayAttackTypeLabel(row.attack_type)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge tone={riskTone(row.severity)}>{displayRiskLabel(row.severity)}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <SecurityReasoningDetails reasoning={reasoning} compact />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No matched explanation rows
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
