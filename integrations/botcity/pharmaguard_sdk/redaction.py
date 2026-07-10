import re
import hashlib
from typing import Dict, Any, Tuple, List

# Common regex patterns for pharmacy PHI
PHI_REDACTION_PATTERNS = {
    "dob": re.compile(r'\b\d{2}[-/\s]\d{2}[-/\s]\d{4}\b'),
    "phone": re.compile(r'\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b'),
    "email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    "rx_number": re.compile(r'\bRX-?\d{6,8}\b', re.IGNORECASE),
    "ssn": re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
}

def redact_text(text: str) -> str:
    """Scan and redact regex matches from a screen text payload."""
    if not text:
        return text
    redacted = text
    for key, pattern in PHI_REDACTION_PATTERNS.items():
        redacted = pattern.sub(f"[REDACTED_{key.upper()}]", redacted)
    return redacted

def redact_fields(fields: Dict[str, Any]) -> Dict[str, Any]:
    """Scan key/value dict and replace potential PHI values."""
    redacted = {}
    # Common PHI keys to redact entirely
    phi_keys = {
        "patientname", "patient_name", "firstname", "first_name", "lastname", 
        "last_name", "dob", "dateofbirth", "ssn", "phone", "email", 
        "address", "street", "city", "zip", "zipcode", "rxnumber", "rx_number"
    }
    
    for k, v in fields.items():
        k_lower = k.lower()
        if k_lower in phi_keys:
            redacted[k] = f"[REDACTED_{k.upper()}]"
        elif isinstance(v, str):
            # Check regex patterns as well
            val_redacted = redact_text(v)
            redacted[k] = val_redacted
        elif isinstance(v, dict):
            redacted[k] = redact_fields(v)
        else:
            redacted[k] = v
            
    return redacted

def hash_field(value: str, salt: str = "pharmaguard-salt") -> str:
    """One-way salted SHA-256 hash for verification without exposing PHI."""
    if not value:
        return ""
    salted = f"{value}:{salt}"
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()

def mask_value(value: str) -> str:
    """Partial masking of a string (e.g. John Doe -> Jo***oe)."""
    if not value or len(value) < 4:
        return "***"
    return f"{value[:2]}***{value[-2:]}"

def redact_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Ensures an event's extractedFields, enteredFields and screenText are fully redacted."""
    redacted = dict(event)
    
    if "extractedFields" in redacted and redacted["extractedFields"]:
        redacted["extractedFields"] = redact_fields(redacted["extractedFields"])
        
    if "enteredFields" in redacted and redacted["enteredFields"]:
        redacted["enteredFields"] = redact_fields(redacted["enteredFields"])
        
    if "screenText" in redacted and redacted["screenText"]:
        redacted["screenText"] = redact_text(redacted["screenText"])
        
    return redacted

def is_safe_for_transmission(event: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Verify that no un-redacted PHI keys exist in the event."""
    findings = []
    unsafe_keys = {"ssn", "socialsecurity", "dob", "dateofbirth", "patientname"}
    
    for field_type in ["extractedFields", "enteredFields"]:
        fields = event.get(field_type)
        if fields and isinstance(fields, dict):
            for k, v in fields.items():
                if k.lower() in unsafe_keys:
                    # If it doesn't contain the REDACTED marker, it's unsafe
                    if isinstance(v, str) and "[REDACTED" not in v:
                        findings.append(f"Unredacted field key '{k}' found in '{field_type}'")
                        
    if "screenText" in event and event["screenText"]:
        # Simple SSN or DOB regex check
        for pattern_name, pattern in PHI_REDACTION_PATTERNS.items():
            if pattern.search(event["screenText"]):
                findings.append(f"Potential raw PHI pattern '{pattern_name}' found in screenText")
                
    return len(findings) == 0, findings
