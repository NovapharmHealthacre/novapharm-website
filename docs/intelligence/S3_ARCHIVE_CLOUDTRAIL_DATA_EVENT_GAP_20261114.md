# AWS CloudTrail audit of private EPD source archive — default-OFF review plan

Status: source-only, **NO AWS logging configuration was changed**.

## Exact observed AWS state (14 November 2026)

AWS account 250675045172, eu-north-1, trail novapharm-staging-audit:
- Event selector 1: management events ReadWriteType=All; no data resources.
- Event selector 2: S3 object WriteOnly data events for
  arn:aws:s3:::novapharm-intelligence-evidence-250675045172-eu-north-1/
- NO S3 object data-event selector includes private source quarantine bucket
  novapharm-staging-foundation-quarantinebucket-knggqkn5aqoq.
- The quarantine bucket is versioned, AES256-encrypted, nonpublic, owned by
  bucket owner, but server access logging is disabled and there is no lifecycle
  configuration. Existing codebuild logs and S3 versioned receipts are not
  a complete record of future archive reads, writes and deletes.

## Proposed selector addition

Append exactly one additional basic CloudTrail selector:
- ReadWriteType: All
- IncludeManagementEvents: false
- DataResources: AWS::S3::Object, exact prefix:
  arn:aws:s3:::novapharm-staging-foundation-quarantinebucket-knggqkn5aqoq/governed-intake/nhsbsa/EPD_SNOMED_202608/
- Preserve both existing selectors exactly. Do NOT broaden to all S3 buckets,
  switch off management logging or convert to Advanced selectors casually.

The pure planning module tests that the exact observed baseline has not drifted
and returns a proposal only. It NEVER calls PutEventSelectors.

## Required independent steps before any AWS change

1. Calculate CloudTrail S3 data-event recording cost and approved monitoring/
   retention spend envelope; get distinct human operations/security approval.
2. Confirm bucket resource ARNs and chosen prefix with a read-only current
   selector readback. Review planned policy diff against existing management
   and Intelligence evidence events. Freeze configuration during change window.
3. Apply through a separately approved least-privileged change process, not
   this test suite. Version/record the before-and-after AWS selector snapshots.
4. Perform one real authorised archive-prefix GetObject, PutObject and
   versioned DeleteObject canary using NON-MEDICINE test data, then verify
   corresponding delivered CloudTrail data events. Test absence of unwanted
   cross-bucket coverage and protected role denial.
5. Agree legal source/record retention, version restore, hold and cost
   before adding lifecycle expiry; do not delete the only full source archive.
6. Keep source/terminology rights, Atlas G2 admission, customer use, NOVA,
   billing, external emails and enterprise production promotion disabled.

Related #598, #497, #86, #517 and #584. An offline plan passing CI is NOT a
live CloudTrail data-event acceptance.
