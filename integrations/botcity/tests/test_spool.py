import os
import sys
import json
import tempfile
import multiprocessing

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pharmaguard_sdk.spool import SpoolStore, SpoolWriter, SpoolReader, flush_pending_events


@pytest.fixture
def temp_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.remove(path)


class TestSpool:
    def test_failed_event_persisted(self, temp_db):
        store = SpoolStore("run-1", db_path=temp_db)
        event = {"clientEventId": "evt-1", "sequenceNumber": 1, "screenName": "Test", "actionType": "screen_read"}
        store.append_event(event)
        pending = store.read_pending_events()
        assert len(pending) == 1
        assert pending[0]["clientEventId"] == "evt-1"
        store.clear()

    def test_events_ordered_by_sequence(self, temp_db):
        store = SpoolStore("run-2", db_path=temp_db)
        for i in [3, 1, 2]:
            store.append_event({"clientEventId": f"evt-{i}", "sequenceNumber": i, "screenName": "Test"})
        pending = store.read_pending_events()
        assert [e["sequenceNumber"] for e in pending] == [1, 2, 3]
        store.clear()

    def test_duplicate_client_event_id_deduplicated(self, temp_db):
        store = SpoolStore("run-3", db_path=temp_db)
        event = {"clientEventId": "evt-dup", "sequenceNumber": 1, "screenName": "Test"}
        store.append_event(event)
        store.append_event(event)
        pending = store.read_pending_events()
        assert len(pending) == 1
        store.clear()

    def test_concurrent_append_safe(self, temp_db):
        import threading

        def writer(run_id, db_path, start):
            store = SpoolStore(run_id, db_path=db_path)
            for i in range(start, start + 10):
                store.append_event({"clientEventId": f"evt-conc-{i}", "sequenceNumber": i, "screenName": "Test"})
            store.close()

        threads = []
        for i in range(2):
            t = threading.Thread(target=writer, args=("run-conc", temp_db, i * 10))
            threads.append(t)
            t.start()
        for t in threads:
            t.join()

        store = SpoolStore("run-conc", db_path=temp_db)
        pending = store.read_pending_events()
        assert len(pending) == 20
        store.clear()

    def test_successful_flush_marks_delivered(self, temp_db):
        store = SpoolStore("run-flush-1", db_path=temp_db)
        store.append_event({"clientEventId": "evt-f1", "sequenceNumber": 1, "screenName": "Test"})
        store.mark_delivered("evt-f1")
        pending = store.read_pending_events()
        assert len(pending) == 0
        store.clear()

    def test_failed_flush_retains_undelivered(self, temp_db):
        store = SpoolStore("run-flush-2", db_path=temp_db)
        store.append_event({"clientEventId": "evt-f2", "sequenceNumber": 1, "screenName": "Test"})
        store.append_event({"clientEventId": "evt-f3", "sequenceNumber": 2, "screenName": "Test"})
        store.remove_delivered()
        pending = store.read_pending_events()
        assert len(pending) == 2
        store.clear()

    def test_retry_after_process_restart(self, temp_db):
        store1 = SpoolStore("run-restart", db_path=temp_db)
        store1.append_event({"clientEventId": "evt-r1", "sequenceNumber": 1, "screenName": "Test"})
        store1.close()

        store2 = SpoolStore("run-restart", db_path=temp_db)
        pending = store2.read_pending_events()
        assert len(pending) == 1
        assert pending[0]["clientEventId"] == "evt-r1"
        store2.clear()

    def test_spool_writer_reader_compat(self, temp_db):
        writer = SpoolWriter("run-compat")
        writer.append_event({"clientEventId": "evt-c1", "sequenceNumber": 1, "screenName": "Test"})
        reader = SpoolReader("run-compat")
        events = reader.read_events()
        assert len(events) == 1
        writer.clear()
