# NovaPharm founder private session | production deployment and acceptance

**Status:** source candidate, founder-session backend NOT deployed. Customer launch NOT approved by this feature.

## Owner intent and verified estate

The owner completed Cognito password and TOTP sign-in. Identity-only callback v24
verified real browser confirmation. Public customer access is separate and remains
off. The production DynamoDB `novapharm-intelligence-customer-access` ledger
in eu-north-1 is ACTIVE, PITR and TTL enabled, deletion protection ON; on
12 Nov 2026 it had zero accepted customer records.

This change creates a distinct **internal founder-shell** session, never a
production customer seat or a source-rights approval.

## Implemented source

- `infra/aws/intelligence-founder-session-api.py`: three private session endpoints.
  Real provider MFA configuration and exact GetUser are independently checked,
  session HMAC bridge is validated, strong DDB reads and conditional audited
  transaction writes are required. Short TTL 30 minutes, hashed secrets only.
- `src/core/intelligence-founder-private-session-bridge.mjs`: private
  server-to-server HMAC binding of both actual Cognito tokens, timestamp and
  nonce; rejects unexpected host cookie or entitlement response.
- `apps/portal/app/auth/callback/route.ts`: on successful founder-only
  verified identity, attempts gated founder session. Never calls customer
  acceptance or returns JWTs to browser. Flag OFF unless independently released.
- `apps/portal/app/founder/page.tsx`: server-verified founder shell with
  22 real workspace maturity states, no protected data or customer access.
- `apps/portal/components/founder-logout-button.tsx`: audited revocation.
- Exact-head Python, JavaScript and OIDC test suites; static types and workflow.

## AWS namespace and least privilege

The isolated IAM role
`novapharm-intelligence-founder-session-lambda` was created with a policy
allowing Cognito read-only MFA config and exact founder-account lookup on
user pool `eu-north-1_jBL6hCUE2`, plus DynamoDB GetItem and
TransactWriteItems restricted with `dynamodb:LeadingKeys` and `Null=false`
to `FOUNDER_SESSION#*`, `FOUNDER_NONCE#*` and `FOUNDER_AUDIT#*`
on the existing table. The policy does not allow writes to
`TENANT#`, `SUBJECT#`, `SESSION#`, `BILLING#`,
`GOVERNANCE#` or customer data.

**Do not expand this role to customer data or give the founder session
any `medicine-search` grant.**

## External AWS release tasks — not executed by this PR

The direct tool-driven Lambda deployment was blocked by a platform safety
control. That control was not bypassed. An authorised AWS deployment
operator must perform a normal reviewed release:

1. Package the **reviewed, tested, merged commit's** Python source as
   `lambda_function.py` (Python 3.13 with runtime boto3) in
   `novapharm-intelligence-founder-session`, using the above restricted IAM
   role. Do not create a Lambda function URL.
2. Configure a private `NPI_FOUNDER_BRIDGE_KEY` safely. It is the
   HMAC-SHA256 **hex** derivation of the existing OIDC transaction signing
   key using purpose string `novapharm-founder-session-bridge-v1`.
   Derive it **inside approved AWS secret handling**, never display,
   download, email or paste either key. The bridge value is NOT a customer
   payment key and must never appear in the browser.
3. Add narrowly scoped Lambda invocation permissions and these *exact*
   AWS HTTP API routes on `q2e6ztf8ic`:
   - `POST /founder/session` → founder Lambda, existing Cognito JWT
     authorizer `sxo21g`, with idToken+server bridge proof required.
   - `GET /founder/session` → founder Lambda with cookie validation.
   - `POST /founder/logout` → founder Lambda with same-origin checks.
   - `GET /founder` → the current `customer-identity-candidate` Lambda
     alias with exact path rewrite `/founder/`. It must not use the
     callback's `/auth/callback/` rewrite.
   All routes must have exact, current deployed API Gateway integrations;
   do not override existing callback, password recovery or MFA setup routes.
4. Run isolated negative tests: forged/bad JWT, absent bridge, replayed
   nonce, missing preferred TOTP, provider policy drift, duplicate
   sessions, expired session, cross-tenant records, unsupported Origin and
   logout revocation. Confirm no `TENANT#`, `SUBJECT#`, `BILLING#`
   or customer `SESSION#` writes.
5. Publish an exact-commit, vulnerability-scanned Lambda Web Adapter image
   containing the merged portal. Only then set
   `NPI_FOUNDER_SESSION_API_ENABLED=true` on **that immutable identity
   candidate**. Do not set `NPI_CUSTOMER_SESSION_API_ENABLED` or
   `NPI_CUSTOMER_ACCESS_ENABLED`.
6. Update only `customer-identity-candidate` to the verified identity
   version, preserving `private-acceptance` on its approved version (v15
   at this review). Keep prior identity version as rollback.
7. Verify a real founder password+TOTP sign-in receives the
   `Founder workspace ready` page and an opaque host-only cookie,
   `/founder/` opens with 22 honest workspace states, logout revokes the
   session, and a reopened old cookie returns 401. Confirm private medicine
   APIs remain denied. Record test timestamp and exact deployed SHA.

**Not complete until this evidence exists.** A successful internal founder
shell does not certify data licensing, 22 operational workspaces, clinical
decisions, payments, subscriptions or public customer access.
