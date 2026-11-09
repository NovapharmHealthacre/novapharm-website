# Private Medicines Terminal | Production evidence gate

**9 November 2026. Status: NOT VERIFIED LIVE.**

The public Technology page is a product preview, not the authorised Medicines Terminal. The separately deployed https://portal.novapharmhealthcare.com/ must pass the live gate before any customer account, subscription, source record or NOVA inference is described as operational.

## Anonymous checks must fail closed

The production activation workflow must resolve portal DNS and obtain an HTTPS protected response bearing X-Robots-Tag: noindex. It must issue unauthenticated GET requests to each route:

- /gateway/v1/intelligence/regulatory/us/fda-labels?drug=apixaban
- /gateway/v1/intelligence/evidence/us/clinical-trials?intervention=apixaban
- /gateway/v1/intelligence/readiness

For each require HTTP 401 or 403, not 200 or a public demo redirect, plus Cache-Control: no-store. No credentials, patient details or confidential data in probes. Missing DNS or API is NOT a passing security test.

## Beyond anonymous smoke

Production acceptance separately requires an OIDC/MFA board session, server-scoped revocation, logout, negative cross-tenant and cross-user authorisation tests, accepted actual medicine data and rights, NOVA model and residency permissions, monitoring and alerting, load, backup/restore and rollback.

The exact deployed GitHub main commit and immutable image digest must match independently accepted release evidence. A healthy isolated staging Fargate task does not prove live HTTPS ingress or customer billing.

Tracked in issue #176.
