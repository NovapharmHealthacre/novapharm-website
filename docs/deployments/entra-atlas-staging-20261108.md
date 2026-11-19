# NovaPharm Entra P1 + Atlas integration — 8 November 2026

**State:** Staging foundation implemented. Not a production Secure Portal launch.

## Verified Entra broker, account 250675045172 / eu-north-1

- Workforce-only Cognito pool: `eu-north-1_dZRAEzkYa`; app client: `26al3v0so11731c1l1hglfa8d1`.
- Identity provider: `EntraP1`, OIDC issuer `https://login.microsoftonline.com/08811bc1-2d20-4fbb-bcb3-f02011e53b60/v2.0`.
- Cognito hosted domain `novapharm-staging-250675045172.auth.eu-north-1.amazoncognito.com` was independently verified `ACTIVE`.
- AWS attribute mapping updated and independently reread to `username → sub`, `email → email`, `name → name`. Existing OIDC issuer and server-side client-secret configuration were preserved; no secret copied into GitHub.
- Cognito pool says MFA `ON`, **not** proof of actual Entra Conditional Access MFA enforcement. Test with a real approved Entra user and sign-in logs.
- Client's **only** callback remains `http://localhost:4303/auth/callback/`. Do not add a public callback until an application-owned TLS endpoint actually serves the Next.js callback.
- Workforce PR #126 implements code exchange and server-side subject/role approvals, but is still DRAFT, conflicts with current `main`, and has not been accepted on production. Portal ECS service has zero running tasks and no public load balancer. All workforce/session feature flags remain default-OFF.

### Remaining Entra work in exact order

1. In [Microsoft Entra admin center](https://entra.microsoft.com), find the existing NovaPharm application's App registration and confirm that the **ID token contains the `email` and `name` claims** for the approved pilot member. Configure the optional email claim if not already emitted. Avoid sharing client secrets or tokens.
2. Apply a staff-specific Conditional Access policy that enforces MFA for the pilot account (exclude break-glass identities according to normal enterprise policy). Verify a real sign-in and sign-in logs. Cognito's local MFA setting is not a substitute for this test.
3. Reconcile PR #126 with latest `main`. Preserve the independently tested JWT issuer/audience/nonce/PKCE, provider identity, server-side HMAC, replay-blocking, exact subject approval and revocation tests. Do not trust an email address alone for role authorization.
4. Deploy an HTTPS staging Next.js portal and protected backend with durable, backed-up session persistence, scoped secrets, internal-only API networking, rate limits and logging. Use a **distinct workforce domain** from the public Nutraxin customer portal. Test the hosting and TLS route before altering Cognito client CallbackURLs and LogoutURLs.
5. Test employee login, admin/board denial, session expiry/replay, logout, Entra disable/revoke, missing email, wrong Entra tenant, mismatched approved subject, backup/restore, and release rollback. Only then approve activation.

## MongoDB Atlas: actual staging work completed

Connected via the Atlas management connector to existing project `6aede4d2bedcc3f04ecc6eb5`, cluster `novapharm-staging`, region `EU_NORTH_1`, Free tier, database `novapharm_staging`.

Existing collections (`deployment_checks`, `contact_receipts_synthetic`, `portal_access_audit_synthetic`) were inspected and **not altered**.

Created new, empty, staging-only collections:

- `nova_medicine_evidence_staging`
- `nova_ingestion_runs_staging`

Created and read back these indexes:

- Evidence: `workspace_medicine_observed_at` on `workspace_id, medicine_identity, observed_at DESC`
- Evidence: `workspace_source_provenance` on `workspace_id, source_id, source_version`
- Ingestion: `workspace_pipeline_started_at` on `workspace_id, pipeline_id, started_at DESC`

Both collections were verified to have **zero documents**. No customer, employee, patient or real commercial records were transferred. Indexes are ordinary indexes, not claimed unique or validated-schema constraints.

The source contract `src/data/atlas-evidence-staging.mjs` enforces an exact staging namespace, required workspace/medicine identifiers, five explicit evidence classes (Observed fact, Derived metric, Model forecast, Commercial assumption, Recommendation), bounded queries, provenance digest, and an allowlisted metadata-only record shape. It accepts an injected **read-only** Mongo collection and never opens a network connection itself. Negative tests cover operator injection, wrong workspaces, oversized limits and sensitive fields.

### Remaining Atlas work

- The application's live database abstraction `src/data/database.mjs` currently supports SQLite and Azure SQL. It does **not** implement MongoDB's query language, transactions or indexes, so **do not** set `DATABASE_PROVIDER=mongodb` or pretend sessions/approved accounts were migrated.
- The Atlas management connector works, but Atlas project IP access list is empty; this is **not** evidence that an AWS ECS container has network access.
- Approve private network access. On this Free tier, design a narrowly allowed, **fixed AWS outbound IP** and associated cost budget, or evaluate an Atlas tier supporting private connectivity. Never insert `0.0.0.0/0` just to pass a smoke check.
- Use Secrets Manager for least-privilege DB credentials (never source code or client JavaScript), pin official MongoDB Node driver with lockfile, enforce TLS, timeouts, connection pooling and per-workspace scoped queries.
- Add storage schema validation and unique idempotency constraints in the actual database; source-only checks are insufficient.
- Separately perform synthetic ECS-to-Atlas read/write tests, negative tenant-crossing tests, backup/restore and monitoring. A Free tier is not a production regulated transaction database by default.
- Keep SQL/DynamoDB as existing session/order/application systems until an approved, lossless migration is proven.

## Production release decision

**Customer accounts, staff MFA, orders, payments, and clinical/regulatory systems are NOT authorized by this change.** Do not merge draft identity migrations just to unblock a deployment check. Keep issues #55, #139, #135 open until exact-SHA production acceptance.
