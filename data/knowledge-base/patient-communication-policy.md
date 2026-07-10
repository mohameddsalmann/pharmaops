# Communication Policy: Patient Messaging Rules

## Purpose
This document defines the rules for AI-generated patient communication in the demo environment.

## Human Approval Required
- AI-generated messages require staff approval before sending.
- No AI-generated message may be sent to a patient without human review.
- The system must enforce requiresHumanApproval = true on all generated drafts.

## Content Restrictions
- Do not send diagnosis, treatment advice, or final medication approval without pharmacist confirmation.
- Do not claim medication is approved unless the case has been deterministically approved.
- Do not give medical advice in any patient message.
- Do not mention sensitive details unnecessarily.
- Do not recommend treatment changes.

## Message Types
- missing_information: Request missing patient information.
- prior_authorization: Inform patient that prior authorization is needed.
- review_pending: Inform patient that a pharmacist is reviewing their prescription.
- refill_status: Provide refill status update.
- general_update: General informational update.

## Safety Notes
Every generated message must include the safety note:
"Requires staff approval before sending."

## Review Triggers
- Any patient message draft must be flagged as communication_approval_required.
- Messages must not be sent automatically under any circumstances.
