import os
import json
import time
import sqlite3
import threading
from typing import List, Dict, Any, Optional


class SpoolStore:
    """SQLite-based spool store for process-safe event persistence."""

    def __init__(self, run_id: str, db_path: Optional[str] = None):
        self.run_id = run_id
        if db_path is None:
            home = os.path.expanduser("~")
            spool_dir = os.path.join(home, ".pharmaguard", "spool")
            os.makedirs(spool_dir, exist_ok=True)
            db_path = os.path.join(spool_dir, "spool.db")
        self.db_path = db_path
        self._local = threading.local()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            conn = sqlite3.connect(self.db_path, timeout=30.0)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=5000")
            self._local.conn = conn
        return self._local.conn

    def _init_db(self) -> None:
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                client_event_id TEXT NOT NULL,
                sequence_number INTEGER NOT NULL,
                payload TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                UNIQUE(client_event_id)
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_run_status
            ON events(run_id, status)
        """)
        conn.commit()

    def append_event(self, event_payload: Dict[str, Any]) -> None:
        """Insert event, deduplicating by client_event_id (INSERT OR IGNORE)."""
        client_event_id = event_payload.get("clientEventId", "")
        seq = event_payload.get("sequenceNumber") or event_payload.get("stepNumber") or 0
        payload_json = json.dumps(event_payload)
        created_at = str(time.time())
        conn = self._get_conn()
        conn.execute(
            "INSERT OR IGNORE INTO events (run_id, client_event_id, sequence_number, payload, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
            (self.run_id, client_event_id, seq, payload_json, created_at),
        )
        conn.commit()

    def read_pending_events(self) -> List[Dict[str, Any]]:
        """Read pending events ordered by sequence_number."""
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT payload FROM events WHERE run_id = ? AND status = 'pending' ORDER BY sequence_number ASC, id ASC",
            (self.run_id,),
        ).fetchall()
        events = []
        for row in rows:
            try:
                events.append(json.loads(row["payload"]))
            except (json.JSONDecodeError, ValueError):
                continue
        return events

    def mark_delivered(self, client_event_id: str) -> None:
        """Mark a single event as delivered."""
        conn = self._get_conn()
        conn.execute(
            "UPDATE events SET status = 'delivered' WHERE client_event_id = ?",
            (client_event_id,),
        )
        conn.commit()

    def remove_delivered(self) -> None:
        """Delete all delivered events for this run."""
        conn = self._get_conn()
        conn.execute(
            "DELETE FROM events WHERE run_id = ? AND status = 'delivered'",
            (self.run_id,),
        )
        conn.commit()

    def clear(self) -> None:
        """Delete all events for this run."""
        conn = self._get_conn()
        conn.execute("DELETE FROM events WHERE run_id = ?", (self.run_id,))
        conn.commit()

    def close(self) -> None:
        if hasattr(self._local, "conn") and self._local.conn is not None:
            self._local.conn.close()
            self._local.conn = None


class SpoolWriter:
    """Thin wrapper around SpoolStore for backward compatibility."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.store = SpoolStore(run_id)

    def append_event(self, event_payload: Dict[str, Any]) -> None:
        self.store.append_event(event_payload)

    def clear(self) -> None:
        self.store.clear()


class SpoolReader:
    """Thin wrapper around SpoolStore for backward compatibility."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.store = SpoolStore(run_id)

    def read_events(self) -> List[Dict[str, Any]]:
        return self.store.read_pending_events()


def flush_pending_events(client: Any, run_id: str) -> bool:
    """
    Retries sending spooled events with exponential backoff.
    Returns True if all events were successfully flushed, otherwise False.
    """
    store = SpoolStore(run_id)
    events = store.read_pending_events()
    if not events:
        return True

    backoff = 1.0
    max_backoff = 16.0

    for event in events:
        success = False
        attempts = 0
        while not success and attempts < 5:
            try:
                client._ingest_raw_event(run_id, event)
                success = True
            except Exception:
                attempts += 1
                if attempts < 5:
                    time.sleep(backoff)
                    backoff = min(max_backoff, backoff * 2)

        if success:
            client_event_id = event.get("clientEventId", "")
            if client_event_id:
                store.mark_delivered(client_event_id)
        else:
            store.remove_delivered()
            return False

    store.clear()
    return True

