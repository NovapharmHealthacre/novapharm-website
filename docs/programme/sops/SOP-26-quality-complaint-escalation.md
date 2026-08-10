# SOP-26 — Quality Complaint Escalation

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Quality Owner

## Purpose
Escalate quality complaints rapidly while preserving original evidence, product/batch context, ownership and audit.

## Trigger
A quality complaint is received or an enquiry is classified as a potential product-quality issue.

## Prerequisites
1. Canonical complaint record and correlation ID.
2. Qualified Quality Owner/on-call route.
3. Restricted evidence/document authority.

## Permissions
- Quality case handling only; safety/reportability decisions are not delegated to unqualified operators.

## Steps
1. Preserve the reporter's original wording and source timestamp.
2. Record product, batch/lot, quantity, customer/account and relevant supply-chain context without inventing missing facts.
3. Secure attachments/evidence in private quarantine/approved document authority.
4. Assign the qualified Quality Owner and severity/priority under approved policy.
5. If any adverse-event/safety indicator exists, invoke SOP-27 immediately; do not wait for the quality investigation to finish.
6. Preserve traceability to orders/deliveries/returns where authorized.
7. Record investigation actions, disposition and required follow-up as auditable events.

## Evidence
Complaint/correlation ID, preserved source statement, product/batch identifiers, owner, escalation timestamp, evidence hashes/locations and audit events.

## Stop Conditions
No qualified Quality Owner; evidence integrity uncertain; safety signal lacks a qualified path; cross-customer access; operator is asked to suppress/rewrite the original complaint.

A STOP condition preserves the case and escalates rather than closing it.

## Escalation
Qualified Quality Owner; invoke SOP-27 for safety/adverse-event indicators; Security Lead for privacy/integrity failure.

## Rollback
Reclassification/ownership corrections are audited; original complaint/evidence is never deleted or rewritten.

## Recovery
Restore missing evidence/ownership, reconcile canonical records and resume from the preserved complaint state.

## Review Cadence
Every escalated complaint; monthly trend review once live.

### Authorities
- `packages/portal-contracts/src/module-catalog.json`
- `docs/programme/operating-status-and-logistics-evidence.md`
- `docs/programme/security-governance-gates.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
