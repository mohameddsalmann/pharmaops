import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pharmaguard_sdk.redaction import (
    redact_event,
    redact_fields,
    redact_text,
    is_safe_for_transmission,
)


class TestRedaction:
    def test_dob_redacted(self):
        text = "Patient DOB: 01/15/1990"
        redacted = redact_text(text)
        assert "01/15/1990" not in redacted
        assert "[REDACTED_DOB]" in redacted

    def test_phone_redacted(self):
        text = "Call patient at 555-123-4567"
        redacted = redact_text(text)
        assert "555-123-4567" not in redacted
        assert "[REDACTED_PHONE]" in redacted

    def test_email_redacted(self):
        text = "Email: john.doe@example.com"
        redacted = redact_text(text)
        assert "john.doe@example.com" not in redacted
        assert "[REDACTED_EMAIL]" in redacted

    def test_ssn_redacted(self):
        text = "SSN: 123-45-6789"
        redacted = redact_text(text)
        assert "123-45-6789" not in redacted
        assert "[REDACTED_SSN]" in redacted

    def test_rx_number_redacted(self):
        text = "Prescription RX-123456"
        redacted = redact_text(text)
        assert "RX-123456" not in redacted
        assert "[REDACTED_RX_NUMBER]" in redacted

    def test_patient_name_redacted_in_fields(self):
        fields = {"patientName": "John Doe", "medication": "Lisinopril"}
        redacted = redact_fields(fields)
        assert redacted["patientName"] == "[REDACTED_PATIENTNAME]"
        assert redacted["medication"] == "Lisinopril"

    def test_is_safe_for_transmission_false_for_unsafe(self):
        event = {
            "extractedFields": {"patientName": "John Doe", "ssn": "123-45-6789"},
        }
        safe, findings = is_safe_for_transmission(event)
        assert not safe
        assert len(findings) > 0

    def test_is_safe_for_transmission_true_for_redacted(self):
        event = {
            "extractedFields": {"patientName": "[REDACTED_PATIENTNAME]", "ssn": "[REDACTED_SSN]"},
        }
        safe, findings = is_safe_for_transmission(event)
        assert safe
        assert len(findings) == 0

    def test_nested_dict_handling(self):
        fields = {
            "patientInfo": {
                "patientName": "Jane Smith",
                "dob": "03/22/1985",
            },
            "medication": "Aspirin",
        }
        redacted = redact_fields(fields)
        assert redacted["patientInfo"]["patientName"] == "[REDACTED_PATIENTNAME]"
        assert redacted["medication"] == "Aspirin"

    def test_redact_event_full(self):
        event = {
            "screenName": "Patient Search",
            "screenText": "Found: John Doe, DOB 01/15/1990, SSN 123-45-6789",
            "extractedFields": {"patientName": "John Doe"},
            "enteredFields": {"medication": "Lisinopril"},
        }
        redacted = redact_event(event)
        assert "01/15/1990" not in redacted["screenText"]
        assert "123-45-6789" not in redacted["screenText"]
        assert redacted["extractedFields"]["patientName"] == "[REDACTED_PATIENTNAME]"
        assert redacted["enteredFields"]["medication"] == "Lisinopril"
