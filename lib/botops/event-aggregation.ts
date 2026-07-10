import type { BotRunEvent } from "@/lib/schemas/bot-run";

export function deriveEnteredFieldsFromEvents(
  events: BotRunEvent[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const event of events) {
    if (event.actionType === "field_entry" && event.enteredFields) {
      for (const [key, value] of Object.entries(event.enteredFields)) {
        result[key] = String(value);
      }
    }
  }
  return result;
}

export function deriveExtractedFieldsFromEvents(
  events: BotRunEvent[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const event of events) {
    if (
      (event.actionType === "screen_read" || event.actionType === "field_extract") &&
      event.extractedFields
    ) {
      for (const [key, value] of Object.entries(event.extractedFields)) {
        result[key] = String(value);
      }
    }
  }
  return result;
}

export function deriveScreensVisited(events: BotRunEvent[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const event of events) {
    if (!seen.has(event.screenName)) {
      seen.add(event.screenName);
      ordered.push(event.screenName);
    }
  }
  return ordered;
}

export function deriveFailedActions(events: BotRunEvent[]): BotRunEvent[] {
  return events.filter((e) => e.status === "failed");
}

export function deriveHumanHandoffs(events: BotRunEvent[]): BotRunEvent[] {
  return events.filter((e) => e.actionType === "human_handoff");
}
