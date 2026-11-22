# UK four-nation private source identity and rights-review reconciliation

Status: **source-only and non-admitting**. This component cannot contact a database, import medicine rows, authenticate publisher files, decide a licence, or activate customer services.

## Verified data-quality problem

The controlled UK source programme in GitHub issues #1027 and #1034 uses 14 publisher identities across England, Scotland, Wales, and Northern Ireland. The preexisting private MongoDB preview retains the legacy England EPD source ID nhsbsa_english_prescribing while the official source discovery and archive contracts call it nhsbsa.epd. These names describe the same dataset, not two independent UK sources.

The module canonicalUkFourNationSourceId recognizes only this audited exact alias and the 14 fixed UK IDs. Unknown, duplicate, forged and ambiguous aliases fail closed; it does not transform BNF, SNOMED, dm+d or other clinical terminology.

## Strict input and output boundaries

The auditUkFourNationPendingReviewPreview function operates only on **already-projected and pre-filtered UK private preview metadata** supplied by a trusted caller. It rejects unknown or duplicate source IDs, orphan rights reviews, missing required private-pending fields, mismatched original source ID or source version, and any active grant, approved publication, commercial purpose or externally verified authority claim.

The source rows must have accepted_observations equal to zero, customer_publish_approved false and a pending rights status. The rights rows must be scoped to novapharm-internal-staging with environment private_preview, and must have status pending_review, grant_active false, verified_by_rights_authority false, allowed_purposes empty, all commercial / terminology / customer permissions false and no approval signatory or record.

Missing source or review records produce a bounded, non-granting coverage summary rather than implied consent. The return object exposes only source IDs and counts, never medicine content, source archive data, reviewer names, account identifiers, source checksums or customer data. Every response explicitly states canIngest false, canPublish false, and admittedMedicineRows zero, including when all 14 review records exist.

The **22 November 2026** private readback had 14/14 controlled UK preview source identities and 14/14 pending review records. Production admitted rights, identities, medicine evidence and ingestion runs were zero. Those observations are not asserted as durable forever; only the dated readback proves them.

## Offline tests and release dependencies

Run:

    node --test scripts/test-uk-preview-source-identity-rights-gate.mjs

The test fixtures are wholly synthetic and use built-in Node test assertions, no network credentials or MongoDB connectivity. This is a draft candidate dependent on independent review and the UK publisher metadata PR #1026 and archive integrity PR #1030. Its 14-ID fixed source list must be reconciled against the accepted source registry on integration.

A future trusted caller must filter source and review documents to this UK programme **before** passing them to the pure audit function, and must separately enforce access control, logging and protected persistence. Review-queue completeness is **not** terminology licensing, Quality certification, production medicine ingestion or web/iOS/Android release approval.

## Publisher URL is not a licence

On 22 November 2026 the 14 UK preview pending-rights records were independently classified with `rights_evidence_status: publisher_page_reference_only_independent_legal_verification_pending`. A publisher dataset page or an OGL banner alone is **not** a signed Legal decision or a grant covering third-party BNF, SNOMED CT, dm+d, model training, commercial redistribution, external customer apps or cross-border use. The audit now rejects any missing or mismatched evidence classification, even if `license_evidence_url` contains a valid HTTPS publisher URL. The caller must include the new `rights_evidence_status` field in its bounded rights projection. Non-UK sources are outside this fixed 14-source review scope.

Two additional regression cases reject an absent classification and a forged independent-approval classification. This does not stop an actual independent approved rights record from being stored in a **separate reviewed authority**; it stops a preview *pending-review* record from impersonating that authority. Production rights and medicine admission remain separate release gates.
