## Free-plan project safety gate (6 November 2026)

The existing `aws-staging-foundation.yml` staging workflow requires the account's **FREE/ACTIVE** plan state and project account identity before either preflight or provisioning can pass. `scripts/aws/check-free-plan.mjs` enforces an initial conservative reserve of at least USD 25 in remaining AWS credits and at least 14 days before trial expiration. If current AWS account access, Free Tier API permission, actual credits, expiration, account plan, or service availability cannot be verified, the run fails closed.

This is not a spending cap or a guarantee the plan supports ECS/ECR/RDS SQL Server. AWS Free plan expires after six months or consumed credits and is unsuitable as the sole permanent production system. Budget alerts are not a hard stop. Provisioning continues to require separate environment review and `AWS_STAGING_SPEND_APPROVED=true`. Do not upgrade to PAID automatically. Before deployment, obtain an exact regional price estimate and verify each service can be deployed under the account's current plan.

AWS Free Tier billing APIs are queried in `us-east-1`; application regional resources stay in `eu-north-1`. The run intentionally does not print the raw Free Tier account response into the job log. Validate safety with `node --test scripts/aws/check-free-plan.test.mjs`.

# NovaPharm | AWS migration and acceptance contract

**Date:** 6 November 2026  
**Target:** AWS **new experience project** in **eu-north-1 (Stockholm)**.  
**Source of truth:** current GitHub main + a reviewed, exact-SHA staging PR.  
**Status:** AWS foundation authored; no verified AWS project credentials, paid plan, managed deployment, application cutover, or real database/document transfer in this review.

## Architecture and release boundaries

The current six-app model is retained rather than combining public and private systems.

| Existing Azure workload | AWS target | State / critical conditions |
| --- | --- | --- |
| Corporate Next.js | isolated ECS Fargate service behind approved HTTPS entry | Planned; public-only GitHub Pages remains the live fallback |
| Technology Next.js | independent ECS Fargate service | Planned; independent release and images |
| Founder Next.js | independent ECS Fargate service | Planned; independent release and identities |
| Status Next.js | independent ECS Fargate service | Planned; may report health only without exporting protected data |
| Portal Next.js | isolated authenticated ECS Fargate service | **Not activated**; verify AWS Cognito/OIDC JWT and owner/customer role authorization before exposing |
| API Node | isolated ECS Fargate service | AWS RDS SQL adapter added; database, email, health checks and security tests are NOT yet accepted |

Database: Keep the SQL Server dialect rather than rewriting pharmaceutical schema and governed ledgers to PostgreSQL without migration assurance. `src/data/providers/aws-rds-sql.mjs` adds an opt-in provider for private RDS **Microsoft SQL Server** with mandatory encrypted connections and certificate validation, in `eu-north-1` only. The existing `database/azure/*.sql` files are T-SQL; reuse must be tested against the **actual** RDS SQL edition/version, including migration and rollback. For production, inject `AWS_RDS_SQL_PASSWORD` from a protected Secrets Manager secret into the isolated API task only. RDS Microsoft SQL Server incurs licensing and infrastructure charges. This phase does not create an RDS database or run migrations.

Private documents: `infra/aws/foundation.json` provisions private, versioned, encrypted S3 document/quarantine buckets, **not a production malware scanner**. Until independent S3 scan-result verification, least-privilege task roles, object copy/metadata integrity, backup and retention are signed off, set `DOCUMENT_STORAGE_PROVIDER=disabled` for AWS production; the API must reject document submissions. The scan-events pipeline still contains Azure-specific logic and must be ported before uploads can work. Never mark unknown/pending scans clean.

Authentication: Existing App Service-provided `x-ms-client-principal` headers are **not** trustworthy on AWS and are explicitly ignored by the source when `NOVAPHARM_CLOUD_PLATFORM=aws`. A signed, issuer/audience-verified Cognito/OIDC trust chain, per-role mapping, MFA and negative testing are separate release blockers. Keeping an Entra identity provider is possible as a federated OIDC source, but must not mean trusting copied headers. Never enable customer logins or publish private portal routes based on a link alone.

Email: existing Resend/Microsoft Graph provider integrations require accepted outbound sender, protected credentials, durable records, receipts and idempotency. Evaluate AWS SES in the project only after sender-domain authority, bounce/complaint paths, GDPR and operational approval. Contact forms remain the public-only email fallback until verified managed API end-to-end evidence exists.

Monitoring: ECS task logs feed CloudWatch Logs; filter PII, medicine records, credentials and document bodies. AWS CloudTrail, alarms, tracing, privacy and retention require configured and tested managed services. Azure Monitor config must never be mistaken for AWS observability.

## Foundation implemented in GitHub

- `infra/aws/foundation.json`: region-locked CloudFormation with one staging/production-named ECS cluster, six private immutable ECR repositories with scan-on-push, six log groups, separate private versioned S3 quarantine/document buckets, TLS-deny bucket policies and safe Retain deletion policies.
- `scripts/aws/validate-migration-foundation.mjs`: offline invariant checks; `scripts/aws/aws-migration.test.mjs`: negative tests.
- `.github/workflows/aws-migration-contract.yml`: PR-time offline checks, no AWS credentials needed.
- `.github/workflows/aws-staging-foundation.yml`: explicit, GitHub-environment-approved, OIDC-backed **manual** staging preflight/provisioning. No automatic DNS switch, database, portal, task deployment or production provisioning.
- `AGENTS.md`: AWS new-experience rules; approved NovaPharm instructions remain higher priority.
- Legacy Azure automatic deployment dispatch **disabled**, and manual Azure deploy job suspended, while its source remains available in Git history for rollback.

**Preflight does not verify that a service is working.** For the new AWS experience, verify plan and service availability first. Some managed features may require Paid Plan or activation of advanced AWS features. AWS Agent Toolkit uses `us-east-1` for its own service, but **regional business resources are never deployed there**.

## One-time AWS project and developer prerequisites (outside GitHub)

1. In AWS Settings > Project > Overview > Additional Info, confirm project Region is `eu-north-1`; review Free/Paid plan and spend limit in AWS Settings > Billing.
2. On a trusted local Mac, install AWS CLI v2 and `uv` per AWS's official Agent Toolkit setup; choose an AWS CLI profile. Example profile name `novapharm-aws` is **not** an installed/verified identity.
3. Authenticate locally through `aws login --region eu-north-1 --profile novapharm-aws`; do not paste access keys, secret access keys or browser codes into GitHub or chat. Verify using `aws sts get-caller-identity --profile novapharm-aws`.
4. Run `aws configure agent-toolkit --yes --region us-east-1 --profile novapharm-aws`; configure `AWS_MCP_PROXY_PROFILES=novapharm-aws` in each generated MCP entry without modifying unrelated entries; verify `aws agent-toolkit list-available-skills --region us-east-1 --profile novapharm-aws`.
5. In the AWS project, create a GitHub OIDC IAM role restricted to the exact `NovapharmHealthacre/novapharm-website` repository and the `aws-staging` GitHub environment, with minimum CloudFormation/ECS/ECR/S3/CloudWatch permissions for the foundation. Trust only `token.actions.githubusercontent.com` with `aud=sts.amazonaws.com`. Set GitHub environment protection for `aws-staging`, with reviewers.
6. Set GitHub **environment variables**, not credentials: `AWS_PROJECT_ACCOUNT_ID` (12 digits), `AWS_GITHUB_STAGING_ROLE_ARN` (the reviewed IAM role ARN). Do not store static AWS keys in secrets.
7. Review CloudFormation costs, privacy, data classification, identity and ownership; invoke manual `aws-staging-foundation` preflight at reviewed main SHA. Only separately approve `provision-staging` if plan and budget allow. Provisioning additionally requires the protected GitHub environment variable `AWS_STAGING_SPEND_APPROVED=true` and explicit `confirm_spend_authorized=true` input from the operator.

**Never** run the foundation against production as part of this initial migration. The foundation itself does not launch containers or transfer business records.

## AWS runtime env (API only after required gates)

```ini
NOVAPHARM_CLOUD_PLATFORM=aws
AWS_REGION=eu-north-1
DATABASE_PROVIDER=aws-rds-sql
AWS_RDS_SQL_HOST=<actual-private-rds-sql-endpoint-in-eu-north-1>
AWS_RDS_SQL_DATABASE=NovaPharm
AWS_RDS_SQL_USERNAME=<least-privilege-database-login>
# AWS_RDS_SQL_PASSWORD must come from AWS Secrets Manager, never git
AWS_RDS_SQL_RUN_MIGRATIONS=false
DOCUMENT_STORAGE_PROVIDER=disabled
ENTRA_AUTH_ENABLED=false
```

The portal remains **not authenticated** until a separately verified AWS identity implementation exists. The `PUBLIC_ORIGIN`, `PUBLIC_API_ORIGIN`, and `PORTAL_ORIGIN` must continue as three distinct HTTPS origins. Keep public applications from receiving SQL, email or document secrets.

## No-cutover gates (all mandatory)

1. **AWS project identity and plan:** account ID, Region, owner approval, Paid Plan/spend limits, service quotas, cost model.
2. **Network:** VPC subnet zoning, ALB HTTPS, least-privilege security groups, private endpoints, egress controls, regional WAF capability.
3. **Six applications:** independently tagged container images, reproducible builds, immutable SHA digests, ECS services/tasks, private/public access boundaries, health checks, rolling deployment/rollback.
4. **Data:** a signed source data inventory, consistent snapshot, RDS SQL edition compatibility, DDL/index tests, restore rehearsal, immutable transfer checksum, replication or freeze strategy, no data loss.
5. **Documents:** S3 task-role isolation, private object access, malware scan and quarantine promotion, event destination migration, denial tests, audit and backups.
6. **Identity:** Cognito/OIDC, cryptographic token validation, trusted identity boundary, MFA, role claims, customer provisioning, access expiry, session controls, independent penetration/negative tests.
7. **Messaging:** secure validated form -> durable row -> outbound email receipt -> monitor/audit; demonstrate controlled synthetic end-to-end submission in AWS staging.
8. **Security:** no critical/high production dependency vulnerabilities, least privilege, secrets rotation, TLS certificates, CSP/CORS/CSRF, audit logs and recovery drill.
9. **QA:** Chromium/WebKit/Firefox mobile and desktop, WCAG 2.2 AA, route inventory, performance, SEO/structured data and medicine-claim proofing on exact SHA.
10. **Cutover:** owner-authorised DNS/TLS changes only after two-sided rollback, staged freeze plan, continuous status checks and confirmed production acceptance.

AWS migration completion and public website completeness are separate acceptance decisions. **No 100% claim without observable evidence.**

## Official reference

- AWS Agent Toolkit: https://github.com/aws/agent-toolkit-for-aws/blob/main/setup-instructions/setup.md
- AWS new experience restrictions: https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html
- Project Region: https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html
- GitHub OIDC: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html
- Amazon ECS task roles: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-iam-role-overview.html
- RDS SQL Server: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_SQLServer.html
