# NovaPharm FDA — standalone private Lambda packaging (22 November 2026)

**Status: source candidate only. Production sign-off is `not_granted`.** No cloud service, IAM permission, Cognito OAuth scope, API route, table, native app client or DNS record is created by this packaging flow.

## Why this exists

The current private Intelligence Lambda runs a Next.js standalone portal image, not the repo-root `server.mjs`. Earlier FDA code merges could therefore never demonstrate that the running protected Lambda contained the new research handler. This package isolates the **actual FDA-only Node.js 22 handler** and its five public-source adapters for independent deployment review.

## Source-only archive

Run in GitHub Actions or a local Node 22 environment:

```bash
node --test scripts/test-fda-aws-lambda-entry.mjs scripts/test-fda-private-http-handler.mjs scripts/test-fda-dynamodb-quota.mjs
node scripts/build-fda-private-lambda-zip.mjs /tmp/npi-fda-source-only.zip
unzip -t /tmp/npi-fda-source-only.zip
unzip -Z1 /tmp/npi-fda-source-only.zip
```

The ZIP entrypoint is `index.handler`, intended runtime `nodejs22.x`, region `eu-north-1`. It contains only seven reviewed files: `index.mjs` plus six FDA handler/adapter files. There are no website assets, tokens, Lambda secrets, AWS credentials, Atlas data or PHI.

AWS documents that supported Node.js runtimes include the AWS SDK for JavaScript v3, but the bundled minor version can change. The Lambda operator must **qualify and record the exact runtime/SDK version** before deployment, or produce an independently scanned artifact with an explicitly locked SDK dependency. A passing ZIP build alone is not a production release.

## Defense-in-depth runtime gates

The new Lambda entrypoint refuses to import the AWS SDK or access DynamoDB/openFDA until all of the following environment switches are exactly `true`:
- `NPI_FDA_OWNER_PRODUCTION_SIGNOFF`
- `NPI_FDA_RELEASE_ENABLED`
- `NPI_FDA_SOURCE_RIGHTS_SIGNOFF`
- `NPI_FDA_INDEPENDENT_ACCEPTANCE`
- `NPI_FDA_QUOTA_TABLE_APPROVED`

The AWS and quota regions must both be `eu-north-1` and the quota table must be explicitly named. The underlying handler further requires a trusted API Gateway v2 JWT-authorizer context, Cognito **access** token, exact approved client, issuer, scope and board group, and an atomic HMAC-pseudonymized DynamoDB per-user quota. Missing/invalid dependencies fail with generic 503/403/429 replies, `no-store` and no credential disclosure. The existing IAM catch-all is not modified.

## What remains to qualify actual deployment

1. Independent owner approval to create/modify *production* resources and incur any potential paid AWS usage, retaining the current website safeguards.
2. Reviewed qualified Lambda image or ZIP alias, locked runtime/SDK version, minimum-privilege IAM and CloudWatch log retention.
3. Dedicated Cognito resource server `novapharm/fda.read`, approved board group and signed native clients with exact callback URLs, MFA and token revocation evidence.
4. Atomic DynamoDB quota datastore approved with dedicated PK/SK schema, TTL, isolation, IAM and budget checks.
5. Separate JWT-authorized **GET** FDA route and integration to the immutable qualified handler; IAM wildcard and existing public research Lambda remain untouched.
6. With real board and non-board accounts, verify all five source types, source failures/size/timeouts, 401/403/429/503, audit/monitoring, iPhone/iPad/Android signed-device tests and independent sign-offs.
7. FDA source-specific legal, identifier, provenance, refresh and data-admission approval; the 153 quarantined staging rows must remain segregated until genuinely accepted.

**Never activate or report 100% completion on the strength of an archive, emulator, synthetic test or CI result.**
