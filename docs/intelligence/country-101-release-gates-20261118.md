# Global national pharmaceutical data: release programme and acceptance definition

**Scope:** the source-controlled global-pharma-sources-20261117.json register contains **101 source candidates**, **77 countries**, plus the **EU/EEA** and **Global** research groups. Neither count represents production integration. The registry is discovery-only, with all entries marked candidate-only, not-reviewed, not-admitted and no active adapter. No country is licensed, quality accepted or customer-live on this evidence.

## Implemented in this PR

- Every one of the 101 source keys is checked for uniqueness, official HTTPS reference structure, unchanged rights/admission state, region and access-mode classification.
- Every one of the 77 country names has a uniquely resolved jurisdiction summary, with 79 labels inclusive of EU/EEA and Global.
- Each source has a deterministic next action appropriate for its advertised interface: bounded API, publisher download, authorised portal export, publisher discovery or restricted access.
- The five actual source-only candidate API contracts already merged on main are counted separately from production sources: US FDA, Canada Health Canada DPD, Spain AEMPS CIMA, Global ClinicalTrials.gov and Global Europe PMC. Contracts in unmerged PRs are NOT counted.
- The report generator outputs machine-readable JSON and a 79-label country table including a precise next action for each source. Its CI artifact is inspectable; no AWS or API connector is invoked by this workflow.
- The report denies 100%-live certification for every country until independently approved production evidence exists. No user-supplied or registry flag grants a licence or production admission.

Run with Node 24:

    node --test scripts/test-intelligence-country-release-ledger.mjs
    node scripts/render-intelligence-country-release-ledger.mjs --json
    node scripts/render-intelligence-country-release-ledger.mjs --markdown

## What 100% means for every national country

For EVERY national source intended to support customer product features, independently verify and archive:

1. Authority/endpoint: publisher authenticity; real endpoint or file from the publisher; no unapproved portal scraping; credential/access restrictions.
2. Rights: dated, source-, version-, domain-, geography-, intended-use-specific commercial/AI redistribution terms; exclusions, required attribution, downstream licences and terminology rights; signed by the appropriate rights decision-maker in a protected backend.
3. Engineering: rate-limited, bounded ingestion; repeatable data schema with original identifiers, source-native terms, timestamps, currency, price units, pack/strength/route, and other applicable measures.
4. Data: immutable authentic upstream snapshot with SHA-256, observed/publication periods, provenance, freshness, row-level quality and replay/idempotence; mismatches and invalid/duplicate rows quarantined.
5. Scientific/clinical: regulatory authorisation, real sales, prescriptions, pharmacovigilance, prices, indications and patent information must not be conflated; human-reviewed mapping to original local codes, dm+d/SNOMED/ATC only when permitted and valid.
6. Protected operations: least-privilege backend data handling, no client-side source secrets, tenant scoped rights/ABAC, deny-and-revoke tests, audit logs, monitoring, continuity and rollback.
7. Production: exact deployment evidence, customer-read acceptance by role and country, versioned permitted dataset, live end-to-end tests and release signoff. The iOS/Android apps only consume those independently approved backend capabilities.

A country cannot be 100% complete merely because adapter code exists, or because its sources are downloadable and official.

## Immediate engineering dependency order

- Complete strict browser CI and source-contract corrections in PRs #834, #836 and #837; retain required Chromium/WebKit acceptance.
- Complete all 101 candidate technical onboarding summaries in #830, with the Poland NFZ official nested response contract, PubMed/ChEMBL/PubChem and ISO-region source identifiers.
- Complete Singapore HSA registered-products API, bounded offline CSV review and NHSBSA dataset catalogue query code in #838, maintaining the distinction between catalogue metadata and EPD prescribing observations.
- Start a protected first national proof of source rights, snapshot, identity and tenant admission for the UK Apixaban tracked pilot in #810. As AWS access is unavailable, code-only work must not be described as a production run.
- Extend the same evidence-ledger and snapshot pipeline to US FDA, Canada Health Canada, Spain AEMPS, Poland NFZ, Singapore HSA, Australia TGA/PBS and India official registries; continue across the remaining countries under the same gates.
- Source-specific commercial licensing is tracked under #811 and global tracking under #808.

## Source-only and owner constraints

The owner-production-constraints.json file denies new paid resources, unapproved medicine admissions, public customer activation, cutover and production changes. This PR is source-only, zero-new-spend, no vendor account, no direct API traffic, no signed native release and no ingestion into Atlas.

The report is an auditable worklist with unambiguous blockers; it is not a completed platform.
