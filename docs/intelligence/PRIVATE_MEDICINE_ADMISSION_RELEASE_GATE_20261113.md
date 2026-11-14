# G2 private medicine evidence admission: 13 November 2026

**Scope:** owner-authorised internal research pipeline; no customer publication, legal rights self-attestation, live billing, external emails or extra paid services.

## Current independently inspected state
- GitHub PRs #548 and #551 were merged into main. The official NHSBSA August 2026 EPD CSV was downloaded, hashed (7,432,815,985 bytes, SHA-256 `1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b`) and privately archived as eight parts in governed Drive folder `1II0aPPFlA97N68Bksa0BsUT3QYVET7Z5`.
- Private CSV QA: 17,754,211 syntactic records, 10,972 missing SNOMED mappings. Counts are internal source-QA results, not approved commercial market statistics or an independent publisher-control reconciliation.
- Production Atlas `npi-bootstrap` database `novapharm_intelligence_production`: seven collections. At live readback, `npi_source_registry` has four metadata-only sources and `npi_source_rights`, `npi_ingestion_runs`, `npi_medicine_identity`, `npi_medicine_evidence`, `npi_evidence_manifests` and `npi_audit_events` all have zero records. Staging still holds only quarantined records.
- AWS serverless API and production Cognito identity resources exist; a synthetic GET health route returns 200. This does not certify an end-to-end authenticated customer data query.

## G1 / G2 contracts

G1 `prepareOfficialMedicineEvidenceCandidate` checks exact-source metadata, verified identity proof, accepted terminology rights, source rows, reconciliation totals and hashes. Its outputs remain *candidate*, not approved customer evidence.

G2 `admitPrivateOfficialMedicineEvidence` requires a live, server-verified board/admin authority for the internal workspace, fresh independently attested source and third-party terminology rights, a single atomic evidence+manifest+audit transaction through a trusted backend adapter, independent durable readback, and revocation rechecks before and after commit. If a post-commit authority or rights recheck is false or indeterminate, a separate durable quarantine+audit adapter must attest the quarantine before the function returns a refusal; missing or failed quarantine attestation remains a hard failure. It returns private status and **never** enables customer publishing, model egress or regulated decisions. Synthetic tests cannot attest to live grants.

### Additional post-commit freshness fence (PR #574, unmerged)

G2 must sample **trusted server wall-clock time again after the asynchronous durable commit and rights recheck**, not reuse the request's initial `now`. A stale `checkedAt` receipt, rights `validUntil` crossed during the transaction, invalid clock or wall-clock rollback must deny private promotion. If the data was already committed, the denial must be paired with independently durable **quarantine plus audit**; a failed quarantine attestation remains an error. The clock-injection seam exists only for deterministic synthetic contract tests and must never be controlled by a browser, tenant request or source payload.

This is a code-and-test candidate only until the exact SHA is independently reviewed, merged, deployed to a trusted private backend, and exercised against a properly permissioned Atlas transaction adapter. A passing unit test never attests to real source grants or accepted data.

These contracts were ported from unresolved PR #547 onto current main because #547 had become merge-conflicted. PR #547 should not be merged blindly.

## Actual next gate (cannot be forged)
1. Have a qualified independent rights reviewer document NHSBSA OGL attribution, the precise field-level BNF/SNOMED/dm+d proprietary reuse conditions, business/AI/commercial redistribution purposes, expiry and revocation; no false `verifiedByRightsAuthority` values.
2. Verify a single exact medicine product code, strength, form, period and jurisdiction using official authority. Do not map products from the word “apixaban”.
3. Build a least-privilege private Atlas transaction adapter and identity service which rechecks stored grants and produces durable independent audit receipts. Do not store secrets in GitHub.
4. Run one approved partition end to end, then private scoped Search -> Identity -> Evidence -> Market checks; verify two real tenant identities are isolated. Execute restore/revocation and security acceptance.
5. Only then authorize source-derived customer-facing views. Never mistake the existence of a UI or a health endpoint for production readiness.

Official publisher reuse rules: https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code . NHSBSA requires `NHSBSA Copyright 2021-2026` attribution and specifically advises securing third-party information rights.

**This PR does not populate production evidence, create users, grant source rights or activate billing.**
