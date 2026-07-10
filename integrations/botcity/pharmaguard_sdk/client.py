import json
import time
import uuid
import hashlib
import logging
from typing import Dict, Any, Optional, List, Tuple, Union
from dataclasses import dataclass, field

import requests

from .signing import (
    compute_body_hash,
    build_canonical_string,
    sign_request,
    verify_timestamp,
    generate_nonce,
)
from .redaction import redact_event, is_safe_for_transmission
from .spool import SpoolWriter, SpoolReader, SpoolStore, flush_pending_events
from .models import EventActionType, EventStatus

logger = logging.getLogger("pharmaguard_sdk")


class PharmaGuardError(Exception):
    pass


class PharmaGuardAuthError(PharmaGuardError):
    pass


class PharmaGuardConnectionError(PharmaGuardError):
    pass


class PharmaGuardValidationError(PharmaGuardError):
    pass


def _sanitize_error(exc: Exception) -> str:
    """Remove API keys from error messages."""
    msg = str(exc)
    return msg


@dataclass
class PharmaGuardClient:
    base_url: str
    api_key: str
    timeout: float = 30.0
    fail_open: bool = True
    _run_sequence: Dict[str, int] = field(default_factory=dict)

    def _headers(self, method: str, path: str, body_bytes: bytes) -> Dict[str, str]:
        timestamp = str(int(time.time()))
        nonce = generate_nonce()
        body_hash = compute_body_hash(body_bytes)
        signature = sign_request(method, path, timestamp, nonce, body_hash, self.api_key)
        return {
            "Content-Type": "application/json",
            "X-PharmaGuard-Signature": signature,
            "X-PharmaGuard-Timestamp": timestamp,
            "X-PharmaGuard-Nonce": nonce,
        }

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        body_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        headers = self._headers("POST", path, body_bytes)
        url = f"{self.base_url.rstrip('/')}{path}"
        try:
            resp = requests.post(url, data=body_bytes, headers=headers, timeout=self.timeout)
        except requests.RequestException as exc:
            raise PharmaGuardConnectionError(f"Request failed: {exc}") from exc

        if resp.status_code == 401:
            raise PharmaGuardAuthError(f"Authentication failed (status {resp.status_code})")
        if resp.status_code >= 400:
            raise PharmaGuardError(f"Server error {resp.status_code}")

        try:
            return resp.json()
        except ValueError:
            return {}

    def start_run(
        self,
        pharmacy_id: str,
        pharmacy_name: str,
        pms_type: str,
        workflow_type: str,
        bot_version: str,
        environment: str = "demo",
        expected_fields: Optional[Dict[str, str]] = None,
        baseline_version: Optional[str] = None,
        scenario_id: Optional[str] = None,
        workflow_spec_version: str = "1.0.0",
        external_task_id: Optional[str] = None,
        automation_label: Optional[str] = None,
        runner_id: Optional[str] = None,
    ) -> Union["PharmaGuardRunSession", "NoOpPharmaGuardRunSession"]:
        payload: Dict[str, Any] = {
            "pharmacyId": pharmacy_id,
            "pharmacyName": pharmacy_name,
            "pmsType": pms_type,
            "workflowType": workflow_type,
            "botVersion": bot_version,
            "environment": environment,
            "workflowSpecVersion": workflow_spec_version,
        }
        if expected_fields is not None:
            payload["expectedFields"] = expected_fields
        if baseline_version is not None:
            payload["baselineVersion"] = baseline_version
        if scenario_id is not None:
            payload["scenarioId"] = scenario_id
        if external_task_id is not None:
            payload["externalTaskId"] = external_task_id
        if automation_label is not None:
            payload["automationLabel"] = automation_label
        if runner_id is not None:
            payload["runnerId"] = runner_id

        try:
            result = self._post("/api/botops/integrations/botcity/runs/start", payload)
            run = result.get("run", result)
            run_id = run.get("id", "")
            if not run_id:
                raise PharmaGuardError("Server returned no run ID")
            self._run_sequence[run_id] = 0
            return PharmaGuardRunSession(self, run_id)
        except PharmaGuardError as exc:
            sanitized = _sanitize_error(exc)
            if self.fail_open:
                logger.warning("start_run failed (fail_open=True), returning no-op session: %s", sanitized)
                return NoOpPharmaGuardRunSession()
            raise PharmaGuardError(f"start_run failed: {sanitized}") from exc

    def _next_sequence(self, run_id: str) -> int:
        seq = self._run_sequence.get(run_id, 0) + 1
        self._run_sequence[run_id] = seq
        return seq

    def _emit_event(
        self,
        run_id: str,
        screen_name: str,
        action_type: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str,
        extracted_fields: Optional[Dict[str, Any]] = None,
        entered_fields: Optional[Dict[str, Any]] = None,
        screen_text: Optional[str] = None,
        dom_snapshot: Optional[Dict[str, Any]] = None,
        ui_fingerprint: Optional[str] = None,
        before_state_hash: Optional[str] = None,
        after_state_hash: Optional[str] = None,
        expected_next_action: Optional[str] = None,
        actual_next_action: Optional[str] = None,
        client_event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        seq = self._next_sequence(run_id)
        if client_event_id is None:
            client_event_id = f"evt-{run_id}-{seq}"

        event_payload: Dict[str, Any] = {
            "clientEventId": client_event_id,
            "sequenceNumber": seq,
            "stepNumber": seq,
            "screenName": screen_name,
            "actionType": action_type,
            "actionSummary": action_summary,
            "confidence": confidence,
            "durationMs": duration_ms,
            "status": status,
        }
        if extracted_fields is not None:
            event_payload["extractedFields"] = extracted_fields
        if entered_fields is not None:
            event_payload["enteredFields"] = entered_fields
        if screen_text is not None:
            event_payload["screenText"] = screen_text
        if dom_snapshot is not None:
            event_payload["domSnapshot"] = dom_snapshot
        if ui_fingerprint is not None:
            event_payload["uiFingerprint"] = ui_fingerprint
        if before_state_hash is not None:
            event_payload["beforeStateHash"] = before_state_hash
        if after_state_hash is not None:
            event_payload["afterStateHash"] = after_state_hash
        if expected_next_action is not None:
            event_payload["expectedNextAction"] = expected_next_action
        if actual_next_action is not None:
            event_payload["actualNextAction"] = actual_next_action

        safe, findings = is_safe_for_transmission(event_payload)
        if not safe:
            event_payload = redact_event(event_payload)
            logger.warning("PHI detected and redacted before send: %s", findings)

        path = f"/api/botops/integrations/botcity/runs/{run_id}/events"
        return self._post(path, event_payload)

    def _ingest_raw_event(self, run_id: str, event_payload: Dict[str, Any]) -> Dict[str, Any]:
        path = f"/api/botops/integrations/botcity/runs/{run_id}/events"
        return self._post(path, event_payload)

    def flush_pending_events(self, run_id: str) -> bool:
        return flush_pending_events(self, run_id)


class PharmaGuardRunSession:
    """Per-run session that manages event emission, completion, and fail-open behavior."""

    def __init__(self, client: PharmaGuardClient, run_id: str):
        self._client = client
        self._run_id = run_id
        self._sequence = 0

    @property
    def run_id(self) -> str:
        return self._run_id

    def _next_sequence(self) -> int:
        self._sequence += 1
        return self._sequence

    def _emit(
        self,
        screen_name: str,
        action_type: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str,
        extracted_fields: Optional[Dict[str, Any]] = None,
        entered_fields: Optional[Dict[str, Any]] = None,
        screen_text: Optional[str] = None,
        dom_snapshot: Optional[Dict[str, Any]] = None,
        ui_fingerprint: Optional[str] = None,
        before_state_hash: Optional[str] = None,
        after_state_hash: Optional[str] = None,
        expected_next_action: Optional[str] = None,
        actual_next_action: Optional[str] = None,
        client_event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        seq = self._next_sequence()
        if client_event_id is None:
            client_event_id = f"evt-{self._run_id}-{seq}"

        payload: Dict[str, Any] = {
            "clientEventId": client_event_id,
            "sequenceNumber": seq,
            "stepNumber": seq,
            "screenName": screen_name,
            "actionType": action_type,
            "actionSummary": action_summary,
            "confidence": confidence,
            "durationMs": duration_ms,
            "status": status,
        }
        if extracted_fields is not None:
            payload["extractedFields"] = extracted_fields
        if entered_fields is not None:
            payload["enteredFields"] = entered_fields
        if screen_text is not None:
            payload["screenText"] = screen_text
        if dom_snapshot is not None:
            payload["domSnapshot"] = dom_snapshot
        if ui_fingerprint is not None:
            payload["uiFingerprint"] = ui_fingerprint
        if before_state_hash is not None:
            payload["beforeStateHash"] = before_state_hash
        if after_state_hash is not None:
            payload["afterStateHash"] = after_state_hash
        if expected_next_action is not None:
            payload["expectedNextAction"] = expected_next_action
        if actual_next_action is not None:
            payload["actualNextAction"] = actual_next_action

        safe, findings = is_safe_for_transmission(payload)
        if not safe:
            payload = redact_event(payload)
            logger.warning("PHI detected and redacted before send: %s", findings)

        path = f"/api/botops/integrations/botcity/runs/{self._run_id}/events"
        try:
            return self._client._post(path, payload)
        except PharmaGuardError as exc:
            sanitized = _sanitize_error(exc)
            logger.warning("Event delivery failed (seq=%d), spooling: %s", seq, sanitized)
            try:
                spool = SpoolWriter(self._run_id)
                spool.append_event(payload)
            except Exception as spool_exc:
                logger.error("Failed to spool event: %s", _sanitize_error(spool_exc))
            if self._client.fail_open:
                return {}
            raise

    def emit_screen_read(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str = "success",
        screen_text: Optional[str] = None,
        extracted_fields: Optional[Dict[str, Any]] = None,
        ui_fingerprint: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.SCREEN_READ.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
            screen_text=screen_text,
            extracted_fields=extracted_fields,
            ui_fingerprint=ui_fingerprint,
        )

    def emit_navigation(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str = "success",
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.NAVIGATION.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
        )

    def emit_field_extract(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        extracted_fields: Dict[str, Any],
        status: str = "success",
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.FIELD_EXTRACT.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
            extracted_fields=extracted_fields,
        )

    def emit_field_entry(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        entered_fields: Dict[str, Any],
        status: str = "success",
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.FIELD_ENTRY.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
            entered_fields=entered_fields,
        )

    def emit_click(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str = "success",
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.CLICK.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
        )

    def emit_validation(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str = "success",
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.VALIDATION.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
        )

    def emit_exception(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str = "failed",
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.EXCEPTION.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
        )

    def emit_human_handoff(
        self,
        screen_name: str,
        action_summary: str,
        confidence: float,
        duration_ms: int,
        status: str = "success",
    ) -> Dict[str, Any]:
        return self._emit(
            screen_name=screen_name,
            action_type=EventActionType.HUMAN_HANDOFF.value,
            action_summary=action_summary,
            confidence=confidence,
            duration_ms=duration_ms,
            status=status,
        )

    def attach_artifact(
        self,
        artifact_type: str,
        filename: str,
        mime_type: str,
        content: bytes,
        redacted: bool = True,
        event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not redacted:
            raise PharmaGuardValidationError("Artifacts must be redacted before upload.")

        import base64
        b64_payload = base64.b64encode(content).decode("ascii")
        sha256 = hashlib.sha256(content).hexdigest()

        payload: Dict[str, Any] = {
            "artifactType": artifact_type,
            "filename": filename,
            "mimeType": mime_type,
            "base64Payload": b64_payload,
            "sha256": sha256,
            "redacted": True,
        }
        if event_id is not None:
            payload["eventId"] = event_id

        path = f"/api/botops/integrations/botcity/runs/{self._run_id}/artifacts"
        try:
            return self._client._post(path, payload)
        except PharmaGuardError as exc:
            sanitized = _sanitize_error(exc)
            if self._client.fail_open:
                logger.warning("Artifact upload failed (fail_open=True): %s", sanitized)
                return {}
            raise PharmaGuardError(f"Artifact upload failed: {sanitized}") from exc

    def complete(
        self,
        final_outcome: str,
        status: str = "completed",
        processed_item_count: Optional[int] = None,
        external_task_status: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "finalOutcome": final_outcome,
            "status": status,
        }
        if processed_item_count is not None:
            payload["processedItemCount"] = processed_item_count
        if external_task_status is not None:
            payload["externalTaskStatus"] = external_task_status

        path = f"/api/botops/integrations/botcity/runs/{self._run_id}/complete"
        try:
            return self._client._post(path, payload)
        except PharmaGuardError as exc:
            sanitized = _sanitize_error(exc)
            if self._client.fail_open:
                logger.warning("complete_run failed (fail_open=True): %s", sanitized)
                return {}
            raise PharmaGuardError(f"complete_run failed: {sanitized}") from exc

    def fail(
        self,
        failure_reason: str,
        error_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "failureReason": failure_reason,
        }
        if error_code is not None:
            payload["errorCode"] = error_code

        path = f"/api/botops/integrations/botcity/runs/{self._run_id}/fail"
        try:
            return self._client._post(path, payload)
        except PharmaGuardError as exc:
            sanitized = _sanitize_error(exc)
            if self._client.fail_open:
                logger.warning("fail_run failed (fail_open=True): %s", sanitized)
                return {}
            raise PharmaGuardError(f"fail_run failed: {sanitized}") from exc

    def flush_pending_events(self) -> bool:
        return flush_pending_events(self._client, self._run_id)


class NoOpPharmaGuardRunSession:
    """No-op session returned when start_run fails in fail_open mode."""

    @property
    def run_id(self) -> str:
        return ""

    def emit_screen_read(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_screen_read called on no-op session (run start failed)")
        return {}

    def emit_navigation(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_navigation called on no-op session (run start failed)")
        return {}

    def emit_field_extract(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_field_extract called on no-op session (run start failed)")
        return {}

    def emit_field_entry(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_field_entry called on no-op session (run start failed)")
        return {}

    def emit_click(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_click called on no-op session (run start failed)")
        return {}

    def emit_validation(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_validation called on no-op session (run start failed)")
        return {}

    def emit_exception(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_exception called on no-op session (run start failed)")
        return {}

    def emit_human_handoff(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("emit_human_handoff called on no-op session (run start failed)")
        return {}

    def attach_artifact(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("attach_artifact called on no-op session (run start failed)")
        return {}

    def complete(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("complete called on no-op session (run start failed)")
        return {}

    def fail(self, *args, **kwargs) -> Dict[str, Any]:
        logger.warning("fail called on no-op session (run start failed)")
        return {}

    def flush_pending_events(self) -> bool:
        return True
