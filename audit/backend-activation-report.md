# Backend Activation Report

**Status:** BACKEND VALIDATION BLOCKED
**Reviewed:** 15 July 2026
**Branch:** `backend/activate-forms-portal-sql`

## A. Current state

The approved generated public site remains live on GitHub Pages. The candidate
adds the existing Node runtime, canonical data services and protected portal
delivery without redesigning the public experience. Node.js 24 is the supported
runtime; SQLite is used only for isolated local validation and Azure SQL remains
the managed target.

## B. Screenshot and outage cause

GitHub Pages returns a branded `404` for `/api/security/csrf` because it cannot
execute `server.mjs`. Contact and account forms therefore use their explicit
outage fallback, while portal login reports the unavailable API. The public
pages and locked shells themselves return `200`.

## C. Release state

The candidate is isolated on `backend/activate-forms-portal-sql`. A draft pull
request is required and must remain unmerged until the owner reviews the final
head and its workflows.

## D. Backend hosting

Azure App Service for Linux is the documented production target. App Service F1
or Container Apps Consumption may be used only for a synthetic validation
environment after the portal confirms zero out-of-pocket eligibility. The
application binds to the platform port and `0.0.0.0`, exposes separate liveness
and readiness checks, and keeps private files outside public routing.

## E. Azure status

Azure CLI is installed but has no authenticated account or visible subscription.
No offer, spending limit, credit balance or SQL free-offer eligibility can be
verified without the owner's interactive sign-in. No resource was provisioned.

## F. SQL and reporting

Three ordered Azure SQL migrations define the canonical transactional schema,
activation additions, immutable application history, constraints and indexes.
Nine reporting views expose current leads, application pipeline, notification
delivery, daily activity, campaign attribution, active portal users, security
events, document quarantine and account activation. A dedicated reporting role
has view-only `SELECT` grants.

## G. Migration

The SQLite-to-Azure workflow excludes local credentials and sessions, preserves
stable identifiers and reconciles record counts and constraints. Static Azure
SQL migration validation passed. A real Azure SQL schema deployment, data import,
reconciliation and restore are pending the owner-controlled subscription gate.

## H. Contact workflow

The backend issues `NP-LEAD` references, persists the exact submitted message,
records consent and allowlisted attribution, rejects patient/adverse-event
content, enforces CSRF, validation, honeypot, duplicate and rate controls, and
queues internal and acknowledgement email without rolling back a valid record on
provider failure. Chromium and WebKit submission/review tests passed.

## I. Account application and uploads

The four-stage accessible application creates one idempotent application record,
uses hashed short-lived upload/resume grants, limits ten files, validates MIME,
extension and signature, rejects dangerous Office content and supports retry of
only failed uploads. Local files remain blocked as `scan_not_configured`; Azure
files remain quarantined until a clean scan result. Submission, upload and admin
review passed in Chromium and WebKit using synthetic data.

## J. Transactional email

The durable SQL outbox supports Resend and Microsoft Graph, plain-text and HTML
messages, bounded retries, stale-worker recovery, blocked states and authorised
administrator replay. Resend supplies provider idempotency; Graph is documented
as at-least-once. No provider credential or real recipient was configured.

## K. Identity and portals

Customer, employee, board and administrator scopes are enforced server-side.
The Vishal administrator model retains all four scopes. Workforce Entra and
External ID invitation mapping are implemented and fail closed when unconfigured;
real tenant registrations, consent and MFA testing remain pending.

## L. Administrator workflow

The private dashboard now shows lead and application details, exact enquiry
messages, document states, immutable status history, controlled transitions,
separate approved-customer activation, notification replay and session
revocation. Rendering uses text nodes rather than HTML injection.

## M. Backup and restore

Consistent SQLite backup, integrity verification, atomic isolated restore,
restrictive file permissions and reopen persistence passed. Azure SQL
point-in-time restore and private document restoration have not been executed.

## N. Security

`npm run check`, production dependency audit, repository scan, Gitleaks directory
scan and 179-commit reachable-history scan passed. Authentication, authorisation,
CSRF, lockout, rate limits, customer isolation, private files, session restart,
secret resolution, upload quarantine and scan state tests passed. No independent
penetration test or live Azure security assessment is claimed.

## O. Browser and accessibility

Chromium and WebKit rendered 616 page states across seven required viewports,
producing 764 screenshots and 616 Axe scans with zero final issues. The functional
contact/application/admin workflow also passed in both engines. Full WCAG 2.2 AA
conformance is not claimed without independent manual assistive-technology review.

## P. Cost

No Azure resource or paid third-party service was created. This repository work
incurred no Azure charge. Zero-cost Azure eligibility cannot be asserted until
the owner signs in and the actual subscription offer and cost controls are read.

## Q. Validation URL

No Azure validation URL exists. Local evidence used `127.0.0.1` with synthetic
credentials and data. The public production domain remains on GitHub Pages.

## R. Cutover

Production cutover is pending Azure validation, Entra, email, SharePoint least
privilege, Azure SQL/Blob restore tests, independent security review and explicit
owner approval. DNS and GitHub Pages were not changed.

## S. Owner-controlled actions

The owner must complete interactive Azure subscription selection and cost checks,
protected secret entry, Entra/External ID registration and consent, Microsoft
Graph sender and SharePoint permission approval. After that, Codex can execute the
staging migration, hosted acceptance, restore drill and release checks. Secrets
must never be pasted into chat.
