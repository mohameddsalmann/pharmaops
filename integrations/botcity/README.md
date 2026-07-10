# PharmaGuard BotCity Integration

Python SDK for connecting pharmacy automation bots to the PharmaGuard BotOps QA & Replay Platform.

## Features

- **HMAC-SHA256 Authentication** — Every request signed with method, path, timestamp, nonce, and body hash
- **Replay Protection** — Atomic nonce claiming prevents duplicate event submission
- **Per-Run Fail-Open Sessions** — Telemetry errors never crash your bot; `PharmaGuardRunSession` returns `{}` on failure and spools events for retry
- **NoOp Sessions** — When `start_run` fails in fail-open mode, a `NoOpPharmaGuardRunSession` is returned so your bot continues without telemetry
- **Automatic PHI Redaction** — DOB, SSN, phone, email, RX numbers, and patient names are redacted before network transmission
- **SQLite Event Spool** — Process-safe, deduplicated by `client_event_id`, WAL mode for concurrent writers, survives process restarts
- **BotCity Maestro Adapter** — Drop-in wrapper for Maestro task lifecycle with context manager support
- **Python 3.9+** — No async required, works with any bot framework

## Installation

```bash
pip install requests
```

Add the SDK to your bot project by copying the `pharmaguard_sdk` package or adding it to your Python path.

## Quick Start

### Standalone Bot

```python
import os
from pharmaguard_sdk import PharmaGuardClient

client = PharmaGuardClient(
    base_url="http://localhost:3000",
    api_key=os.environ["PHARMAGUARD_INGEST_KEY"],
    fail_open=True,
)

session = client.start_run(
    pharmacy_id="PHARM-001",
    pharmacy_name="Central Pharmacy",
    pms_type="pioneer",
    workflow_type="prescription_intake",
    bot_version="1.0.0",
    workflow_spec_version="1.0.0",
)

# Emit events — each gets an auto-incrementing sequence number
session.emit_screen_read("Patient Search", "Read patient screen", 0.95, 1200)
session.emit_field_extract("Rx Detail", "Extracted fields", 0.93, 1500,
    extracted_fields={"medicationName": "Lisinopril", "strength": "10mg"})
session.emit_field_entry("Data Entry", "Entered fields", 0.91, 2200,
    entered_fields={"medicationName": "Lisinopril", "strength": "10mg"})
session.emit_click("Data Entry", "Clicked Submit", 0.96, 300)
session.emit_validation("Final Review", "All fields match", 0.94, 1000)

# Complete the run
session.complete(
    final_outcome="Prescription intake completed successfully",
    status="completed",
    processed_item_count=1,
)

# Flush any spooled events that failed during the run
session.flush_pending_events()
```

### Run the Example

```bash
cd integrations/botcity
python examples/run_bot.py --base-url http://localhost:3000 --api-key YOUR_KEY
```

### BotCity Maestro Integration

```python
from pharmaguard_sdk import PharmaGuardMaestroAdapter, PharmaGuardRunContext

adapter = PharmaGuardMaestroAdapter(
    base_url=os.environ["PHARMAGUARD_API_URL"],
    api_key=os.environ["PHARMAGUARD_INGEST_KEY"],
)

# Context manager auto-completes on success, auto-fails on exception
with PharmaGuardRunContext(adapter, maestro, task) as session:
    session.emit_screen_read("Patient Search", "Read screen", 0.95, 1200)
    session.emit_field_extract("Rx Detail", "Extracted", 0.93, 1500,
        extracted_fields={"medicationName": "Lisinopril"})
    # ... more bot steps ...
    # Run auto-completes on exit
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PHARMAGUARD_INGEST_KEY` | Yes | HMAC signing key for telemetry ingestion |
| `PHARMAGUARD_ENABLE_PUBLIC_SANDBOX` | No | Set to `true` to enable the public sandbox |
| `PHARMAGUARD_SANDBOX_SESSION_SECRET` | No | Separate secret for sandbox session tokens (never the ingest key) |
| `PHARMAGUARD_APP_URL` | No | Trusted app URL for origin validation |
| `PHARMAGUARD_ALLOW_INSECURE_DEV` | No | Set to `true` in dev to allow unsigned requests |
| `PHARMAGUARD_SIGNATURE_TOLERANCE_SECONDS` | No | Timestamp skew tolerance (default: 300) |

## SDK Architecture

```
pharmaguard_sdk/
├── __init__.py          # Public API exports
├── client.py            # PharmaGuardClient, PharmaGuardRunSession, NoOpPharmaGuardRunSession
├── maestro.py           # BotCity Maestro adapter + context manager
├── signing.py           # HMAC-SHA256 request signing
├── redaction.py         # PHI pattern detection and redaction
├── spool.py             # SQLite event spool with deduplication
├── models.py            # Event types and enums
└── test_vectors.py      # Shared HMAC test vector loader
```

### Fail-Open Behavior

When `fail_open=True` (default):
- `start_run` failure → returns `NoOpPharmaGuardRunSession` (all methods return `{}`)
- Event delivery failure → event is spooled to SQLite, method returns `{}`
- `complete`/`fail` failure → returns `{}`, no exception raised

When `fail_open=False`:
- All errors raise `PharmaGuardError` (or subclasses)
- Caller must handle exceptions

### SQLite Spool

Events that fail delivery are persisted to `~/.pharmaguard/spool/spool.db`:
- **WAL mode** for concurrent writer support
- **`INSERT OR IGNORE`** deduplication by `client_event_id`
- **`mark_delivered`** / **`remove_delivered`** lifecycle management
- **Thread-local connections** for thread safety
- Survives process restarts — call `flush_pending_events()` on next startup

## Testing

```bash
# Python tests (42 tests)
python -m pytest integrations/botcity/tests/ -v

# TypeScript tests (99 tests)
npx vitest run

# Type checking
npx tsc --noEmit
```

## Security

- The ingest key is **never** sent in request bodies, URLs, or headers
- All authentication uses HMAC-SHA256 signatures with timestamp + nonce
- Replay protection via atomic nonce claiming (in-memory for dev, Upstash Redis for production)
- PHI is redacted client-side before any network transmission
- Sandbox routes use a **separate** signing secret (`PHARMAGUARD_SANDBOX_SESSION_SECRET`)
- Error messages are sanitized to never contain API keys

## License

MIT
