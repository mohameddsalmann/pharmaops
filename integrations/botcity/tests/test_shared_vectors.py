import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pharmaguard_sdk.test_vectors import load_shared_test_vectors
from pharmaguard_sdk.signing import compute_body_hash, sign_request


class TestSharedVectors:
    def test_vectors_load_successfully(self):
        vectors = load_shared_test_vectors()
        assert isinstance(vectors, list)
        assert len(vectors) > 0

    def test_each_vector_has_required_fields(self):
        vectors = load_shared_test_vectors()
        required = {"method", "path", "timestamp", "nonce", "body", "bodyHash", "key", "signature"}
        for i, v in enumerate(vectors):
            missing = required - set(v.keys())
            assert not missing, f"Vector {i} missing fields: {missing}"

    def test_each_vector_body_hash_matches(self):
        vectors = load_shared_test_vectors()
        for v in vectors:
            body_bytes = v["body"].encode("utf-8")
            assert compute_body_hash(body_bytes) == v["bodyHash"]

    def test_each_vector_signature_matches(self):
        vectors = load_shared_test_vectors()
        for v in vectors:
            body_bytes = v["body"].encode("utf-8")
            body_hash = compute_body_hash(body_bytes)
            sig = sign_request(
                v["method"],
                v["path"],
                str(v["timestamp"]),
                v["nonce"],
                body_hash,
                v["key"],
            )
            assert sig == v["signature"], f"Signature mismatch for nonce={v['nonce']}"
