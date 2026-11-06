# Project Phoenix | AWS Free-plan staging infrastructure deployment evidence

Date: 2026-11-06 UTC. The following evidence was obtained directly from authenticated AWS Core API calls, not inferred from repository source.

## Provenance

- Source: draft PR #85, `feat/aws-migration-foundation-eu-north-1-20261106`; CloudFormation source `infra/aws/foundation.json`, validated against the live AWS CloudFormation `ValidateTemplate` API.
- Account: NovaPharm's authenticated active Free-plan account (account number withheld from this public repository).
- Region: `eu-north-1`. Free-plan account status API queried independently in `us-east-1`.
- Initial Free-plan state: `FREE / ACTIVE`, US$100 credits reported remaining, expiration 2027-05-06. Credits and billing are dynamic: this is not an ongoing spend guarantee.
- CloudFormation stack: `novapharm-staging-foundation`, change set `phoenix-free-trial-staging-20261106`.
- CloudFormation change set was created, inspected, then executed.
- Subsequent `DescribeStacks` returned **CREATE_COMPLETE**.
- `ListStackResources` returned **17 resources, all CREATE_COMPLETE**.
- Independent resource discovery returned: 6 ECR repositories, 1 ECS cluster, 2 S3 buckets, 6 CloudWatch log groups, 2 bucket policies.
- Both S3 buckets independently passed `GetPublicAccessBlock` (all four flags true), `GetBucketEncryption` (AES256), `GetBucketVersioning` (Enabled) and `GetBucketOwnershipControls` (BucketOwnerEnforced).
- Before the deployment, AWS inventory returned 0 stacks, 0 ECS clusters, 0 ECR repositories and 0 S3 buckets.

## Scope limitations and next gates

**This is an infrastructure foundation, not a complete migration.** No ECS service, container image, ALB, public DNS, TLS custom domain, production site, RDS instance, Cognito authentication, SES contact workflow, customer data migration, pharma data import or live business portal was deployed.

The AWS authentication credential originated from the AWS Core connector's delegated session. No AWS CLI profile, GitHub OIDC deploy role, GitHub environment, DNS ownership or external secret was created.

Production readiness remains **blocked** by Issue #84's production dependency security audit, Issue #55's managed acceptance gates, unreconciled migrations, application/backend runtime tests and owner-controlled cutover. Existing GitHub Pages production and historical Azure work must remain intact.

Free-plan use is only permissible within its actual current limits and verified budget: the deployed foundation may carry usage-based charges as content/images/logs are added. Continuous billing monitoring, trial expiry planning and explicit production continuity decisions remain mandatory.

## Subsequent minimum verification

1. Check resource drift and encryption/public-access policies after changes.
2. Verify ECR image tags, scan results and environment isolation before uploading images.
3. Configure a tightly scoped, approved GitHub OIDC deployment role and protected staging environment.
4. Resolve production dependency vulnerabilities, retest all six application builds and staging acceptance.
5. Add runtime compute/network/database only after validated price, quotas, consent and privacy restrictions.
6. Reassess trial credits and region availability before each billable deployment.
7. Keep all DNS/prod and patient-identifiable data untouched until explicit acceptance.

This document records AWS observations at the time of the session; it is **not** a claim of 100% production completion.

## 6 November follow-up control inspection (read-only AWS calls)

- Authenticated `DescribeStacks`: `novapharm-staging-foundation` remains `CREATE_COMPLETE`.
- `DescribeRepositories`: **6/6 ECR repositories** have `scanOnPush=true`, `imageTagMutability=IMMUTABLE` and `AES256` encryption. This does **not** establish that any images were built, scanned or deployed.
- `DescribeLogGroups`: **6/6 CloudWatch log groups** have `retentionInDays=30`. These are empty-capable log destinations, not evidence of production telemetry.
- `DescribeTrails` in `eu-north-1`: **no configured CloudTrail trails returned**. This must remain an explicit account-level audit/incident-response gap. CloudTrail event history may provide limited default lookup, but does not substitute for a configured, governed, retained organizational audit trail.
- `GetAccountPlanState`: **FREE / ACTIVE**, with US$100 remaining credits and expiry **2027-05-06** at observation time. Recheck immediately before every spend-capable operation.

**Security disposition:** CloudTrail account logging, AWS budgets/alerts, least-privilege deployment IAM, runtime networking, identity, threat monitoring, backup recovery, and security incident routing remain **not production accepted**. Do not assume unavailable or premium AWS controls are enabled within the Free-plan trial. Do not create paid controls or modify permissions without reviewing current entitlement, price and rollback.
