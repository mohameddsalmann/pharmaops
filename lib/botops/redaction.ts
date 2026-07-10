import type { BotRun, BotRunEvent } from "@/lib/schemas/bot-run";

export interface RedactionResult {
  containsPhi: boolean;
  phiRedacted: boolean;
  safeForReview: boolean;
  findings: string[];
}

const PHI_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  replacement: string;
}> = [
  {
    name: "Date of Birth",
    regex: /\b(?:DOB|Date of Birth|D\.O\.B\.?)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi,
    replacement: "[DOB REDACTED]",
  },
  {
    name: "DOB (standalone date)",
    regex: /\b(\d{2}[/-]\d{2}[/-]\d{4})\b/g,
    replacement: "[DATE REDACTED]",
  },
  {
    name: "Phone Number",
    regex: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[PHONE REDACTED]",
  },
  {
    name: "Email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[EMAIL REDACTED]",
  },
  {
    name: "Insurance Member ID",
    regex: /\b(?:Member\s*ID|Member\s*Number|Insurance\s*ID|Insurance\s*Number|MemberId)[:\s]+([A-Z0-9-]{6,20})\b/gi,
    replacement: "[MEMBER ID REDACTED]",
  },
  {
    name: "Prescription Number",
    regex: /\b(?:Rx\s*#|Prescription\s*#|Rx\s*Number|Prescription\s*Number)[:\s]*([A-Z0-9-]{4,20})\b/gi,
    replacement: "[RX NUMBER REDACTED]",
  },
  {
    name: "Street Address",
    regex: /\b\d{1,6}\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Court|Ct|Way|Place|Pl)\b\.?/gi,
    replacement: "[ADDRESS REDACTED]",
  },
  {
    name: "SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN REDACTED]",
  },
];

const NAME_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  replacement: string;
}> = [
  {
    name: "Patient Name",
    regex: /\b(?:Patient\s*Name|Patient)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g,
    replacement: "[PATIENT NAME REDACTED]",
  },
  {
    name: "Prescriber Name",
    regex: /\b(?:Prescriber\s*Name|Prescriber|Dr\.)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g,
    replacement: "[PRESCRIBER NAME REDACTED]",
  },
];

export function detectPossiblePhi(text: string): string[] {
  const found: string[] = [];
  for (const p of [...PHI_PATTERNS, ...NAME_PATTERNS]) {
    if (p.regex.test(text)) {
      found.push(p.name);
    }
    p.regex.lastIndex = 0;
  }
  return found;
}

export function redactPhiFromText(text: string): { redacted: string; findings: string[] } {
  let redacted = text;
  const findings: string[] = [];

  for (const p of [...PHI_PATTERNS, ...NAME_PATTERNS]) {
    const matches = redacted.match(p.regex);
    if (matches && matches.length > 0) {
      findings.push(p.name);
      redacted = redacted.replace(p.regex, p.replacement);
    }
    p.regex.lastIndex = 0;
  }

  return { redacted, findings: [...new Set(findings)] };
}

export function redactPhiFromEvent(
  event: BotRunEvent
): { event: BotRunEvent; findings: string[] } {
  const allFindings: string[] = [];

  let redactedSummary = event.actionSummary;
  const summaryResult = redactPhiFromText(event.actionSummary);
  redactedSummary = summaryResult.redacted;
  allFindings.push(...summaryResult.findings);

  let redactedExtracted: Record<string, unknown> | undefined = event.extractedFields;
  if (event.extractedFields) {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.extractedFields)) {
      if (typeof value === "string") {
        const r = redactPhiFromText(value);
        redacted[key] = r.redacted;
        allFindings.push(...r.findings);
      } else {
        redacted[key] = value;
      }
    }
    redactedExtracted = redacted;
  }

  let redactedEntered: Record<string, unknown> | undefined = event.enteredFields;
  if (event.enteredFields) {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.enteredFields)) {
      if (typeof value === "string") {
        const r = redactPhiFromText(value);
        redacted[key] = r.redacted;
        allFindings.push(...r.findings);
      } else {
        redacted[key] = value;
      }
    }
    redactedEntered = redacted;
  }

  let redactedScreen = event.screenName;
  const screenResult = redactPhiFromText(event.screenName);
  if (screenResult.findings.length > 0) {
    redactedScreen = screenResult.redacted;
    allFindings.push(...screenResult.findings);
  }

  return {
    event: {
      ...event,
      actionSummary: redactedSummary,
      screenName: redactedScreen,
      extractedFields: redactedExtracted,
      enteredFields: redactedEntered,
    },
    findings: [...new Set(allFindings)],
  };
}

export function redactBotRun(
  run: BotRun,
  events: BotRunEvent[]
): {
  run: BotRun;
  events: BotRunEvent[];
  result: RedactionResult;
} {
  const allFindings: string[] = [];
  const redactedEvents: BotRunEvent[] = [];

  for (const event of events) {
    const { event: redactedEvent, findings } = redactPhiFromEvent(event);
    redactedEvents.push(redactedEvent);
    allFindings.push(...findings);
  }

  const outcomeResult = redactPhiFromText(run.finalOutcome);
  allFindings.push(...outcomeResult.findings);

  const pharmacyResult = redactPhiFromText(run.pharmacyName);
  allFindings.push(...pharmacyResult.findings);

  const uniqueFindings = [...new Set(allFindings)];
  const containsPhi = uniqueFindings.length > 0;
  const safeForReview = true;

  return {
    run: {
      ...run,
      finalOutcome: outcomeResult.redacted,
      pharmacyName: pharmacyResult.redacted,
      containsPhi,
      phiRedacted: true,
      safeForReview,
      redactionFindings: uniqueFindings,
    },
    events: redactedEvents,
    result: {
      containsPhi,
      phiRedacted: true,
      safeForReview,
      findings: uniqueFindings,
    },
  };
}
