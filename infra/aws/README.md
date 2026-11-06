# Project Phoenix | AWS public-only foundation candidate

**Status:** Source candidate only. Not deployed. Not production accepted.
**Observed default branch at authoring:** `c69cc186d898a0f05b0ef42e0107c036c55476f2` (6 November 2026).
**AWS project region:** `eu-north-1`. **New AWS experience.**
**CloudFront:** global edge; future ACM certificate for a custom CloudFront domain must be issued in `us-east-1`.
**Agent Toolkit:** its documented service endpoint is `us-east-1`, independent of the project workload region.

## Scope delivered in this candidate

- `infra/aws/public-site-foundation.json`: CloudFormation **development/staging only** private, versioned and encrypted S3 artifact bucket, CloudFront with origin access control, HTTPS-only viewers, scoped CloudFront-to-S3 read policy, static directory-index rewriting, and resource tags.
- `scripts/aws/validate-public-foundation.mjs`: dependency-free structural security guardrails.
- `.github/workflows/aws-public-foundation-check.yml`: source validation on PR and main updates, with no AWS credentials or write permissions.

This foundation hosts only an explicitly reviewed `PUBLIC_ONLY` artifact. It does not enable portal authentication, contact submissions, regulated document uploads, medicines transactions or any write-capable API. It is not the corporate Next.js managed-runtime architecture.

## What was observed in repository source

| Source location | Current evidence | AWS action | Status |
| --- | --- | --- | --- |
| `infra/*.bicep`, `infra/modules/*.bicep` | Existing Azure infrastructure definitions | Inventory resources and data mappings before selecting AWS managed runtime | Not yet migrated |
| `.github/workflows/azure-deploy.yml` | Explicit Azure staging/production-candidate workflow | Keep as legacy until tested AWS cutover; do not invoke for new AWS work | Legacy retained |
| `.github/workflows/managed-production-candidate.yml` | Existing successful-CI dispatch to Azure under a marked main commit | Replace only after approved AWS deployment mechanism is reviewed | Legacy retained |
| `.github/workflows/ci.yml` | Release test still packages Azure artifacts | Add AWS checks alongside; do not remove working gates prematurely | Transition required |
| `.env.example` | Azure SQL, Azure Blob and Microsoft Graph references | Classify each consumer as runtime, migration-only or cross-cloud integration | Inventory required |
| `apps/corporate` | Next.js standalone managed-runtime application | Select and validate App Runner/Amplify/ECS or equivalent before deployment | Not deployed on AWS |
| `apps/portal`, `apps/api` | Protected application and API packages | Separate identity, data and secret migration design with tenant/RP controls | Not deployed on AWS |
| Issue #84 | Documented production npm audit critical/high failures | Security remediation before any managed cutover | Release blocked |
| Issue #55 | Managed-runtime acceptance incomplete | Rewrite release gates for AWS after verified inventory | Release blocked |

No actual Azure subscription resources, live database records, IAM identities, billing, AWS quotas or AWS project permissions were inspected in this source-only candidate.

## Safe validation and eventual activation

1. In CI or a trusted checkout run `node scripts/aws/validate-public-foundation.mjs`; this checks source invariants, **not CloudFormation service acceptance**.
2. Authenticate interactively with the owner's named AWS CLI project profile. Never place credentials in GitHub or prompts. Verify with `aws sts get-caller-identity --profile PROFILE`.
3. After confirming project access and spend authority, run `aws cloudformation validate-template --template-body file://infra/aws/public-site-foundation.json --region eu-north-1 --profile PROFILE`.
4. Obtain an approved spend limit, WAF/logging design and deployment role separation before provisioning. AWS Budgets and alerts must not be assumed present.
5. Provision only a reviewed development/staging stack with owner-authorized parameters.
6. Use a hashed, audited `PUBLIC_ONLY` artifact; check absence of `<form>`, credentials, secrets and private paths before upload.
7. Test the distribution's AWS-provided hostname for pages, image paths, 404 handling, browser acceptance and TLS. Record exact source SHA, stack identity and validation results.
8. Separately implement and test AWS managed runtime for the six services, database migrations, authorized email/SES sending, protected identity and regulated workloads.
9. Prepare a reversible DNS/custom-domain cutover only after security, restoration, browser and business-owner gates pass.
10. Retain public GitHub Pages and existing Azure systems as recoverable sources until the cutover is accepted and decommissioning is authorized.

**Important:** This candidate deliberately has no DNS alias, custom-domain certificate, public S3 grants, paid workload deployment job, contact form or production environment value. It is not sufficient on its own for production use.

## Critical production blockers

- Review and remediate GitHub [Issue #84](https://github.com/NovapharmHealthacre/novapharm-website/issues/84) with a measured zero-critical/high production `npm audit` and functional regressions.
- Resolve [Issue #55](https://github.com/NovapharmHealthacre/novapharm-website/issues/55) against AWS-backed contact, email, portal, database and restore evidence.
- Configure and test required `main` branch protections, reviewers and exact-SHA release approval.
- Prove AWS credentials, identity, permissions, quotas, billable resource approval, backups and cross-border data handling.
- The installed agent setup requires a named AWS CLI profile; it is **not** established by this repository change.

Do not treat a successful static CI check as AWS provisioning, live deployment or completion.
