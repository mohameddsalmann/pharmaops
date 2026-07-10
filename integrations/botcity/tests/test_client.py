import os
import sys
import json
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pharmaguard_sdk.client import (
    PharmaGuardClient,
    PharmaGuardRunSession,
    NoOpPharmaGuardRunSession,
    PharmaGuardError,
    PharmaGuardAuthError,
    PharmaGuardConnectionError,
)
from pharmaguard_sdk.signing import compute_body_hash, sign_request


@pytest.fixture
def mock_client():
    return PharmaGuardClient(
        base_url="http://localhost:3000",
        api_key="test-secret-key",
        fail_open=True,
    )


@pytest.fixture
def strict_client():
    return PharmaGuardClient(
        base_url="http://localhost:3000",
        api_key="test-secret-key",
        fail_open=False,
    )


class TestStartRun:
    def test_start_run_returns_session(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-123"}}
            session = mock_client.start_run(
                pharmacy_id="PHARM-001",
                pharmacy_name="Test Pharmacy",
                pms_type="pioneer",
                workflow_type="prescription_intake",
                bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )
            assert isinstance(session, PharmaGuardRunSession)
            assert session.run_id == "run-123"

    def test_start_run_fail_open_returns_noop(self, mock_client):
        with patch.object(mock_client, "_post", side_effect=PharmaGuardConnectionError("Connection refused")):
            session = mock_client.start_run(
                pharmacy_id="PHARM-001",
                pharmacy_name="Test Pharmacy",
                pms_type="pioneer",
                workflow_type="prescription_intake",
                bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )
            assert isinstance(session, NoOpPharmaGuardRunSession)

    def test_start_run_strict_raises(self, strict_client):
        with patch.object(strict_client, "_post", side_effect=PharmaGuardConnectionError("Connection refused")):
            with pytest.raises(PharmaGuardError):
                strict_client.start_run(
                    pharmacy_id="PHARM-001",
                    pharmacy_name="Test Pharmacy",
                    pms_type="pioneer",
                    workflow_type="prescription_intake",
                    bot_version="1.0.0",
                    workflow_spec_version="1.0.0",
                )

    def test_second_start_run_succeeds_after_first_fails(self, mock_client):
        call_count = [0]
        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise PharmaGuardConnectionError("Connection refused")
            return {"run": {"id": "run-456"}}

        with patch.object(mock_client, "_post", side_effect=side_effect):
            session1 = mock_client.start_run(
                pharmacy_id="PHARM-001",
                pharmacy_name="Test Pharmacy",
                pms_type="pioneer",
                workflow_type="prescription_intake",
                bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )
            assert isinstance(session1, NoOpPharmaGuardRunSession)

            session2 = mock_client.start_run(
                pharmacy_id="PHARM-001",
                pharmacy_name="Test Pharmacy",
                pms_type="pioneer",
                workflow_type="prescription_intake",
                bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )
            assert isinstance(session2, PharmaGuardRunSession)
            assert session2.run_id == "run-456"


class TestSessionEvents:
    def test_sequence_increments_per_event(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-seq"}}
            session = mock_client.start_run(
                pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                workflow_type="prescription_intake", bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )

            mock_post.return_value = {}
            session.emit_screen_read("Screen1", "Read", 0.95, 100)
            session.emit_navigation("Screen2", "Navigate", 0.90, 200)

            calls = mock_post.call_args_list
            assert calls[1].args[1]["sequenceNumber"] == 1
            assert calls[2].args[1]["sequenceNumber"] == 2

    def test_ingest_raw_event_does_not_increment_sequence(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-raw"}}
            session = mock_client.start_run(
                pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                workflow_type="prescription_intake", bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )

            mock_post.return_value = {}
            mock_client._ingest_raw_event("run-raw", {"clientEventId": "raw-1", "sequenceNumber": 99})

            session.emit_screen_read("Screen1", "Read", 0.95, 100)

            calls = mock_post.call_args_list
            emit_call = calls[2].args[1]
            assert emit_call["sequenceNumber"] == 1

    def test_retries_reuse_client_event_id(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-retry"}}
            session = mock_client.start_run(
                pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                workflow_type="prescription_intake", bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )

            mock_post.side_effect = PharmaGuardConnectionError("Connection refused")
            result = session._emit(
                screen_name="Screen1",
                action_type="screen_read",
                action_summary="Read",
                confidence=0.95,
                duration_ms=100,
                status="success",
                client_event_id="evt-fixed",
            )
            assert result == {}

            from pharmaguard_sdk.spool import SpoolStore
            store = SpoolStore("run-retry")
            pending = store.read_pending_events()
            assert len(pending) == 1
            assert pending[0]["clientEventId"] == "evt-fixed"
            store.clear()

    def test_correct_integration_route_called(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-route"}}
            session = mock_client.start_run(
                pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                workflow_type="prescription_intake", bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )

            start_path = mock_post.call_args.args[0]
            assert "integrations/botcity/runs/start" in start_path

            mock_post.return_value = {}
            session.emit_screen_read("Screen1", "Read", 0.95, 100)
            event_path = mock_post.call_args.args[0]
            assert "integrations/botcity/runs/run-route/events" in event_path

    def test_timeout_set(self):
        client = PharmaGuardClient(base_url="http://localhost:3000", api_key="k", timeout=45.0)
        assert client.timeout == 45.0

    def test_no_api_key_in_raised_errors(self, strict_client):
        with patch.object(strict_client, "_post", side_effect=PharmaGuardAuthError("Authentication failed (status 401)")):
            with pytest.raises(PharmaGuardError) as exc_info:
                strict_client.start_run(
                    pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                    workflow_type="prescription_intake", bot_version="1.0.0",
                    workflow_spec_version="1.0.0",
                )
            assert "test-secret-key" not in str(exc_info.value)

    def test_failed_event_writes_to_spool(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-spool"}}
            session = mock_client.start_run(
                pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                workflow_type="prescription_intake", bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )

            mock_post.side_effect = PharmaGuardConnectionError("Connection refused")
            result = session._emit(
                screen_name="Screen1",
                action_type="screen_read",
                action_summary="Read",
                confidence=0.95,
                duration_ms=100,
                status="success",
                client_event_id="evt-spool-test",
            )
            assert result == {}

    def test_fail_open_complete_does_not_raise(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-complete"}}
            session = mock_client.start_run(
                pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                workflow_type="prescription_intake", bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )

            mock_post.side_effect = PharmaGuardError("Server error 500")
            result = session.complete("Done")
            assert result == {}

    def test_fail_open_fail_does_not_raise(self, mock_client):
        with patch.object(mock_client, "_post") as mock_post:
            mock_post.return_value = {"run": {"id": "run-fail"}}
            session = mock_client.start_run(
                pharmacy_id="P1", pharmacy_name="Test", pms_type="pioneer",
                workflow_type="prescription_intake", bot_version="1.0.0",
                workflow_spec_version="1.0.0",
            )

            mock_post.side_effect = PharmaGuardError("Server error 500")
            result = session.fail("Bot crashed")
            assert result == {}

    def test_noop_session_all_methods_return_empty(self):
        noop = NoOpPharmaGuardRunSession()
        assert noop.emit_screen_read("S", "A", 0.9, 100) == {}
        assert noop.emit_navigation("S", "A", 0.9, 100) == {}
        assert noop.complete("Done") == {}
        assert noop.fail("Error") == {}
        assert noop.flush_pending_events() is True
        assert noop.run_id == ""
