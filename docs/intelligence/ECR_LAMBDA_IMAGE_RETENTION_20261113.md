# Intelligence ECR image retention — operational security correction (13 November 2026)

**Scope:** ECR repository `novapharm/intelligence/production`, AWS account `250675045172`, region `eu-north-1`. An AWS policy change does not deploy a new application, reassign an alias, grant data rights or open customers.

## Observed outage
Direct Lambda `get_function` and `invoke` reported `private-acceptance` alias, version **15**, as `Inactive / ImageDeleted`. ECR digest `sha256:73dd2cda452fad313fa620725ef0815224ee75325f363382891cc868a0b0619f` was not present in any accessible repository in the region. Image was not recoverable from the current registry inventory. The original rule automatically expired *all* tagged images after the count exceeded ten, irrespective of Lambda-version references; a separate rule expired untagged images after seven days.

## Applied live mitigation
An authorised AWS operation replaced the broad lifecycle policy with `infra/aws/intelligence-ecr-protected-lifecycle-policy.json`. A second AWS `get_lifecycle_policy` matched the exact new JSON. Only images explicitly tagged `ephemeral-build-*` are now eligible for expiry after 30 days. All ordinary tagged release, founder and candidate images are preserved by default. **This prevents this class of automatic release deletion, but increases storage retention and requires ongoing controlled cost/unused-image review.** At the check, 15 current images had roughly 1.09 GiB combined declared image sizes before shared-layer deduplication; that is not a billing estimate.

## Recovery candidate, not production cutover
- `private-acceptance-recovery-20261113` is a **non-traffic** Lambda alias created at immutable version **35**, without changing any API Gateway integrations.
- The referenced ECR image exists and its basic image scan returned `COMPLETE` with zero reported HIGH/CRITICAL entries.
- Direct read-only Lambda probes returned HTTP 200, `no-store` and `noindex` for `/healthz`; anonymous `/founder/` redirected to sign-in.
- Original `private-acceptance` still points to broken version 15; **production protected service is not certified**. No customer access flags or subscription checkout were enabled.

## Required prior to alias cutover
1. Independent review of the immutable code/image provenance and what changed between protected version 15 and candidate version 35, especially board, tenant, cookie, session, API, source-rights and default-deny behavior.
2. Full API Gateway **JWT/IAM** negative tests, actual Cognito founder MFA login/logout revocation, source-rights denial, and two-tenant isolation checks; direct Lambda invocation is not proof of gateway authorization.
3. Reviewed production maintenance window, explicit approved target version, exact configuration comparison and viable tested rollback. Never use the absent version-15 image as an executable rollback.
4. Verify ECR digest retention and vulnerability findings; record signed acceptance and test artifacts, then move the alias with an explicit change record.
5. Inspect stored image bytes/cost at least monthly; prune only versions confirmed unreferenced by **all** Lambda versions/aliases and rollback requirements. An ECR lifecycle policy cannot automatically know Lambda references.
6. Preserve customer source access and billing OFF until separate legal, data, privacy and commercial release gates pass.

## Governance
This source-controlled copy is the desired retention rule, **not** an auto-deployer or a claim of active production service health. Do not reintroduce a catch-all `tagged: any` or untagged expiry rule without immutable-digest reachability checks against all Lambda published versions.
