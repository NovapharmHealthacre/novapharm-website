# Backend Activation Runbook

**Status:** Repository candidate implemented; Azure validation blocked at subscription login
**Reviewed:** 15 July 2026

## What becomes active

The Node runtime serves the existing generated public site and same-origin APIs
for contact, account application, private uploads, authentication, portals,
administrator review, email delivery and health. GitHub Pages remains live until
a separately approved production cutover because it cannot execute these APIs.

## Local controlled validation

1. Use Node.js 24 and `npm ci --ignore-scripts`.
2. Use a synthetic SQLite database outside the public directory.
3. Generate a random session secret and synthetic administrator password in a
   protected local credentials file; never place either in a command transcript.
4. Run `npm run check` and `npm run test:browser-acceptance`.
5. Use only synthetic enquiries, applications and documents.

## Azure validation gate

Before provisioning, the owner signs in interactively with `az login`, selects
the correct tenant/subscription, and verifies the actual offer, active spending
limit, remaining credit and Azure SQL **Free offer applied** screen. Stop if the
portal permits uncontrolled paid usage. Do not bind the production domains.

After the gate:

1. Deploy the isolated data template and App Service F1 template only if the
   portal confirms their zero-out-of-pocket eligibility.
2. Configure OIDC and protected GitHub Environment values.
3. Grant the temporary migration identity, run the three ordered migrations,
   then remove migration rights.
4. Configure private Blob containers and synthetic uploads.
5. Configure either a validation Graph sender or sandbox Resend credentials.
6. Configure synthetic workforce/customer identities and role mappings.
7. Verify `/api/health/live` and `/api/health/ready` on the Azure hostname.
8. Run the complete contact, application, upload, role, isolation, browser,
   accessibility, backup and restore acceptance suites.

## Production cutover gate

Production requires separate approval for paid capacity, provider credentials,
Entra/External ID, SharePoint least privilege, DNS and final data migration.
Record existing DNS, preserve all Microsoft 365 mail records, deploy a candidate,
verify HTTPS and same-origin cookies, then change only website records. Disable
GitHub Pages only after the Node application passes live acceptance. Roll back by
restoring the previous website records and retained database/application release.

## Health interpretation

- Liveness `200`: the process can answer; it does not prove integrations.
- Readiness `200`: database, migration, identity, private storage and email are
  ready. Any required dependency failure returns `503` with safe state names.
- Aggregate `/api/health`: compatibility endpoint; use readiness for deployment
  gates.
