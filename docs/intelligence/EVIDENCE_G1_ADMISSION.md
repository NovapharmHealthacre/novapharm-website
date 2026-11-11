# NovaPharm Intelligence G1: official evidence admission

Status (11 November 2026): source metadata registered; production medicine observations NOT accepted. This runbook is not a licence grant, a customer deployment or enterprise sign-off.

## Observed infrastructure

The AWS Stockholm FREE Atlas cluster npi-bootstrap has the isolated database novapharm_intelligence_preview, eight npi preview collections and four source registry metadata records, each marked accepted_observations = 0 and customer_publish_approved = false.

| Source | Proper meaning | Admission gate |
|---|---|---|
| NHSBSA EPD with SNOMED | Monthly England community prescribing | Publisher resource/checksum, OGL attribution and independent BNF/SNOMED reuse rights |
| ONS | Population/geographical denominators | Dataset-specific version, geography and licence; NOT medicine sales |
| openFDA | US drug label/product metadata | Record-level third-party copyright screening; NOT proof of demand or availability |
| ClinicalTrials.gov | Clinical study registry entries | Study IDs, terms/attribution; NOT clinical marketing authorisation |

Official source references:
- https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code
- https://opendata.nhsbsa.net/pages/terms-and-conditions
- https://open.fda.gov/terms/
- https://developer.ons.gov.uk/
- https://clinicaltrials.gov/data-api/api

NHSBSA explicitly requires attribution: NHSBSA Copyright 2021-2026. EPD's Open Government Licence does NOT automatically establish rights to re-use third-party BNF/SNOMED terminology. A successful HTTP request is not commercial licence approval.

## Implemented code

The src/core/medicine-evidence-admission.mjs contract validates a trusted EPD resource snapshot against independently reviewed, current source-rights and exact canonical medicine identity proof. It blocks revoked/missing/expired rights, missing terminology rights, inferred code mappings, patient data, unexpected fields, wrong units, duplicate rows, changed source versions and unreconciled checksums/totals. It never fetches, persists, publishes, charges, or marks evidence as accepted.

Positive Node tests are synthetic only and explicitly verify acceptedObservations = 0. Run: node --test scripts/test-medicine-evidence-admission.mjs. The scoped GitHub workflow runs those tests on source changes.

## Mandatory remaining production acceptance

1. Compliance reviews exact dataset licence, content/AI rights, attribution, retention, redistribution and third-party terminology rights, then records a real, signed/versioned rights approval in the trusted grant store. User or model payloads cannot self-grant.
2. A private AWS worker fetches the immutable publisher resource with an independently checked file SHA-256, ID, reporting month, version, and approved egress/rate limits. Large raw extracts need separately approved encrypted object/analytic storage, NOT the free M0 metadata cluster.
3. Validate original source grain, schema, dates, geographies, missingness, duplicates, numeric types, counts and totals. Never aggregate EPD, PCA, SCMD, labels, population or trials as interchangeable evidence.
4. Resolve medicine identity only through licensed BNF/SNOMED/ATC/RxNorm/NDC mappings, exact identifiers and validity windows. Quarantine unresolved or competing mappings.
5. Re-check currently active grants and authority at the private transactional commit, with immutable observation/manifest and acknowledged audit receipt. Admission candidates count as zero accepted evidence until the committed receipt is verified.
6. Independently test a real authenticated medicine search, reproducible licensed evidence, attribution, rights revocation, tenant isolation, freshness, backups/restores, runtime health, and owner acceptance before customer publication or NOVA forecasting.

At this checkpoint both staging and preview evidence/right-grant ledgers were empty. The staging NHSBSA August 2026 API probe is schema-only and did not persist real medicine data. Issue #176 remains the G1/G3/G7 release authority. Never claim live medicine-data production from registry row counts or mock tests.
