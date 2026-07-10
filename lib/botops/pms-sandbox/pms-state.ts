import type { PmsAction } from "./pms-actions";

export interface PmsSandboxState {
  currentScreen: string;
  fieldValues: Record<string, string>;
  selectedPatient: { id: string; name: string } | null;
  activeElement: string | null;
  buttonAvailability: Record<string, boolean>;
  errorState: string | null;
  driftState: { screen: string; confidence: number } | null;
  handoffState: { reason: string; timestamp: string } | null;
  visitedScreens: string[];
  stepCount: number;
}

export function initialState(): PmsSandboxState {
  return {
    currentScreen: "Idle",
    fieldValues: {},
    selectedPatient: null,
    activeElement: null,
    buttonAvailability: {
      Search: false,
      "Verify Coverage": false,
      Submit: false,
      "New Search": false,
    },
    errorState: null,
    driftState: null,
    handoffState: null,
    visitedScreens: [],
    stepCount: 0,
  };
}

export function transition(
  state: PmsSandboxState,
  action: PmsAction
): PmsSandboxState {
  const next: PmsSandboxState = {
    ...state,
    fieldValues: { ...state.fieldValues },
    buttonAvailability: { ...state.buttonAvailability },
    visitedScreens: [...state.visitedScreens],
    stepCount: state.stepCount + 1,
  };

  switch (action.type) {
    case "navigate":
      next.currentScreen = action.screenName;
      if (!next.visitedScreens.includes(action.screenName)) {
        next.visitedScreens.push(action.screenName);
      }
      next.activeElement = null;
      break;

    case "screen_read":
      next.currentScreen = action.screenName;
      if (!next.visitedScreens.includes(action.screenName)) {
        next.visitedScreens.push(action.screenName);
      }
      next.activeElement = action.screenName;
      if (action.screenName === "Patient Search") {
        next.buttonAvailability.Search = true;
      } else if (action.screenName === "Insurance Check") {
        next.buttonAvailability["Verify Coverage"] = true;
      } else if (action.screenName === "Final Review") {
        next.buttonAvailability.Submit = true;
      }
      break;

    case "field_entry":
      next.fieldValues[action.fieldName] = action.value;
      next.activeElement = action.fieldName;
      break;

    case "click":
      next.activeElement = action.buttonName;
      if (action.buttonName === "Search") {
        next.selectedPatient = {
          id: "PAT-001",
          name: "[PATIENT NAME REDACTED]",
        };
        next.buttonAvailability["New Search"] = true;
      }
      break;

    case "validation":
      next.activeElement = "validation";
      if (action.result === "fail") {
        next.errorState = action.detail;
      }
      break;

    case "exception":
      next.errorState = action.reason;
      next.activeElement = "exception";
      break;

    case "human_handoff":
      next.handoffState = {
        reason: action.reason,
        timestamp: new Date().toISOString(),
      };
      next.activeElement = "human_handoff";
      break;
  }

  return next;
}

export function computeBeforeHash(state: PmsSandboxState): string {
  return hashState(state);
}

export function computeAfterHash(state: PmsSandboxState): string {
  return hashState(state);
}

function hashState(state: PmsSandboxState): string {
  const json = JSON.stringify({
    s: state.currentScreen,
    f: state.fieldValues,
    p: state.selectedPatient?.id ?? null,
    a: state.activeElement,
    e: state.errorState,
    h: state.handoffState?.reason ?? null,
    d: state.driftState?.screen ?? null,
  });
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}
