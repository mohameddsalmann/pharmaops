import json
import os
import sys
import hashlib

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pharmaguard_sdk.signing import (
    compute_body_hash,
    build_canonical_string,
    sign_request,
    normalize_path,
)
from pharmaguard_sdk.test_vectors import load_shared_test_vectors


class TestSigning:
    def test_shared_hmac_vectors_match(self):
        vectors = load_shared_test_vectors()
        assert len(vectors) > 0
        for v in vectors:
            body_bytes = v["body"].encode("utf-8")
            body_hash = compute_body_hash(body_bytes)
            assert body_hash == v["bodyHash"], f"Body hash mismatch for vector {v}"

            signature = sign_request(
                v["method"],
                v["path"],
                str(v["timestamp"]),
                v["nonce"],
                body_hash,
                v["key"],
            )
            assert signature == v["signature"], f"Signature mismatch for vector {v}"

    def test_one_body_byte_change_produces_different_signature(self):
        body1 = b'{"pharmacyId":"PHARM-001"}'
        body2 = b'{"pharmacyId":"PHARM-002"}'
        key = "test-secret-key"

        hash1 = compute_body_hash(body1)
        hash2 = compute_body_hash(body2)
        assert hash1 != hash2

        sig1 = sign_request("POST", "/api/test", "1234567890", "nonce-1", hash1, key)
        sig2 = sign_request("POST", "/api/test", "1234567890", "nonce-1", hash2, key)
        assert sig1 != sig2

    def test_path_change_produces_different_signature(self):
        key = "test-secret-key"
        body = b'{"test":true}'
        body_hash = compute_body_hash(body)

        sig1 = sign_request("POST", "/api/path1", "1234567890", "nonce-1", body_hash, key)
        sig2 = sign_request("POST", "/api/path2", "1234567890", "nonce-1", body_hash, key)
        assert sig1 != sig2

    def test_nonce_change_produces_different_signature(self):
        key = "test-secret-key"
        body = b'{"test":true}'
        body_hash = compute_body_hash(body)

        sig1 = sign_request("POST", "/api/test", "1234567890", "nonce-1", body_hash, key)
        sig2 = sign_request("POST", "/api/test", "1234567890", "nonce-2", body_hash, key)
        assert sig1 != sig2

    def test_timestamp_change_produces_different_signature(self):
        key = "test-secret-key"
        body = b'{"test":true}'
        body_hash = compute_body_hash(body)

        sig1 = sign_request("POST", "/api/test", "1234567890", "nonce-1", body_hash, key)
        sig2 = sign_request("POST", "/api/test", "1234567891", "nonce-1", body_hash, key)
        assert sig1 != sig2

    def test_normalize_path_strips_query_and_trailing_slash(self):
        assert normalize_path("/api/test/") == "/api/test"
        assert normalize_path("/api/test?foo=bar") == "/api/test"
        assert normalize_path("/API/Test") == "/api/test"
