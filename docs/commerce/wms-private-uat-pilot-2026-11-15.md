# NovaPharm Distribution — private user acceptance pilot (UAT)

**Date:** 15 November 2026  
**Goal:** Invite a small known group to sign into a non-production Distribution portal, explore 16 workspaces, mark working / not working / needs improvement, and submit reproducible observations.

## Implemented in repository

1. `src/core/wms-pilot-feedback.mjs` — one durable current report per tester/workspace, with append-only audit events for each update. A tester can read only their own observations; there is no cross-user listing API.
2. `database/sqlite/011_distribution_pilot_feedback.sql` and `database/azure/011_distribution_pilot_feedback.sql` — versioned, bounded feedback schema independent of stock, shipments, quality cases, payment and customer records.
3. `server.mjs` — GET and CSRF-protected POST `/api/enterprise/wms/pilot-feedback`, requiring an authenticated employee session. POST is rate-limited.
4. `apps/portal/app/gateway/[...path]/route.ts` — allows only the exact pilot feedback path through the authenticated same-origin gateway.
5. `apps/portal/components/wms-pilot-feedback-panel.tsx` — workspace selector, outcome, short technical note and per-tester status table. Mounted below the existing `employee.warehouse` control tower and 16-workspace directory.
6. Automated backend, front-end and negative-security tests.

## Pilot activation — default deny

The following must be configured on a **dedicated, isolated pilot runtime** after security review:

```
WMS_PILOT_FEEDBACK_ENABLED=true
WMS_PILOT_DATA_MODE=synthetic
WMS_PILOT_ALLOWLIST=<comma-separated exact approved staging usernames>
```

Never commit real usernames or passwords to this repository. Put them in runtime secrets/environment config via the approved deployment method. If any variable is missing, feedback GET/POST is unavailable. A user-supplied query string or browser storage cannot activate the feature.

Staging employee accounts must have individually verified credentials and server-side role-scoped sessions, enforced password-change/MFA policies and effective revocation. Do not share one test account between people or grant friends production employee access. **All data in this pilot must be synthetic and non-confidential.**

Do not enable these flags on the current Nutraxin staging BFF. Do not remap `portal.novapharmhealthcare.com` until a dedicated secure unified portal runtime passes issue #601.

## Five-step participant script

1. Sign in to the approved pilot URL, with your own account. Check that unauthenticated access and the wrong role cannot reach the WMS.
2. Open **Warehouse & Inventory**, inspect source authority notices, charts, exceptions and the 16-workspace directory.
3. Follow the linked product, purchasing, order, quality, finance and administration read-only views. Do not enter actual customer, patient, medicine supply, warehouse, payroll or payment data.
4. Choose a workspace and report **Working**, **Not working** or **Needs improvement**, with steps taken and actual result. Do not enter credentials, personal details, URLs or patient information.
5. Revisit the same workspace after a build and update the result. One current record per tester/workspace supports an evolving UAT matrix; server audit trails preserve report changes.

## Acceptance criteria before issuing tester invitations

- Exact-head GitHub security, portal tests, TypeScript, production build and Chromium/WebKit checks are green.
- Dedicated deployment with HTTPS, a reachable private hostname, least-privilege credentialed pilot accounts, hardened cookie/session and CSRF controls.
- Accepted **durable staging database** with migration 011 applied, encrypted/backup protected and clearly separated from production data.
- Anonymous, cross-user, cross-role, revoked session, missing CSRF, disallowed account, non-synthetic-mode and malformed feedback requests all deny.
- Two distinct approved tester logins can independently submit, refresh, view and update their own reports. The owner/operator has a controlled review/export mechanism before UAT signoff; this PR does **not** invent an admin cross-user export endpoint.
- Verify no operational 3PL command, stock change, quality release, customer purchase, billing or external message occurs while testers navigate.

## Current deployment blocker

AWS staging private ECS `novapharm-staging-portal-private` is configured with zero desired tasks and no public ingress/customer credentials. The public `portal.novapharmhealthcare.com` hostname currently maps to HTTP API `wgy9p7ad0d`, Nutraxin staging BFF. These must not be conflated.

Issue [#601](https://github.com/NovapharmHealthacre/novapharm-website/issues/601) governs the dedicated persistent unified portal cutover. Issue [#664](https://github.com/NovapharmHealthacre/novapharm-website/issues/664) governs actual Polar Speed/UPS inventory and execution authority. Neither is resolved merely by committing this feature.

**Release classification:** development feature; no live URL or tester access can be claimed until above acceptance evidence exists.
