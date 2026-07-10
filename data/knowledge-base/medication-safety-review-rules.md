# Safety Rule: High-Risk Medication Review

## Purpose
This document defines the mock safety rules for high-risk medication review in the demo environment.

## High-Review Medications
The following medications are marked for additional pharmacist review:

- Warfarin
- Methotrexate
- Fentanyl
- Oxycodone
- Insulin

## Review Requirements
- Any prescription for a high-review medication must be flagged for pharmacist review.
- The system must not make clinical decisions about whether the medication is appropriate.
- The system should only flag the case for review based on the medication name appearing in the high-review list.

## Safety Constraints
- The system must not provide medical advice.
- The system must not recommend treatment changes.
- The system must not approve or deny clinical decisions.
- The system should only assist with workflow QA and exception routing.

## Review Triggers
- High-review medication prescribed: Flag as safety_review_required, route to human review.
- Missing information on a high-review medication prescription: Critical severity, route to human review immediately.
