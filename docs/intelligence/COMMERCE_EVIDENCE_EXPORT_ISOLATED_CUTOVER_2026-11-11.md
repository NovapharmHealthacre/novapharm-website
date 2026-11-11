# Commerce evidence daily exporter: isolated bucket release

**11 November 2026** | Related #461, #473, #478, #176 | No customer messaging, payment or medicine data admission.

## Scope and evidence

The scheduled 392-SKU NovaPharm commerce-owner inventory declaration job already runs with a Lambda role limited to the two relevant DynamoDB inventory tables, an S3 commerce evidence prefix and CloudWatch logs. Its output is **a commercial assumption**: owner-confirmed available counts, not verified physical warehouse stock or accepted customer sales. It must never become a medicine-observation fact.

Previously, the daily exporter wrote under `novapharm-intelligence-evidence-250675045172-eu-north-1/commerce/owner-attestations/*`, sharing an S3 namespace with Intelligence releases and medicine source-review drafts. The previous bucket has **10 retained objects**: six commerce, two Intelligence release receipts and two source-review records, all left untouched.

The new isolated S3 bucket `novapharm-commerce-evidence-250675045172-eu-north-1` was created by a separate AWS CloudFormation stack, configured with versioning, AES256, TLS-only access, all four public access blocks and explicit unapproved-principal object-mutation denies. A real write from AccountFullAccessRole was rejected with an explicit resource-policy AccessDenied.

Private canary `novapharm-commerce-evidence-isolation-canary` (stack `novapharm-commerce-writer-canary-staging`) running under the existing scheduled exporter's exact IAM role then produced **passed:true** after a forbidden `intelligence/` write was AccessDenied and a content-hashed `commerce/owner-attestations/_isolation-probes/` object was successfully written. The private canary has no Function URL or schedule. The old bucket still has all ten objects.

## Source change

This branch changes only the original CloudFormation source template's `EVIDENCE_BUCKET` environment variable and its `s3:PutObject` resource ARN from the old occupied bucket's commerce prefix to the new isolated bucket's commerce prefix. The existing scheduled exporter function name, 03:00 UTC daily schedule, 392-source-record assertion, DDB source tables, at-rest SSE, commercial-assumption label, no sales claim, and event permissions remain unchanged. The associated JS contract test checks the destination.

## Cutover and rollback acceptance

1. Verify latest source and required CI; inspect actual deployed CloudFormation stack `novapharm-production-commerce-evidence-feed` and compare the stored template.
2. Validate exact replacement with CloudFormation. Create an **UPDATE** change set with exact reviewed template and inspect affected resources. Accept only the targeted Lambda environment and IAM policy update. The existing ten old objects must not change.
3. Execute, wait for `UPDATE_COMPLETE`, inspect exporter Lambda `EVIDENCE_BUCKET` and IAM destination ARN. Confirm EventBridge schedule remains enabled with original function target.
4. Directly invoke exporter (private source-to-S3 rehearsal) and verify 392 governed declaration records in a new encrypted object in the new bucket, count 392, sales/physical verified counts remain zero, and no customer-facing claim or payment occurred. Check logs and metadata. If a conditional source failure occurs, do not fake stock: report failure and diagnose.
5. Prove forbidden cross-prefix writes remain denied and old ten-object evidence store remains intact. Observe daily EventBridge delivery and no duplicate stock records.
6. If unsuccessful, apply the recorded previous reviewed template via an UPDATE change set and re-verify existing Lambda function, scheduled rule, 392 data records and old bucket write path. Do not delete new objects, old objects or bypass retention.

**Important:** No medicine ingestion, source-rights approval, subscription launch, fulfillment transaction or physical-stock acceptance is implied by this daily internal evidence export.
