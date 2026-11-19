# Intelligence ECR image retention — operational security correction (13 November 2026)

**Scope:** ECR repository `novapharm/intelligence/production`, AWS account `250675045172`, region `eu-north-1`. An AWS policy change does not deploy a new application, reassign an alias, grant data rights or open customers.

## Observed outage
Direct Lambda `get_function` and `invoke` reported `private-acceptance` alias, version **15**, as `Inactive / ImageDeleted`. ECR digest `sha256:73dd2cda452fad313fa620725ef0815224ee75325f363382891cc868a0b0619f` was not present in any accessible repository in the region. Image was not recoverable from the current registry inventory. The original rule automatically expired *all* tagged images after the count exceeded ten, irrespective of Lambda-version references; a separate rule expired untagged images after seven days.

## Applied live mitigation
An authorised AWS operation replaced the broad lifecycle policy with `infra/aws/intelligence-ecr-protected-lifecycle-policy.json`. A second AWS `get_lifecycle_policy` matched the exact new JSON. Only images explicitly tagged `ephemeral-build-*` are now eligible for expiry after 30 days. All ordinary tagged release, founder and candidate images are preserved by default. **This prevents this class of automatic release deletion, but increases storage retention and requires ongoing controlled cost/unused-image review.** At the check, 15 current images had roughly 1.09 GiB combined declared image sizes before shared-layer deduplication; that is not a billing estimate.

## Protected alias recovery — verified after the original incident
- `private-acceptance-recovery-20261113` is a **non-traffic** fallback alias at immutable version **35**; it did not itself change API Gateway routing.
- A separately authorised revision-checked AWS `UpdateAlias` changed the **actual traffic-target** `private-acceptance` from version **15 to 35**. Independent `GetAlias` and `GetFunction` readback confirm version 35 `Active`; its digest is present in ECR.
- A direct `Invoke` of the **actual** `private-acceptance` qualifier with `GET /healthz` returned HTTP **200**, body `ok\\n`. Version 34 remains a present ECR-image rollback candidate with its own successful direct health check. Neither v15 nor its deleted image is a viable rollback.
- API Gateway `ANY /{proxy+}` remains `AWS_IAM`; both customer-session and customer-authorizer `NPI_CUSTOMER_ACCESS_ENABLED` remain `false`. No medicine evidence or rights were granted by the recovery.
- **Limits:** direct Lambda health does not prove an external-domain browser sign-in, authenticated MFA session, two real tenants, a functioning source-backed medicines query, customer entitlement, or independent production launch acceptance. Version 35 was built before the subsequent merged first-time-TOTP fix; later code must not be described as deployed without exact image/SHA and real owner MFA acceptance.

## Required before certifying this recovery or any future alias cutover
1. Independent review of the immutable code/image provenance and what changed between protected version 15 and candidate version 35, especially board, tenant, cookie, session, API, source-rights and default-deny behavior.
2. Full API Gateway **JWT/IAM** negative tests, actual Cognito founder MFA login/logout revocation, source-rights denial, and two-tenant isolation checks; direct Lambda invocation is not proof of gateway authorization.
3. Reviewed production maintenance window, explicit approved target version, exact configuration comparison and viable tested rollback. Never use the absent version-15 image as an executable rollback.
4. Verify ECR digest retention and vulnerability findings; record signed acceptance and test artifacts, then move the alias with an explicit change record.
5. Inspect stored image bytes/cost at least monthly; prune only versions confirmed unreferenced by **all** Lambda versions/aliases and rollback requirements. An ECR lifecycle policy cannot automatically know Lambda references.
6. Preserve customer source access and billing OFF until separate legal, data, privacy and commercial release gates pass.

## Governance
This source-controlled copy is the desired retention rule, **not** an auto-deployer or a claim of active production service health. Do not reintroduce a catch-all `tagged: any` or untagged expiry rule without immutable-digest reachability checks against all Lambda published versions.
