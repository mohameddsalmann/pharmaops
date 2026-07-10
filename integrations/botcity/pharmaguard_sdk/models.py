from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, Optional, List

class EventActionType(str, Enum):
    SCREEN_READ = "screen_read"
    FIELD_EXTRACT = "field_extract"
    FIELD_ENTRY = "field_entry"
    CLICK = "click"
    NAVIGATION = "navigation"
    VALIDATION = "validation"
    EXCEPTION = "exception"
    HUMAN_HANDOFF = "human_handoff"

class EventStatus(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    FAILED = "failed"

class BotRunStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STALLED = "stalled"
    NEEDS_HUMAN_REVIEW = "needs_human_review"

@dataclass
class BotRun:
    id: str
    run_number: str
    pharmacy_id: str
    pharmacy_name: str
    pms_type: str
    workflow_type: str
    bot_version: str
    environment: str
    started_at: str
    status: BotRunStatus
    final_outcome: str = ""
    external_task_id: Optional[str] = None
    automation_label: Optional[str] = None
    runner_id: Optional[str] = None
    workflow_spec_version: str = "1.0.0"

@dataclass
class BotRunEvent:
    step_number: int
    screen_name: str
    action_type: EventActionType
    action_summary: str
    confidence: float
    duration_ms: int
    status: EventStatus
    client_event_id: Optional[str] = None
    extracted_fields: Dict[str, Any] = field(default_factory=dict)
    entered_fields: Dict[str, Any] = field(default_factory=dict)
    screen_text: Optional[str] = None
    dom_snapshot: Dict[str, Any] = field(default_factory=dict)
    ui_fingerprint: Optional[str] = None
    before_state_hash: Optional[str] = None
    after_state_hash: Optional[str] = None
    expected_next_action: Optional[str] = None
    actual_next_action: Optional[str] = None
    sequence_number: Optional[int] = None

@dataclass
class RunArtifact:
    artifact_type: str
    filename: str
    mime_type: str
    base64_payload: str
    sha256: str
    redacted: bool = True
    event_id: Optional[str] = None
