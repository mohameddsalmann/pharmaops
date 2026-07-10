import type {
  BotRun,
  BotRunEvent,
  EvaluatorResult,
  BotRunSummary,
} from "@/lib/schemas/bot-run";
import { getBotOpsConfig, isLlmConfigured } from "@/lib/botops/config";
import { nowISO } from "@/lib/utils/id";

export interface SummaryResult {
  summary: string;
  reviewerNote: string;
  engineeringExplanation: string;
  usedLlm: boolean;
}

export interface SummaryOptions {
  useLlm?: boolean;
}

export async function generateSummary(
  run: BotRun,
  results: EvaluatorResult[],
  events: BotRunEvent[],
  options?: SummaryOptions
): Promise<SummaryResult> {
  const deterministic = generateDeterministicSummary(run, results);

  if (!options?.useLlm) {
    return { ...deterministic, usedLlm: false };
  }

  const cfg = getBotOpsConfig();
  if (!isLlmConfigured(cfg)) {
    return { ...deterministic, usedLlm: false };
  }

  try {
    const llmSummary = await callLlmForSummary(run, results, events, cfg);
    return {
      summary: llmSummary.summary || deterministic.summary,
      reviewerNote: llmSummary.reviewerNote || deterministic.reviewerNote,
      engineeringExplanation: llmSummary.engineeringExplanation || deterministic.engineeringExplanation,
      usedLlm: true,
    };
  } catch {
    return { ...deterministic, usedLlm: false };
  }
}

function generateDeterministicSummary(
  run: BotRun,
  results: EvaluatorResult[]
): SummaryResult {
  const failed = results.filter((r) => r.status === "failed");
  const warnings = results.filter((r) => r.status === "warning");
  const passed = results.filter((r) => r.status === "passed");

  const summaryParts: string[] = [];
  summaryParts.push(`Run ${run.runNumber} (${run.workflowType.replace(/_/g, " ")} on ${run.pmsType})`);
  summaryParts.push(`Status: ${run.status}.`);
  summaryParts.push(`Overall score: ${run.overallScore ?? "N/A"}/100.`);
  summaryParts.push(`Decision: ${run.decision?.replace(/_/g, " ") ?? "pending"}.`);
  if (failed.length > 0) {
    summaryParts.push(`Failed evaluators: ${failed.map((r) => r.evaluatorName.replace(/_/g, " ")).join(", ")}.`);
  }
  if (warnings.length > 0) {
    summaryParts.push(`Warnings: ${warnings.map((r) => r.evaluatorName.replace(/_/g, " ")).join(", ")}.`);
  }
  if (passed.length > 0) {
    summaryParts.push(`Passed: ${passed.map((r) => r.evaluatorName.replace(/_/g, " ")).join(", ")}.`);
  }

  const summary = summaryParts.join(" ");

  const reviewerNote = run.decision
    ? `QA reviewer should ${run.decision === "safe_to_automate" ? "approve" : "inspect"} this run. ${run.mainFinding ?? ""}`
    : "Run pending evaluation.";

  const engineeringParts: string[] = [];
  engineeringParts.push(`Bot version: ${run.botVersion}.`);
  if (run.recommendedEngineeringAction) {
    engineeringParts.push(run.recommendedEngineeringAction);
  }
  for (const f of failed) {
    engineeringParts.push(`${f.evaluatorName}: ${f.findings[0]}`);
  }
  const engineeringExplanation = engineeringParts.join(" ");

  return {
    summary,
    reviewerNote,
    engineeringExplanation,
    usedLlm: false,
  };
}

async function callLlmForSummary(
  run: BotRun,
  results: EvaluatorResult[],
  events: BotRunEvent[],
  cfg: ReturnType<typeof getBotOpsConfig>
): Promise<{ summary: string; reviewerNote: string; engineeringExplanation: string }> {
  const prompt = buildSummaryPrompt(run, results, events);
  const response = await fetch(`${cfg.aiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.aiApiKey}`,
    },
    body: JSON.stringify({
      model: cfg.aiModel,
      messages: [
        {
          role: "system",
          content:
            "You are a QA summary assistant for pharmacy bot automation. Generate a concise summary, reviewer note, and engineering explanation based on the evaluator results. Do NOT make pass/fail decisions — those are already determined deterministically. Keep summaries factual and under 200 words each.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return parseLlmResponse(text);
}

function buildSummaryPrompt(
  run: BotRun,
  results: EvaluatorResult[],
  events: BotRunEvent[]
): string {
  const evaluatorSummary = results
    .map(
      (r) =>
        `- ${r.evaluatorName}: ${r.status} (${r.score}/100, ${r.severity}) — ${r.findings.join("; ")}`
    )
    .join("\n");

  return `Bot Run: ${run.runNumber}
Workflow: ${run.workflowType}
PMS: ${run.pmsType}
Bot Version: ${run.botVersion}
Status: ${run.status}
Overall Score: ${run.overallScore}
Decision: ${run.decision}
Main Finding: ${run.mainFinding}

Evaluator Results:
${evaluatorSummary}

Events: ${events.length} total

Generate a JSON response with three fields:
1. "summary" — concise overview of the run and evaluation results
2. "reviewerNote" — note for QA reviewer on what to focus
3. "engineeringExplanation" — technical explanation for engineering team`;
}

function parseLlmResponse(text: string): {
  summary: string;
  reviewerNote: string;
  engineeringExplanation: string;
} {
  try {
    const parsed = JSON.parse(text);
    return {
      summary: parsed.summary ?? "",
      reviewerNote: parsed.reviewerNote ?? "",
      engineeringExplanation: parsed.engineeringExplanation ?? "",
    };
  } catch {
    return {
      summary: text.substring(0, 500),
      reviewerNote: "",
      engineeringExplanation: "",
    };
  }
}

export function createSummaryRecord(
  botRunId: string,
  result: SummaryResult
): BotRunSummary {
  return {
    botRunId,
    summary: result.summary,
    reviewerNote: result.reviewerNote,
    engineeringExplanation: result.engineeringExplanation,
    usedLlm: result.usedLlm,
    createdAt: nowISO(),
  };
}
