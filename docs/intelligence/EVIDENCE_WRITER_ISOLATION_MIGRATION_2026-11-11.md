# NovaPharm Intelligence | S3 evidence-writer isolation migration candidate

**Date:** 11 November 2026  
**Status:** Source-only code change; a separate candidate bucket was reported provisioned on 11 November 2026, but **the exporter has not been cut over**  
**Tracks:** #461 (writer isolation), #439 (runtime security), #176 (Intelligence release)

## Historical AWS snapshot at authoring (11 November 2026; not a current live-state assertion)

- Existing S3 bucket: `novapharm-intelligence-evidence-250675045172-eu-north-1` in `eu-north-1`.
- Current objects: **10**. Six under `commerce/`, two under `intelligence/releases/`, two under `intelligence/source-review/`. The earlier nine-object inventory is obsolete; both release objects must be preserved.
- The existing bucket policy has **only** `DenyInsecureTransport`. Four public-access-block switches are on, default at-rest encryption is AES256, and versioning is enabled. None of these by themselves proves workload-specific writer isolation.
- Current commerce-export Lambda execution role: `novapharm-production-commerce-evidence-EvidenceRole-GNet28VHTjmN`. Its inline IAM grant allows `s3:PutObject` only to the existing bucket's `commerce/owner-attestations/*` prefix, plus read-only source-table and log permissions.
- CloudTrail `novapharm-staging-audit` currently records management events but has **zero S3 data-event selectors**. Therefore writer identity for all ten stored objects cannot be deduced from missing CloudTrail object events. Do not create paid data-event logging without a cost and retention decision.
- Existing scheduled exporter and source object semantics remain production responsibilities. No source rights, medical observations, physical stock reconciliation or customer entitlement is established by an export snapshot.

## Candidate implementation

`infra/aws/intelligence-commerce-evidence-isolation-candidate.json` defines a **new, separate** private S3 bucket for future commerce-only evidence. It **does not modify** the occupied Intelligence evidence bucket, its bucket policy, the scheduled exporter, existing objects, DNS, customers or paid endpoints. A [11 November PR checkpoint](https://github.com/NovapharmHealthacre/novapharm-website/pull/473#issuecomment-6800625320) reports that the candidate stack reached `CREATE_COMPLETE`, with private-bucket controls and an unapproved-principal negative write test. That is historical evidence reported on GitHub, **not a fresh AWS inspection**. It does not prove a successful authorized writer, exporter cutover, or full migration.

Controls supplied: full public-access block, bucket-owner-enforced ACL ownership, SSE-S3 encryption, versioning, retain-on-stack-removal, TLS-only access, explicit deny of object mutation by principals other than the declared commerce exporter role, and explicit denial where principal identity is absent. No `Allow` grants, IAM-role changes, customer routes, writers, schedules or object migrations are made by this template. The nominated role remains unable to write to the new bucket until a separately reviewed least-privilege IAM change is accepted.

`scripts/test-intelligence-commerce-evidence-isolation-candidate.mjs` and the scoped GitHub Actions workflow assert the controls and prevent claims that the candidate has already been made live.

## Strict release and migration sequence

1. **Account for all existing objects** by exact key, version, source, checksum, retention/legal-hold requirements and named business owner. Do not delete, move, overwrite, downgrade or publicly expose any of the ten existing objects during planning.
2. **Identify all other effective writers/readers.** Inspect IAM identity policies, bucket policy, service configurations, CloudTrail management evidence and source service logs. If S3 object-level CloudTrail data events are required, approve their volume/cost, policy and retention before enabling them.
3. **Review the candidate against exact AWS principal semantics.** Confirm assumed-role `aws:PrincipalArn`, bucket and object ARNs, account-level SCPs, key/retention policies and authorized administrative break-glass paths. Run `aws cloudformation validate-template` and independent IAM policy simulations for permitted and denied principals.
4. **Review the already-reported isolated candidate stage.** Independently recheck its stack and bucket state, change-set provenance, approved cost/name, absence of public access, negative cross-workload writes, and rollback design. If replacement is necessary, obtain separate infrastructure/security-owner approval before provisioning anything. Do not infer that the reported negative test establishes an authorized writer.
5. **Prepare the producer cutover separately.** Grant the exporter role `s3:PutObject` on only the new bucket's `commerce/owner-attestations/*` object ARN, not a wildcard bucket or all object prefixes. Update the exporter `EVIDENCE_BUCKET` only through a reviewed immutable change and monitor the daily schedule. Verify an authorized write succeeds, an Intelligence identity's write fails, and other authenticated principals are denied. Preserve older exports in place.
6. **Prove consistency and rollback.** Reconcile schema, 392 declared SKU records, checksums, retention, no customer-facing medical claims, exporter logs, and exact source SHA. Demonstrate reversing the producer's sink setting without duplicating or deleting records; retain the original bucket until approved archival.
7. **Only then** close the writer-isolation acceptance criteria in #461. Explicitly separate this from source-licence admission, Cognito customer onboarding, paid subscription acceptance, full ECR/identity security and the broader #176 production release.

### Local, non-deploying checks

```sh
node --test scripts/test-intelligence-commerce-evidence-isolation-candidate.mjs
aws cloudformation validate-template --template-body file://infra/aws/intelligence-commerce-evidence-isolation-candidate.json --region eu-north-1
```

**A source PR merge does not authorize deployment or producer cutover.** Versioned policy source is a reviewable implementation step, not a substitute for IAM simulation, writer inventory, staged regression and release-owner approval. No customer/supplier emails or live payment transactions are part of this migration.
