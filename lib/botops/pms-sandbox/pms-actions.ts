export type PmsAction =
  | { type: "navigate"; screenName: string }
  | { type: "screen_read"; screenName: string; screenText: string }
  | { type: "field_entry"; fieldName: string; value: string }
  | { type: "click"; buttonName: string }
  | { type: "validation"; result: "pass" | "fail"; detail: string }
  | { type: "exception"; reason: string }
  | { type: "human_handoff"; reason: string };

export function actionToEventType(
  action: PmsAction
):
  | "screen_read"
  | "field_entry"
  | "click"
  | "navigation"
  | "validation"
  | "exception"
  | "human_handoff" {
  switch (action.type) {
    case "navigate":
      return "navigation";
    case "screen_read":
      return "screen_read";
    case "field_entry":
      return "field_entry";
    case "click":
      return "click";
    case "validation":
      return "validation";
    case "exception":
      return "exception";
    case "human_handoff":
      return "human_handoff";
  }
}

export function actionToSummary(action: PmsAction): string {
  switch (action.type) {
    case "navigate":
      return `Navigated to ${action.screenName}`;
    case "screen_read":
      return `Read ${action.screenName} screen`;
    case "field_entry":
      return `Entered ${action.fieldName} = ${action.value}`;
    case "click":
      return `Clicked ${action.buttonName} button`;
    case "validation":
      return `Validation ${action.result.toUpperCase()}: ${action.detail}`;
    case "exception":
      return `Exception: ${action.reason}`;
    case "human_handoff":
      return `Human handoff: ${action.reason}`;
  }
}
