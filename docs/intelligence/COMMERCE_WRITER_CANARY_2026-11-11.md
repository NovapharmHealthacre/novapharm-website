# NovaPharm commerce evidence writer: isolated live permission and negative test

**11 November 2026** | #461 | #176 | candidate implementation, not customer release

## Current verified facts

The separate bucket `novapharm-commerce-evidence-250675045172-eu-north-1` was created with CloudFormation stack `novapharm-commerce-evidence-isolation-candidate` from PR #473, which reached CREATE_COMPLETE. Independent AWS reads verified 0 initial objects, TLS-only deny, explicit deny of unapproved writer principals, four S3 public-access controls, versioning, AES256, and BucketOwnerEnforced. A real `s3:PutObject` from the AccountFullAccessRole to `security-negative-probes/...` returned AccessDenied with explicit resource-policy deny, and no object was created.

The existing occupied Intelligence bucket has **10 retained objects**: six commerce, two Intelligence release, two source review. It remains in place without a cutover. No accounts, emails, billing, medicine ingestion, entitlements or public services have been enabled.

## Code candidate

`infra/aws/intelligence-commerce-writer-canary-staging.json` adds only:

1. One 14-day log group for a private acceptance Lambda.
2. One **separate, scoped IAM inline grant** on the existing commerce exporter execution role for `s3:PutObject` on **new-bucket/commerce/owner-attestations/** objects and canary logging; no deletes, wildcard buckets, other prefixes, source reads, IAM administration or new principals.
3. A private Python 3.12 Lambda with **no Function URL, API Gateway integration, EventBridge trigger or automatic invocations**. It uses `IfNoneMatch: "*"` to avoid overwriting historical audit objects. It requires a single explicit private operation and an independent review ticket.

The canary first tries to write an object under `intelligence/_isolation-probes/` and expects **AccessDenied**. It then writes a content-hashed, privacy-safe record under `commerce/owner-attestations/_isolation-probes/`. It does not access or modify the existing commerce stock tables, customers, inventory orders, subscriptions, live producer code or evidence bucket.

The staging grant extends the allowed writer's potential access to a new bucket **before** any live export cutover. It is not proof of isolation by itself; the exact AWS call result and role policy must be read back.

## Deployment and test sequence

- Validate the CloudFormation template and Python syntax at the exact GitHub SHA, and wait for required CodeQL, supply-chain, production readiness and browser checks to pass; do not bypass failures.
- Independently inspect existing producer role, its other IAM policies, Organization SCPs, CloudTrail gaps, and the new bucket policy. AWS IAM simulation previously reported an **inconclusive** organization explicit deny on an otherwise permitted original bucket PutObject; only real runtime tests can establish effective authorization.
- Deploy a new, reversible **canary-only** CloudFormation stack with capabilities explicitly reviewed, without editing the scheduled exporter or changing its `EVIDENCE_BUCKET`.
- Invoke the private Lambda once with `{"operation":"verify-isolation","review_ticket":"SEC-461-..."}`. Expect `passed:true`, one hashed synthetic security receipt in new-bucket/commerce/owner-attestations/_isolation-probes/, and **no object** in new-bucket/intelligence/_isolation-probes/. Record hash, timestamp, IAM role ARN, source SHA, and CloudFormation stack release.
- Verify new bucket privacy and existing bucket's ten originals still intact, verify no customer data or public function URL. If the source role is blocked by SCP or another policy, retain both systems unchanged and diagnose exact deny; never weaken policy globally to turn the test green.
- Only after authorizing the producer cutover, create a separate audited change that points the existing scheduled exporter at the new bucket, test the next due run and explicit rollback, and retire the old commerce prefix only after retention/legal hold review. Do not delete existing source material or invent physical-stock validation.

**Status:** A successful canary is not production medicine-data acceptance, customer subscription readiness, full external AI rights, or commerce paid-order proof. No external emails or live Stripe customer charges in this workflow.
