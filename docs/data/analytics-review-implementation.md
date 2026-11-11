# NovaPharm Intelligence analytics review | controlled deployment

This stack creates a **separate private, metadata-only candidate review plane** in AWS `eu-north-1`. It must not be described as an accepted clinical, prescribing or medicine-market warehouse.

## Deployed resources
- Stack: `novapharm-intelligence-analytics-review`
- Bucket: `novapharm-intelligence-analytics-review-250675045172-eu-north-1` (AES256 SSE-S3, public-access blocks, BucketOwnerEnforced, versioning, HTTPS-only)
- Glue database: `novapharm_intelligence_analytics_review`
- Glue table: `source_review_candidates_v1`, populated with **review metadata only**
- Athena workgroup: `novapharm-intelligence-analytics-review`, engine v3, enforced encrypted results, 25 MiB scanned-query cap, results expire after 7 days

CloudFormation: `infrastructure/aws/novapharm-intelligence-analytics-review.yaml`.

There is **no automatic ingestion or customer publication**. The existing mixed-use Intelligence evidence bucket is unchanged pending writer-isolation review (#461). This new review bucket is versioned, but **versioning is not equivalent to an immutable, retention-locked source snapshot**. S3 Tables, Redshift and Lake Formation are not required to index small review metadata and are intentionally not provisioned.

## Verification query (AWS internal only)

```sql
SELECT source_id, reporting_period, rights_status, identity_status,
       data_status, snapshot_verified, accepted_observation_count
FROM novapharm_intelligence_analytics_review.source_review_candidates_v1;
```

The only valid starting state for August 2026 NHSBSA EPD Apixaban is `pending_independent_review`, `unresolved`, `not_downloaded`, `false`, and `0`. Publisher-advertised hashes are **unverified metadata**, not independent SHA-256 results.

## Hard release gates (issue #454)

1. Independent reviewer examines exact NHSBSA OGL v3, mandated attribution and third-party BNF, SNOMED CT and dm+d commercial/AI/redistribution licences; records reviewer, purpose, dated legal digest and expiry.
2. Preflight storage, bandwidth and compute cost for roughly 17 million monthly EPD rows. Independently download full publisher artifact through `scripts/data/download-medicines-resource.ts` after rights and cost approvals; verify exact resource ID, bytes and computed SHA-256.
3. Map exact date-effective Apixaban presentation codes, preserve unresolved terms, and correctly separate prescribing, dispensing, secondary care and sales.
4. Reconcile entire EPD partition, duplicates, rejects and aggregation denominators. Version and protect raw input, parse output and accepted evidence manifests.
5. Stage a candidate through existing `src/core/medicine-evidence-admission.mjs`, then obtain independent final rights/admission approval. Prove source revocation, negative tenant isolation and reproducible citations.
6. Only after an authenticated, read-only, real accepted observation passes can protected analytics/NOVA use it. External AI rights, ZDR/residency and permitted data egress are separate gates.

**No simulated Apixaban figures; no automatic release; no external email; no paid bulk provision.** Check #176 (parent), #454 (first source), #461 (mixed-bucket separation), and #439 (security).

## Explicit rollback

Stack resources are isolated from commerce and the existing Intelligence private evidence bucket. Before deleting the stack, archive any actual review data, review S3 deletion protection and confirm there are no active dependent Athena queries. CloudFormation can fail deletion of non-empty S3 buckets by design. Do not delete or rewrite source evidence to force rollback.
