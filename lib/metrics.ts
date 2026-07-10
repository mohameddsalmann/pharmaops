import type { Case } from "@/lib/schemas/case";
import type { AuditLog } from "@/lib/schemas/audit";

export interface Metrics {
  totalCases: number;
  approvedCases: number;
  humanReviewCases: number;
  highRiskCases: number;
  averageConfidence: number;
  averageRiskScore: number;
  humanReviewRate: number;
  automationApprovalRate: number;
  estimatedMinutesSaved: number;
  estimatedCostSaved: number;
  topExceptionType: string | null;
}

const MANUAL_CASE_MINUTES = 5;
const AI_APPROVED_SAVES = 4;
const HUMAN_REVIEW_SAVES = 2;
const LABOR_COST_PER_HOUR = 25;

export function computeMetrics(cases: Case[], auditLogs: AuditLog[]): Metrics {
  const totalCases = cases.length;
  const approvedCases = cases.filter((c) => c.status === "approved").length;
  const humanReviewCases = cases.filter(
    (c) => c.status === "needs_human_review" || c.status === "in_review"
  ).length;
  const highRiskCases = cases.filter(
    (c) => c.riskLevel === "high" || c.riskLevel === "critical"
  ).length;

  const casesWithScores = cases.filter((c) => c.riskScore !== null);
  const averageRiskScore =
    casesWithScores.length > 0
      ? casesWithScores.reduce((sum, c) => sum + (c.riskScore ?? 0), 0) / casesWithScores.length
      : 0;

  const agentRunLogs = auditLogs.filter((l) => l.actorType === "agent" && l.confidence !== null);
  const averageConfidence =
    agentRunLogs.length > 0
      ? agentRunLogs.reduce((sum, l) => sum + (l.confidence ?? 0), 0) / agentRunLogs.length
      : 0;

  const humanReviewRate = totalCases > 0 ? humanReviewCases / totalCases : 0;
  const automationApprovalRate = totalCases > 0 ? approvedCases / totalCases : 0;

  const estimatedMinutesSaved =
    approvedCases * AI_APPROVED_SAVES + humanReviewCases * HUMAN_REVIEW_SAVES;
  const estimatedCostSaved = (estimatedMinutesSaved / 60) * LABOR_COST_PER_HOUR;

  const exceptionActions = auditLogs.filter(
    (l) => l.action === "exception-agent_run" && l.details?.exceptions
  );
  const exceptionTypeCounts: Record<string, number> = {};
  for (const log of exceptionActions) {
    const exceptions = (log.details as Record<string, unknown>)?.exceptions;
    if (Array.isArray(exceptions)) {
      for (const exc of exceptions as Record<string, unknown>[]) {
        const type = (exc.type as string) ?? "unknown";
        exceptionTypeCounts[type] = (exceptionTypeCounts[type] ?? 0) + 1;
      }
    }
  }
  const topExceptionType =
    Object.entries(exceptionTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalCases,
    approvedCases,
    humanReviewCases,
    highRiskCases,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    averageRiskScore: Math.round(averageRiskScore * 100) / 100,
    humanReviewRate: Math.round(humanReviewRate * 100) / 100,
    automationApprovalRate: Math.round(automationApprovalRate * 100) / 100,
    estimatedMinutesSaved,
    estimatedCostSaved: Math.round(estimatedCostSaved * 100) / 100,
    topExceptionType,
  };
}
