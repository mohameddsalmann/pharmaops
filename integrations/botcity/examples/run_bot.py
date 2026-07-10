#!/usr/bin/env python3
"""
Standalone Python example — run a simulated pharmacy bot workflow
against the PharmaGuard BotOps ingestion API.

Usage:
    python run_bot.py --base-url http://localhost:3000 --api-key YOUR_INGEST_KEY

This script demonstrates:
  1. Creating a PharmaGuardClient with HMAC authentication
  2. Starting a run with workflowSpecVersion
  3. Emitting screen_read, field_extract, field_entry, click, validation events
  4. Completing the run
  5. Fail-open behavior (telemetry errors never crash the bot)
"""

import argparse
import logging
import sys
import os

# Add the SDK to the path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from pharmaguard_sdk import PharmaGuardClient, PharmaGuardRunSession

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("run_bot")


def run_prescription_intake(client: PharmaGuardClient, pharmacy_id: str, pharmacy_name: str):
    """Simulate a prescription intake workflow on Pioneer PMS."""

    logger.info("Starting prescription intake run for %s", pharmacy_name)

    session = client.start_run(
        pharmacy_id=pharmacy_id,
        pharmacy_name=pharmacy_name,
        pms_type="pioneer",
        workflow_type="prescription_intake",
        bot_version="1.0.0",
        environment="demo",
        workflow_spec_version="1.0.0",
        expected_fields={
            "medicationName": "Lisinopril",
            "strength": "10mg",
            "quantity": "30",
            "directions": "Take 1 tablet by mouth daily",
            "prescriberName": "Dr. Smith",
            "refills": "3",
        },
        baseline_version="1.2.0",
    )

    if not session.run_id:
        logger.warning("Run start failed (no-op session returned). Bot continues in fail-open mode.")
        return

    logger.info("Run started: %s", session.run_id)

    # Step 1: Read patient search screen
    session.emit_screen_read(
        screen_name="Patient Search",
        action_summary="Read patient search screen, located patient John D.",
        confidence=0.95,
        duration_ms=1200,
        screen_text="Patient: John D. | DOB: [REDACTED_DOB] | RX-123456",
        extracted_fields={"patientName": "[REDACTED_PATIENTNAME]", "rxNumber": "[REDACTED_RX_NUMBER]"},
    )
    logger.info("  Step 1: Patient search screen read")

    # Step 2: Navigate to prescription detail
    session.emit_navigation(
        screen_name="Prescription Detail",
        action_summary="Navigated to prescription detail screen",
        confidence=0.92,
        duration_ms=800,
    )
    logger.info("  Step 2: Navigated to prescription detail")

    # Step 3: Extract fields from prescription
    session.emit_field_extract(
        screen_name="Prescription Detail",
        action_summary="Extracted medication, strength, quantity, directions, prescriber, refills",
        confidence=0.93,
        duration_ms=1500,
        extracted_fields={
            "medicationName": "Lisinopril",
            "strength": "10mg",
            "quantity": "30",
            "directions": "Take 1 tablet by mouth daily",
            "prescriberName": "Dr. Smith",
            "refills": "3",
        },
    )
    logger.info("  Step 3: Fields extracted from prescription")

    # Step 4: Enter data into PMS fields
    session.emit_field_entry(
        screen_name="Data Entry Form",
        action_summary="Entered medication, strength, quantity, directions into PMS",
        confidence=0.91,
        duration_ms=2200,
        entered_fields={
            "medicationName": "Lisinopril",
            "strength": "10mg",
            "quantity": "30",
            "directions": "Take 1 tablet by mouth daily",
            "prescriberName": "Dr. Smith",
            "refills": "3",
        },
    )
    logger.info("  Step 4: Data entered into PMS")

    # Step 5: Click submit
    session.emit_click(
        screen_name="Data Entry Form",
        action_summary="Clicked Submit button",
        confidence=0.96,
        duration_ms=300,
    )
    logger.info("  Step 5: Submit clicked")

    # Step 6: Validation check
    session.emit_validation(
        screen_name="Final Review",
        action_summary="Validated entered data against prescription — all fields match",
        confidence=0.94,
        duration_ms=1000,
    )
    logger.info("  Step 6: Validation passed")

    # Complete the run
    session.complete(
        final_outcome="Prescription intake completed successfully. All fields extracted and entered correctly.",
        status="completed",
        processed_item_count=1,
    )
    logger.info("Run completed: %s", session.run_id)

    # Flush any spooled events (if any failed during the run)
    flushed = session.flush_pending_events()
    if flushed:
        logger.info("All spooled events flushed successfully")
    else:
        logger.warning("Some spooled events could not be flushed")


def main():
    parser = argparse.ArgumentParser(description="Run a simulated pharmacy bot workflow")
    parser.add_argument("--base-url", default=os.environ.get("PHARMAGUARD_BASE_URL", "http://localhost:3000"), help="PharmaGuard API base URL")
    parser.add_argument("--api-key", default=os.environ.get("PHARMAGUARD_INGEST_KEY", ""), help="HMAC ingest key")
    parser.add_argument("--pharmacy-id", default="PHARM-001", help="Pharmacy ID")
    parser.add_argument("--pharmacy-name", default="Central Pharmacy", help="Pharmacy name")
    parser.add_argument("--fail-open", action="store_true", default=True, help="Fail open on telemetry errors")
    parser.add_argument("--no-fail-open", dest="fail_open", action="store_false", help="Raise on telemetry errors")
    args = parser.parse_args()

    if not args.api_key:
        logger.error("No API key provided. Set PHARMAGUARD_INGEST_KEY env var or use --api-key")
        sys.exit(1)

    client = PharmaGuardClient(
        base_url=args.base_url,
        api_key=args.api_key,
        fail_open=args.fail_open,
    )

    try:
        run_prescription_intake(client, args.pharmacy_id, args.pharmacy_name)
    except Exception as exc:
        logger.error("Bot run failed: %s", str(exc).replace(args.api_key, "[REDACTED]"))
        sys.exit(1)

    logger.info("Done!")


if __name__ == "__main__":
    main()
