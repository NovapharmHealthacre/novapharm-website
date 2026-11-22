# FDA isolated quota datastore — default-off source candidate
22 November 2026. **Not deployed. No production release approval.**

## Read-only AWS findings
In `eu-north-1`, ListTables returned 15 existing tables and none was an FDA-specific atomic quota table. The existing private HTTP API still has IAM catch-all, with no FDA-specific JWT route. No dedicated native Cognito clients, scope or board group were found. **Do not repurpose any existing customer, billing or commerce table.**

## Proposal
`infra/aws/fda-isolated-quota-approval.cfn.json` proposes **one** new DynamoDB table with:
- `PK` (string partition key) and `SK` (string sort key) exactly matching the existing atomic `UpdateItem` quota contract.
- DynamoDB on-demand billing (NOT free), server-side encryption, TTL on `ttlEpoch`, and retained resources on deletion/replacement.
- Every deployment gate default false: owner production signoff, quota provisioning, independent security/IAM approval, approved budget, and independent release acceptance. The table name defaults to `UNAPPROVED`. **All six conditions must pass** for creation.
- No new principal, IAM attachment, Lambda, API route, Cognito identity, secret or user data is created by this source template.

## Later independent work (not authorized here)
1. Approve actual table name, cost ceilings/budget alarms, and review DynamoDB TTL (best-effort asynchronous physical deletion; no guarantee of removal at expiry).
2. Independently create an exact table-ARN-scoped `dynamodb:UpdateItem` policy for the **qualified FDA-only Lambda execution role**, and enforce its isolation from all unrelated customer and commerce tables. Never grant `Scan`, `DeleteTable`, or wildcard resources.
3. Approve a properly rotated server-held HMAC secret with least-privileged retrieval and no logging. Do not embed it in this template or a client.
4. Validate the AWS SDK v3 version/handler and deploy only to a qualified, immutable Lambda alias, with the existing IAM catch-all untouched.
5. Verify quota atomicity under real concurrency; 429/503 and entitlement/role separation; alarms, billable usage, retention, and redacted logs.
6. Obtain FDA rights acceptance, signed native app credentials, real-device tests, and owner go-live consent before admitting any data or activating the JWT route.

## Evidence, not production acceptance
`node --test scripts/test-fda-isolated-quota-approval.mjs scripts/test-fda-dynamodb-quota.mjs`
and `cloudformation:ValidateTemplate` are **offline/source-only** checks. They do not create a table, charge AWS, grant IAM, or prove real service access.
