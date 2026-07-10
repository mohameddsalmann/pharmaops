"""
PharmaOps Integration Test — End-to-end bot run lifecycle.

Usage:
    set PHARMAGUARD_API_URL=https://your-deployment.vercel.app
    set PHARMAGUARD_INGEST_KEY=your-ingest-key
    python integrations/botcity/tests/test_integration_e2e.py

This test verifies:
1. Start a run
2. Emit telemetry events
3. Complete with completionClientId
4. Verify idempotent completion (retry returns same results)
5. Verify replay URL is dynamically constructed
6. Verify executionStatus and evaluationStatus are separated
"""

import os
import sys
import time
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pharmaguard_sdk import PharmaGuardClient, PharmaGuardRunSession


def main():
    base_url = os.environ.get("PHARMAGUARD_API_URL", "")
    api_key = os.environ.get("PHARMAGUARD_INGEST_KEY", "")

    if not base_url or not api_key:
        print("ERROR: Set PHARMAGUARD_API_URL and PHARMAGUARD_INGEST_KEY")
        print("  Example:")
        print("    set PHARMAGUARD_API_URL=https://your-deployment.vercel.app")
        print("    set PHARMAGUARD_INGEST_KEY=your-key")
        sys.exit(1)

    print(f"Target: {base_url}")
    print(f"Key: {api_key[:4]}...{api_key[-4:]}")
    print()

    results = []

    def check(name, condition, detail=""):
        status = "PASS" if condition else "FAIL"
        results.append((name, condition))
        print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))

    # Step 1: Start a run
    print("1. Starting run...")
    client = PharmaGuardClient(base_url=base_url, api_key=api_key, fail_open=False)
    session = client.start_run(
        pharmacy_id="PHARM-TEST-001",
        pharmacy_name="Integration Test Pharmacy",
        pms_type="pioneer",
        workflow_type="prescription_intake",
        bot_version="1.0.0",
        environment="demo",
        workflow_spec_version="1.0.0",
    )

    check("start_run returns session", isinstance(session, PharmaGuardRunSession))
    check("session has run_id", bool(session.run_id), f"run_id={session.run_id}")

    # Step 2: Verify replay URL is dynamic
    print("\n2. Checking replay URL...")
    replay_url = session.replay_url
    check("replay_url contains base_url", base_url.rstrip("/") in replay_url, f"replay_url={replay_url}")
    check("replay_url contains run_id", session.run_id in replay_url, f"replay_url={replay_url}")

    # Step 3: Emit events
    print("\n3. Emitting events...")
    session.emit_screen_read(
        screen_name="Patient Search",
        action_summary="Read patient search screen",
        confidence=0.95,
        duration_ms=1200,
        extracted_fields={"patientName": "[REDACTED]"},
    )
    check("emit_screen_read succeeded", True)

    session.emit_field_entry(
        screen_name="Prescription Entry",
        action_summary="Entered prescription fields",
        confidence=0.91,
        duration_ms=2200,
        entered_fields={"medicationName": "Lisinopril", "dosage": "10mg"},
    )
    check("emit_field_entry succeeded", True)

    session.emit_validation(
        screen_name="Insurance Check",
        action_summary="Validated insurance coverage",
        confidence=0.88,
        duration_ms=800,
    )
    check("emit_validation succeeded", True)

    # Step 4: Complete with completionClientId
    print("\n4. Completing run...")
    completion_client_id = f"test-completion-{uuid.uuid4()}"
    complete_result = session.complete(
        final_outcome="Integration test completed successfully",
        processed_item_count=1,
        completion_client_id=completion_client_id,
    )
    check("complete returned response", bool(complete_result))

    run_data = complete_result.get("run", complete_result)
    check("executionStatus is completed", run_data.get("executionStatus") == "completed",
          f"executionStatus={run_data.get('executionStatus')}")
    check("evaluationStatus is completed", run_data.get("evaluationStatus") == "completed",
          f"evaluationStatus={run_data.get('evaluationStatus')}")

    overall_score = run_data.get("overallScore")
    check("overallScore is set", overall_score is not None, f"score={overall_score}")

    decision = run_data.get("decision")
    check("decision is set", decision is not None, f"decision={decision}")

    # Step 5: Idempotent completion — retry with same completionClientId
    print("\n5. Testing idempotent completion (retry)...")
    time.sleep(1)
    retry_result = session.complete(
        final_outcome="Integration test completed successfully",
        processed_item_count=1,
        completion_client_id=completion_client_id,
    )
    retry_run = retry_result.get("run", retry_result)
    check("retry returns same run", retry_run.get("id") == run_data.get("id"))
    check("retry evaluationStatus still completed", retry_run.get("evaluationStatus") == "completed")
    check("retry overallScore matches", retry_run.get("overallScore") == overall_score)

    # Step 6: Summary
    print("\n" + "=" * 60)
    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    total = len(results)
    print(f"Results: {passed}/{total} passed, {failed} failed")
    print("=" * 60)

    if failed > 0:
        print("\nFailed checks:")
        for name, ok in results:
            if not ok:
                print(f"  - {name}")
        sys.exit(1)
    else:
        print("\nAll checks passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
