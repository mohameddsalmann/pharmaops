import hmac
import hashlib
import uuid
import time
from urllib.parse import urlparse

def compute_body_hash(body_bytes: bytes) -> str:
    """Compute SHA-256 hex digest of body bytes."""
    return hashlib.sha256(body_bytes).hexdigest()

def normalize_path(path: str) -> str:
    """Strips query parameters and trailing slashes, lowercases."""
    parsed = urlparse(path)
    clean = parsed.path.rstrip('/')
    return clean.lower()

def build_canonical_string(
    method: str,
    path: str,
    timestamp: str,
    nonce: str,
    body_hash: str
) -> str:
    """Format matching TypeScript: METHOD\nPATH\nTIMESTAMP\nNONCE\nSHA256"""
    normalized = normalize_path(path)
    return f"{method.upper()}\n{normalized}\n{timestamp}\n{nonce}\n{body_hash}"

def sign_request(
    method: str,
    path: str,
    timestamp: str,
    nonce: str,
    body_hash: str,
    api_key: str
) -> str:
    """Generate HMAC-SHA256 signature."""
    canonical = build_canonical_string(method, path, timestamp, nonce, body_hash)
    return hmac.new(
        api_key.encode('utf-8'),
        canonical.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def verify_timestamp(timestamp_str: str, max_skew: int = 300) -> bool:
    """Checks if timestamp is within skew tolerance."""
    try:
        ts = int(timestamp_str)
    except ValueError:
        return False
    now = int(time.time())
    return abs(now - ts) <= max_skew

def generate_nonce() -> str:
    """Generate a unique UUID4 nonce."""
    return str(uuid.uuid4())
