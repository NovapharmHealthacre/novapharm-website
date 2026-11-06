# MongoDB Atlas + AWS | NovaPharm staging integration and launch gate

As-built verification: 6 November 2026.

## Connected resources

- Atlas project: `Project 0`; cluster: `novapharm-staging`, **FREE** tier, provider **AWS**, region `EU_NORTH_1`, MongoDB 8.0.
- Database: `novapharm_staging`; collections: `contact_receipts_synthetic`, `portal_access_audit_synthetic`, `deployment_checks`. Creation and indexes were verified using the connected MongoDB Atlas service.
- Synthetic Atlas receipt was inserted and independently read back in `contact_receipts_synthetic`. It contains no real personal information or clinical data.
- Atlas DB user `novapharm_aws_staging` has only `readWrite` on `novapharm_staging` and is scoped to the staging cluster. **Credentials are stored only in AWS Secrets Manager** secret `novapharm/staging/mongodb-atlas` in `eu-north-1`. Never print/retrieve or commit the secret to GitHub.
- `integrations/mongodb-atlas/staging-contact-store.mjs` is the server-side, injected-client storage adapter. GitHub Actions execute its synthetic-only, acknowledgement and fail-closed unit tests.
- Existing AWS API Gateway/Lambda/DynamoDB synthetic contact service is running separately. **It has NOT been switched to Atlas**, and no real contact submission is enabled.

## Mandatory network and runtime blockers

1. **Atlas IP access list contains zero entries**. The privileged ChatGPT Atlas connector can inspect/write the cluster, but **does not prove that AWS Lambda or an ECS task can reach MongoDB over TLS**. Do not add `0.0.0.0/0`, trust transient Lambda public IPs, or put the Atlas URI/credentials in the browser.
2. Select a controlled **fixed egress IP** or secure private network arrangement that supports the Atlas tier and AWS Free-plan restrictions. MongoDB Atlas free tier may not support the PrivateLink architecture that paid clusters support. Fixed-egress NAT can create hourly/data processing charges outside Free Plan credits; require a cost/quotas/security review before provisioning. Keep the zero-entry allowlist while access architecture is undecided.
3. The AWS project explicitly denied IAM OIDC provider inspection under a service-control policy. Existing `aws-staging` CI provisioning cannot be treated as authenticated deployment proof until GitHub-to-AWS trust is demonstrated. Do not introduce static AWS keys or unrestricted service roles.
4. Build the server runtime with the official, pinned MongoDB Node driver, verify packaging and the appropriate Secrets Manager retrieval role, and use only TLS URI/approved DNS. Reuse the MongoClient across Lambda invocations instead of opening per-request connections. Match pool settings to measured load; do not invent production concurrency.
5. Establish database-level JSON Schema validation, a TTL index on `expiresAt` with **BSON Date** values and `expireAfterSeconds: 0`, collection-level permissions, audit evidence, backup/restore, expiry and recovery checks before handling real personal/customer data. The connected Atlas `create_index` action currently only supports index key definitions and has **not** created the TTL expiry policy.
6. Preserve the current public email-only contact until a real test demonstrates: managed HTTPS form → authenticated anti-abuse/CSRF checks → database durable acknowledgement → mail provider accepted delivery → inbox receipt. The SES production-sending request remains DENIED; DKIM pending. Microsoft Graph may be an alternative only with an approved service app and protected credentials.
7. Existing Microsoft Entra P1 MFA remains the workforce authority. The Cognito staging user pool is not federated: no identity providers, no app clients. Production portal logins and user roles remain unavailable. A MongoDB database does **not** replace Entra or provide identity security.

## Acceptance

The Atlas database cluster is live, and the Atlas client-side data operations and schema adapter tests have succeeded. **The AWS-to-Atlas application connection and the public contact/portal are not live or accepted.** Do not claim otherwise or switch public DNS, enable public intake, or enable an unverified credential form.

## Provider responsibilities

Atlas offers a managed document store, not a substitute for signed backend identity, MFA, production email authorization, privacy controls, managed application hosting or durable recovery testing. AWS Free credits do not remove external Atlas tier and network limitations.
