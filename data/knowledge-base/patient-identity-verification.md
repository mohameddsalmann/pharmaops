# Pharmacy SOP: Patient Identity Verification

## Purpose
This SOP defines the rules for verifying patient identity in the demo pharmacy automation environment.

## DOB Verification
- The date of birth on the prescription must match the date of birth in the patient profile.
- DOB mismatch requires pharmacist or staff verification before continuing.
- Missing DOB on either the prescription or patient profile requires human review.

## Name Verification
- The patient name on the prescription must match the patient profile name.
- Minor variations (middle initial, suffix) are acceptable.
- Significant name mismatch requires human review.
- Missing patient name on the prescription requires human review.

## Insurance ID Verification
- The insurance member ID on the prescription (if present) should match the patient profile insurance member ID.
- Insurance ID mismatch should be flagged for review.
- Missing insurance ID when insurance is required should be flagged.

## Review Triggers
- DOB mismatch: Must route to human review. This is a critical safety concern.
- Name mismatch: Must route to human review.
- Insurance ID mismatch: Should be flagged, may require human review.
- Missing DOB: Must route to human review.
