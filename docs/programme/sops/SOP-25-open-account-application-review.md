# SOP-25 — Open Account Application Review

Execution status: **REPOSITORY_EXECUTABLE_REHEARSAL_REQUIRED**

## Owner
Customer Operations Owner

## Purpose
Review each Open Account application as a controlled business case; approval never auto-provisions Portal access.

## Trigger
A managed-runtime account application has been canonically persisted.

## Prerequisites
1. Canonical application/case ID and audit trail.
2. Submitted documents remain in approved private quarantine until cleared.
3. Approved business/regulatory/credit review policy and named reviewers exist.

## Permissions
- Review/decision rights only; Identity activation is separate under SOP-13.

## Steps
1. Verify application identity, company details, completeness and canonical record.
2. Verify each attachment hash, quarantine/scanner status and authorized access.
3. Perform approved business, regulatory and credit checks; record source and reviewer.
4. Resolve duplicates against canonical customers without merging ambiguous entities.
5. Record approve/reject/request-information decision with owner and rationale.
6. On approval, create or resolve the canonical customer record only.
7. Invoke SOP-13 Customer Onboarding separately for identity invitation/linkage.
8. Notify through approved managed delivery and retain decision/audit evidence.

## Evidence
Application ID, document/scanner status, review sources, decision/owner/rationale, customer ID if approved, notification state and audit events.

## Stop Conditions
Malware status unknown; business/regulatory authority missing; duplicate identity unresolved; reviewer requests automatic Portal provisioning; private document access is not controlled.

A STOP condition keeps the application pending and access unprovisioned.

## Escalation
Customer Operations; Quality/Regulatory Owner for regulated concerns; Security Lead for upload/privacy issues.

## Rollback
Correct decision state through an audited review event; never delete the original application or evidence.

## Recovery
Resolve the blocker, re-run affected checks and continue from the canonical application rather than resubmitting or creating a second case.

## Review Cadence
Every application; quarterly procedure review once live.

### Authorities
- `docs/programme/section-29-document-register.md`
- `security/identity-and-access-model.md`
- `docs/programme/portal-api-migration-acceptance.md`

Repository procedure existence is **not** rehearsal or production acceptance evidence.
