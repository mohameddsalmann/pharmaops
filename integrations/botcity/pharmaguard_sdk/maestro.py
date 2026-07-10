#!/usr/bin/env python3
"""
BotCity Maestro integration wrapper for PharmaGuard BotOps.

This module provides a thin adapter that bridges BotCity Maestro's
task execution lifecycle with PharmaGuard's telemetry ingestion API.

Usage in a BotCity automation:
    from pharmaguard_sdk.maestro import PharmaGuardMaestroAdapter

    adapter = PharmaGuardMaestroAdapter(
        base_url=os.environ["PHARMAGUARD_API_URL"],
        api_key=os.environ["PHARMAGUARD_INGEST_KEY"],
    )

    with adapter.start_run_from_maestro(maestro, task) as session:
        session.emit_screen_read("Patient Search", "Read screen", 0.95, 1200)
        # ... bot automation steps ...
        session.complete("Workflow finished successfully")
"""

import logging
import os
from typing import Any, Dict, Optional

from .client import PharmaGuardClient, PharmaGuardRunSession, NoOpPharmaGuardRunSession

logger = logging.getLogger("pharmaguard_sdk.maestro")


class PharmaGuardMaestroAdapter:
    """
    Adapter that connects BotCity Maestro task lifecycle to PharmaGuard ingestion.

    Extracts pharmacy metadata from Maestro task parameters and creates
    a PharmaGuard run session with proper workflowSpecVersion.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 30.0,
        fail_open: bool = True,
    ):
        self.client = PharmaGuardClient(
            base_url=base_url,
            api_key=api_key,
            timeout=timeout,
            fail_open=fail_open,
        )

    def _extract_params(self, maestro: Any, task: Any) -> Dict[str, str]:
        """Extract pharmacy metadata from Maestro task parameters."""
        params: Dict[str, str] = {}
        try:
            if hasattr(task, "params"):
                raw = task.params
            elif hasattr(maestro, "get_task_params"):
                raw = maestro.get_task_params(task.id)
            else:
                raw = {}

            if isinstance(raw, dict):
                params = {k: str(v) for k, v in raw.items()}
        except Exception as exc:
            logger.warning("Failed to extract Maestro task params: %s", str(exc))
        return params

    def start_run_from_maestro(
        self,
        maestro: Any,
        task: Any,
        workflow_spec_version: str = "1.0.0",
    ) -> Any:
        """
        Start a PharmaGuard run from a BotCity Maestro task.

        Returns a PharmaGuardRunSession (or NoOpPharmaGuardRunSession on fail-open).
        """
        params = self._extract_params(maestro, task)

        pharmacy_id = params.get("pharmacyId", "UNKNOWN")
        pharmacy_name = params.get("pharmacyName", "Unknown Pharmacy")
        pms_type = params.get("pmsType", "generic")
        workflow_type = params.get("workflowType", "prescription_intake")
        bot_version = params.get("botVersion", "1.0.0")
        environment = params.get("environment", "demo")
        external_task_id = getattr(task, "id", None)
        automation_label = params.get("automationLabel")
        runner_id = params.get("runnerId")

        logger.info(
            "Starting PharmaGuard run from Maestro task: pharmacy=%s workflow=%s spec=%s",
            pharmacy_id, workflow_type, workflow_spec_version,
        )

        return self.client.start_run(
            pharmacy_id=pharmacy_id,
            pharmacy_name=pharmacy_name,
            pms_type=pms_type,
            workflow_type=workflow_type,
            bot_version=bot_version,
            environment=environment,
            workflow_spec_version=workflow_spec_version,
            external_task_id=external_task_id,
            automation_label=automation_label,
            runner_id=runner_id,
        )

    def create_finish_handler(self, session: Any):
        """
        Returns a callback that completes the run when BotCity finishes.

        Usage:
            maestro.on_finish(adapter.create_finish_handler(session))
        """
        def _on_finish(item: Any, status: str, exception: Optional[Exception] = None):
            if isinstance(session, NoOpPharmaGuardRunSession):
                logger.warning("Maestro finish on no-op session, skipping")
                return

            if exception:
                session.fail(
                    failure_reason=str(exception)[:500],
                    error_code=getattr(exception, "error_code", None),
                )
            else:
                session.complete(
                    final_outcome=f"BotCity task completed with status: {status}",
                    status="completed",
                )

            session.flush_pending_events()

        return _on_finish


class PharmaGuardRunContext:
    """
    Context manager for PharmaGuard runs in BotCity automations.

    Usage:
        with PharmaGuardRunContext(adapter, maestro, task) as session:
            session.emit_screen_read(...)
            # ... automation steps ...
    """

    def __init__(self, adapter: PharmaGuardMaestroAdapter, maestro: Any, task: Any):
        self._adapter = adapter
        self._maestro = maestro
        self._task = task
        self._session: Any = None

    def __enter__(self) -> Any:
        self._session = self._adapter.start_run_from_maestro(self._maestro, self._task)
        return self._session

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._session is None:
            return False

        if exc_type is not None:
            if not isinstance(self._session, NoOpPharmaGuardRunSession):
                self._session.fail(
                    failure_reason=str(exc_val)[:500] if exc_val else "Unknown exception",
                )
        else:
            if not isinstance(self._session, NoOpPharmaGuardRunSession):
                self._session.complete(
                    final_outcome="BotCity automation completed successfully",
                )

        try:
            self._session.flush_pending_events()
        except Exception as exc:
            logger.warning("Failed to flush pending events on exit: %s", str(exc))

        return False
