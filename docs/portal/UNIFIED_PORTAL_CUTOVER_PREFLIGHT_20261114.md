# Unified NovaPharm portal — production cutover preflight

**Created:** 14 November 2026  
**Current state:** PRE-CUTOVER / BLOCKED. Source-only acceptance tooling, no AWS mutations.  
**Owner constraints:** No approved additional AWS/Atlas budget; vendor-neutral-first; no unapproved medicine-data admission, native vendor connection, customer billing, emails or customer access.

## Live facts independently observed during earlier AWS read-only checks

| Dimension | Observed status | Implication |
|---|---|---|
| Canonical hostname | `portal.novapharmhealthcare.com` maps to HTTP API `wgy9p7ad0d` (Nutraxin staging BFF) | Root 200 is **not** a unified workspace |
| Customer landing | `/portal/dashboard/` returned 404 on that host | Unified portal routing has not launched |
| Intelligence API | Separate `intelligence.novapharmhealthcare.com` maps to `q2e6ztf8ic` | Do not replace portal with Intelligence IAM catch-all |
| Existing private portal ECS | `novapharm-staging-portal-private`, desired tasks 0 / running tasks 0 | Private runtime inactive; activating tasks may incur charges |
| Customer-session service | CloudFormation output `CustomerAccessEnabled=false` | Customer authentication is not launched |
| Identity callback | Cognito web client callback is on Intelligence hostname only | Portal callback/cookie strategy requires explicit configuration and acceptance |
| Medicine data | Atlas rights grants and admitted medicine-evidence collections empty | No live medicine data release |
| Budget | Not approved | No paid capacity increase, DNS migration, or new paid backend |

These are *observations*, not secret values, legal approvals or a signed release record. Recheck shortly before any future change window.

## What this PR adds

- A **pure, source-only** `assessUnifiedPortalCutover` function and negative test suite; it cannot call AWS, mutate DNS, enable Fargate, grant sessions, or deploy a Lambda
- Checks for a candidate **dedicated unified portal ingress**, distinct from both Nutraxin staging and the Intelligence IAM catch-all
- Exact immutable image source/revision/digest, healthy runtime, durable and revocable server session, four real workspace/role/tenant tests
- Portal-host Cognito callback and cookie/MFA/CSRF acceptance
- Preserved Nutraxin ordering, rollback drill and separate finance, security and owner change decisions
- Explicitly disabled medicine-data release, billing and native vendor features for any initial bounded portal pilot

The evaluator's `evidenceComplete` property means only that a supplied **trusted, independent evidence packet** contains all required proofs. It **always returns** `deploymentAuthorised:false` and `productionLiveVerified:false`; no caller may use it as an API Gateway permission or authorisation token. No packet is currently supplied or accepted as fully approved.

## Workflow for a *future* approved launch

1. **Engineering:** create dedicated authenticated ingress and durable backend design; document exactly where transactions, sessions, orders and user/tenant permissions are persisted. Never treat a transient Lambda local SQLite database, marketing site or the staging Nutraxin BFF as the production system of record.
2. **Identity security owner:** configure correct `https://portal.novapharmhealthcare.com/auth/callback` and logout URIs, host-scoped secure cookies, MFA, CSRF, immediate revocation and RBAC. Execute real anonymous, wrong-role and cross-tenant negative tests and authorised-path positive tests.
3. **Four-workspace acceptance:** customer `/portal/dashboard/`; employee `/employee/dashboard/`; board `/portal/executive-platform/`; admin `/admin/dashboard/`. Verify the application loads only appropriate, real tenant-authorised documents and never synthesizes orders or approved medicines.
4. **Nutraxin commerce safety:** identify staging host consumers, preserve order and customer history with authorised routing/migration, prove no existing transactions are interrupted, test alternate route/fallback.
5. **FinOps/security/regulatory review:** obtain itemised costs, **explicit signed monthly and one-off caps**, independent security acceptance and the owner change approval. Drug data rights/billing/vendor features have their own separate approvals and remain OFF.
6. **Operator:** prepare backup, complete rollback drill, record original API mapping, exact runtime digest and outage/incident owners. Only execute a reversible host cutover within a separately authorised change window.
7. **Post-change:** separately verify real HTTPS/domain, callback and logout, four role routes, correct data, session revocation, tenant isolation, audit/alerts, preserved Nutraxin functionality and rollback availability. Revert immediately on any failure.

## Verification

```bash
node --check src/core/unified-portal-cutover-preflight.mjs
node --test scripts/test-unified-portal-cutover-preflight.mjs
```

See [issue #601](https://github.com/NovapharmHealthacre/novapharm-website/issues/601) for the live routing blocker. See [PR #603](https://github.com/NovapharmHealthacre/novapharm-website/pull/603) for the separate no-budget owner-policy safeguards.

**This document and CI are not a production launch, infrastructure provisioning approval or permission to process medicine or customer transactions.**
