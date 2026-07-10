# Insurance Rule: Prior Authorization Criteria

## Purpose
This document defines mock insurance rules for prior authorization and quantity limits in the demo environment.

## Prior Authorization Medications
The following medications require prior authorization before dispensing:

- Adderall
- Ozempic
- Lyrica
- Humira
- Remicade
- Vyvanse
- Cymbalta

## Quantity Limits
Insurance plans may impose quantity limits. If a prescribed quantity exceeds the plan limit, prior authorization is required.

Example limits (mock):
- Atorvastatin: max 90 per fill
- Lisinopril: max 30 per fill
- Metformin: max 60 per fill

## Missing Insurance
- Missing insurance profile requires staff review.
- Missing insurance member ID should be flagged.
- Inactive insurance should be flagged for verification.

## Review Triggers
- Medication on prior auth list: Route to prior authorization required.
- Quantity above plan limit: Route to prior authorization required.
- Missing insurance info: Flag for staff review.
