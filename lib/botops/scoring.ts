import type {
  EvaluatorResult,
  RiskLevel,
  QaDecision,
  DeductionReason,
} from "@/lib/schemas/bot-run";

export interface ScoringResult {
  overallScore: number;
  riskLevel: RiskLevel;
  decision: QaDecision;
  releaseReadinessScore: number;
  mainFinding: string;
  mainRisk: string;
  recommendedAction: string;
  recommendedEngineeringAction: string;
  recommendedQaAction: string;
  deductionReasons: DeductionReason[];
}

export function computeScoring(results: EvaluatorResult[]): ScoringResult {
  const allDeductions: DeductionReason[] = [];
  let totalScore = 0;
  let failedCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  for (const result of results) {
    totalScore += result.score;
    if (result.status === "failed") failedCount++;
    if (result.status === "warning") warningCount++;
    if (result.severity === "critical") criticalCount++;
    allDeductions.push(...result.deductionReasons);
  }

  const overallScore = results.length > 0
    ? Math.round(totalScore / results.length)
    : 100;

  const releaseReadinessScore = computeReleaseReadiness(results);

  const riskLevel = determineRiskLevel(overallScore, failedCount, criticalCount);
  const decision = determineDecision(overallScore, failedCount, warningCount, criticalCount, results);

  const mainFinding = determineMainFinding(results);
  const mainRisk = determineMainRisk(results);
  const recommendedAction = determineRecommendedAction(decision);
  const recommendedEngineeringAction = determineEngineeringAction(results, decision);
  const recommendedQaAction = determineQaAction(decision);

  return {
    overallScore,
    riskLevel,
    decision,
    releaseReadinessScore,
    mainFinding,
    mainRisk,
    recommendedAction,
    recommendedEngineeringAction,
    recommendedQaAction,
    deductionReasons: allDeductions,
  };
}

function computeReleaseReadiness(results: EvaluatorResult[]): number {
  let score = 100;
  for (const r of results) {
    if (r.status === "failed" && r.severity === "critical") {
      score -= 30;
    } else if (r.status === "failed") {
      score -= 20;
    } else if (r.status === "warning") {
      score -= 8;
    }
  }
  return Math.max(0, score);
}

function determineRiskLevel(
  overallScore: number,
  failedCount: number,
  criticalCount: number
): RiskLevel {
  if (criticalCount > 0 || overallScore < 50) return "critical";
  if (failedCount > 1 || overallScore < 70) return "high";
  if (failedCount > 0 || overallScore < 85) return "medium";
  return "low";
}

function determineDecision(
  overallScore: number,
  failedCount: number,
  warningCount: number,
  criticalCount: number,
  results: EvaluatorResult[]
): QaDecision {
  const hasUiDrift = results.some(
    (r) => r.evaluatorName === "ui_drift" && r.status === "failed"
  );
  const hasRegression = results.some(
    (r) => r.evaluatorName === "regression" && r.status === "failed"
  );

  if (criticalCount > 0 || overallScore < 50) return "stop_automation";
  if (hasUiDrift) return "ui_drift_detected";
  if (hasRegression) return "regression_detected";
  if (failedCount > 0 || overallScore < 75) return "needs_qa_review";
  if (warningCount > 0 || overallScore < 90) return "needs_qa_review";
  return "safe_to_automate";
}

function determineMainFinding(results: EvaluatorResult[]): string {
  const failed = results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    const top = failed[0];
    return `${top.evaluatorName.replace(/_/g, " ")}: ${top.findings[0] ?? "issues detected"}`;
  }
  const warnings = results.filter((r) => r.status === "warning");
  if (warnings.length > 0) {
    const top = warnings[0];
    return `${top.evaluatorName.replace(/_/g, " ")}: ${top.findings[0] ?? "minor issues"}`;
  }
  return "All evaluators passed — no issues detected.";
}

function determineMainRisk(results: EvaluatorResult[]): string {
  const critical = results.filter((r) => r.severity === "critical");
  if (critical.length > 0) {
    return critical[0].findings[0] ?? "Critical risk detected";
  }
  const high = results.filter((r) => r.severity === "high");
  if (high.length > 0) {
    return high[0].findings[0] ?? "High risk detected";
  }
  return "No significant risks identified.";
}

function determineRecommendedAction(decision: QaDecision): string {
  switch (decision) {
    case "safe_to_automate":
      return "Safe to automate — proceed with production deployment.";
    case "needs_qa_review":
      return "Needs QA review — assign reviewer before release.";
    case "regression_detected":
      return "Regression detected — block release and investigate performance degradation.";
    case "ui_drift_detected":
      return "UI drift detected — update bot selectors/screen recognition before release.";
    case "stop_automation":
      return "STOP automation — critical issues detected. Halt deployment immediately.";
  }
}

function determineEngineeringAction(
  results: EvaluatorResult[],
  decision: QaDecision
): string {
  if (decision === "stop_automation") {
    const critical = results.filter((r) => r.severity === "critical");
    return `Fix critical issues: ${critical.map((r) => r.evaluatorName.replace(/_/g, " ")).join(", ")}`;
  }
  if (decision === "ui_drift_detected") {
    return "Update screen recognition model and UI selectors for affected screens.";
  }
  if (decision === "regression_detected") {
    return "Profile bot performance vs baseline — identify degraded components.";
  }
  if (decision === "needs_qa_review") {
    const warnings = results.filter((r) => r.status === "warning");
    return `Review warning evaluators: ${warnings.map((r) => r.evaluatorName.replace(/_/g, " ")).join(", ")}`;
  }
  return "No engineering action needed.";
}

function determineQaAction(
  decision: QaDecision
): string {
  if (decision === "safe_to_automate") {
    return "Approve for automation — no QA action required.";
  }
  if (decision === "stop_automation") {
    return "Block automation — require engineering fix and re-evaluation.";
  }
  return "Assign QA reviewer to inspect evaluator findings and timeline.";
}
