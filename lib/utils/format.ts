const statusMap: Record<string, string> = {
  pending_qa: "Pending QA",
  approved: "Approved",
  needs_human_review: "Needs Human Review",
  missing_information: "Missing Information",
  prior_authorization_required: "Prior Authorization Required",
  rejected: "Rejected",
  cannot_determine: "Cannot Determine",
  in_review: "In Review",
};

export function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return statusMap[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const riskMap: Record<string, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  critical: "Critical Risk",
};

export function formatRiskLevel(level: string | null | undefined): string {
  if (!level) return "No Risk Score";
  return riskMap[level] ?? level;
}

const exceptionTypeMap: Record<string, string> = {
  missing_required_field: "Missing Required Field",
  low_confidence: "Low Confidence",
  identity_mismatch: "Identity Mismatch",
  prior_authorization_required: "Prior Authorization Required",
  insurance_conflict: "Insurance Conflict",
  safety_review_required: "Safety Review Required",
  communication_approval_required: "Communication Approval Required",
  none: "None",
};

export function formatExceptionType(type: string | null | undefined): string {
  if (!type) return "—";
  return exceptionTypeMap[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const sourceTypeMap: Record<string, string> = {
  fax: "Fax",
  erx: "eRx",
  provider_portal: "Provider Portal",
  manual: "Manual Entry",
};

const sourceTypeReverseMap: Record<string, string> = {
  Fax: "fax",
  eRx: "erx",
  "Provider Portal": "provider_portal",
  "Manual Entry": "manual",
};

export function formatSourceType(source: string | null | undefined): string {
  if (!source) return "—";
  return sourceTypeMap[source] ?? source;
}

export function parseSourceType(label: string): string {
  return sourceTypeReverseMap[label] ?? label;
}

export const sourceTypeOptions = Object.entries(sourceTypeMap).map(([value, label]) => ({
  value,
  label,
}));

const actionTypeMap: Record<string, string> = {
  approve: "Approve",
  reject: "Reject",
  request_info: "Request Info",
  send_to_prior_auth: "Send to Prior Auth",
  assign_to_pharmacist: "Assign to Pharmacist",
};

export function formatActionType(action: string | null | undefined): string {
  if (!action) return "—";
  return actionTypeMap[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const messageTypeMap: Record<string, string> = {
  missing_information: "Missing Information",
  prior_authorization: "Prior Authorization",
  review_pending: "Review Pending",
  refill_status: "Refill Status",
  general_update: "General Update",
};

export function formatMessageType(type: string | null | undefined): string {
  if (!type) return "—";
  return messageTypeMap[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const severityMap: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function formatSeverity(severity: string | null | undefined): string {
  if (!severity) return "—";
  return severityMap[severity] ?? severity;
}

const actorTypeMap: Record<string, string> = {
  agent: "Agent",
  human: "Human",
  system: "System",
};

export function formatActorType(type: string | null | undefined): string {
  if (!type) return "—";
  return actorTypeMap[type] ?? type;
}

const agentNameMap: Record<string, string> = {
  "intake-agent": "Intake Extraction",
  "validation-agent": "Validation",
  "identity-agent": "Identity Match",
  "insurance-agent": "Insurance / Prior Auth",
  "compliance-agent": "Compliance Evidence",
  "exception-agent": "Exception Classifier",
  "supervisor-agent": "Supervisor Decision",
  "patient-message-agent": "Patient Message Draft",
  intake_extraction: "Intake Extraction",
  validation: "Validation",
  identity_match: "Identity Match",
  insurance_triage: "Insurance / Prior Auth",
  compliance_evidence: "Compliance Evidence",
  exception_classification: "Exception Classifier",
  supervisor_decision: "Supervisor Decision",
  patient_message: "Patient Message Draft",
};

export function formatAgentName(name: string | null | undefined): string {
  if (!name) return "—";
  return agentNameMap[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDecision(decision: string | null | undefined): string {
  if (!decision) return "—";
  return formatStatus(decision);
}

const pmsTypeMap: Record<string, string> = {
  pioneer: "PioneerRx",
  rx30: "Rx30",
  liberty: "Liberty",
  primerx: "PrimeRx",
  lifefile: "LifeFile",
  pk_software: "PK Software",
  generic: "Generic PMS",
};

export function formatPmsType(pmsType: string | null | undefined): string {
  if (!pmsType) return "—";
  return pmsTypeMap[pmsType] ?? pmsType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const workflowTypeMap: Record<string, string> = {
  prescription_intake: "Prescription Intake",
  data_entry: "Data Entry",
  refill_processing: "Refill Processing",
  prior_authorization: "Prior Authorization",
  benefit_investigation: "Benefit Investigation",
  patient_communication: "Patient Communication",
};

export function formatWorkflowType(workflowType: string | null | undefined): string {
  if (!workflowType) return "—";
  return workflowTypeMap[workflowType] ?? workflowType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const evaluatorNameMap: Record<string, string> = {
  field_accuracy: "Field Accuracy",
  workflow_compliance: "Workflow Compliance",
  exception_handling: "Exception Handling",
  ui_drift: "UI Drift",
  loop_stall_detection: "Loop / Stall Detection",
  latency: "Latency",
  regression: "Regression",
};

export function formatEvaluatorName(name: string | null | undefined): string {
  if (!name) return "—";
  return evaluatorNameMap[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const qaDecisionMap: Record<string, string> = {
  safe_to_automate: "Safe to Automate",
  needs_qa_review: "Needs QA Review",
  regression_detected: "Regression Detected",
  ui_drift_detected: "UI Drift Detected",
  stop_automation: "Stop Automation",
};

export function formatQaDecision(decision: string | null | undefined): string {
  if (!decision) return "Pending Evaluation";
  return qaDecisionMap[decision] ?? decision.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const eventActionTypeMap: Record<string, string> = {
  screen_read: "Screen Read",
  field_extract: "Field Extract",
  field_entry: "Field Entry",
  click: "Click",
  navigation: "Navigation",
  validation: "Validation",
  exception: "Exception",
  human_handoff: "Human Handoff",
};

export function formatEventActionType(actionType: string | null | undefined): string {
  if (!actionType) return "—";
  return eventActionTypeMap[actionType] ?? actionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const environmentMap: Record<string, string> = {
  demo: "Demo",
  staging: "Staging",
  production_redacted: "Production (Redacted)",
};

export function formatEnvironment(env: string | null | undefined): string {
  if (!env) return "—";
  return environmentMap[env] ?? env.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const qaReviewActionMap: Record<string, string> = {
  approve_for_automation: "Approve for Automation",
  hold_for_review: "Hold for Review",
  block_automation: "Block Automation",
  flag_regression: "Flag Regression",
  flag_drift: "Flag Drift",
  assign_reviewer: "Assign Reviewer",
};

export function formatQaReviewAction(action: string | null | undefined): string {
  if (!action) return "—";
  return qaReviewActionMap[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
