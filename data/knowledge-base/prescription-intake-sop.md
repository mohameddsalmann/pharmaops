# Pharmacy SOP: Prescription Intake Policy

## Purpose
This SOP defines the standard operating procedure for prescription intake in the demo pharmacy automation environment.

## Required Fields
Before workflow completion, the following fields must be present and validated:

- Patient name
- Date of birth (DOB)
- Medication name
- Strength
- Directions / Sig
- Quantity
- Refills
- Prescriber name

## Missing Field Handling
- Missing medication, directions, or DOB requires human review before processing continues.
- Missing patient name requires human review.
- Missing prescriber requires human review.
- Missing strength or quantity should be flagged as a warning and may require human review depending on severity.

## Source Type Handling
- eRx: Generally high confidence, automated processing acceptable.
- Fax: Variable quality, confidence scoring required. Low-confidence fax extractions must be routed to human review.
- Provider Portal: Medium confidence, validate all fields.
- Manual Entry: Human-entered data, lower automation risk but still requires field validation.

## Review Triggers
- Any critical missing field (medication, DOB, directions) must trigger human review.
- Multiple missing fields (2+) should trigger human review regardless of individual field severity.
- Low extraction confidence (< 0.75) must trigger human review.
