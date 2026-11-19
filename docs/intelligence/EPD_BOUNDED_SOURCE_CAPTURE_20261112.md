# NHSBSA EPD 2026-08 bounded official-source acquisition

**Environment:** private research quarantine only.
**No production source grant, customer entitlement, clinical identity, real market analytics, live payment or email activation.**

## Purpose and source authority

The publisher NHS Business Services Authority exposes the English Prescribing Dataset with SNOMED Code at:
https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code

The August 2026 source resource from the previously verified staging registry is:
- CKAN UUID: `30b74257-9912-4b54-8990-8eec2a4b7f14`
- API datastore resource: `EPD_SNOMED_202608`
- API GET: `https://opendata.nhsbsa.net/api/3/action/datastore_search?resource_id=EPD_SNOMED_202608&limit=2&offset=0`

Publisher data is under OGL-UK-3.0 at the dataset level, requiring **NHSBSA Copyright 2021-2026** attribution. Source-level OGL does not automatically license third-party BNF, SNOMED CT and dm+d commercial redistribution or model processing.

## Implementation

- `src/data/nhsbsa-epd-bounded-quarantine.mjs` checks the fixed HTTPS publisher dataset against the exact resource UUID and name, validates limited source rows and reporting period, hashes original publisher response bytes, and strips all non-whitelisted fields. All returned records remain quarantined, with no canonical medicine identity and no inferred source-rights grant.
- `scripts/data/capture-epd-bounded-quarantine.mjs` defaults to no-network dry-run. Explicit `--execute` makes only GET requests to the verified NHSBSA origin, caps the request at 5 observations, uses strict timeouts, writes solely to an isolated folder outside the repo and emits hashes plus row count, not raw rows, to stdout.
- `scripts/test-nhsbsa-epd-bounded-quarantine.mjs` covers publisher mismatches, missing or invalid fields, duplicates, dates, bad metrics, byte caps and fail-closed customer access.
- `.github/workflows/epd-bounded-official-quarantine.yml` executes tests and a **live two-row** acquisition on a GitHub PR runner. It uploads only minimal review projections and SHA receipts as a **private one-day artifact**, without repository credentials in the acquisition step.

Run `node --test scripts/test-nhsbsa-epd-bounded-quarantine.mjs` and then `node scripts/data/capture-epd-bounded-quarantine.mjs` locally without any network or writes.

## What success would, and would not, prove

A successful publisher-backed artifact is genuine bounded **data API** evidence of a small source sample and source-version metadata. It is **not** the full August 2026 CSV, does **not** independently verify the complete monthly row count or checksum, and does **not** satisfy source reuse, AI, geography, longitudinal, market forecast or two-tenant production acceptance.

An authorised operator must verify the artifact ID and provenance and insert minimal records with deterministic IDs into a separate private quarantine collection in the existing free staging Atlas project. No records go to the accepted medicine collection until licensing, independent reviewer approval and security/tenant gates pass.

## Remaining gates

1. Publisher full CSV integrity (actual bytes, SHA, storage, resource metadata, complete period, period row and numeric reconciliation).
2. Source-specific, field-level publisher reuse/attribution and third-party terminology rights.
3. Independently verified canonical medicine identities and temporal changes.
4. Auditable, private service-to-Atlas write and duplicate safe replay; source revocation and backup/restore tests.
5. Two genuine internal tenant browser/API acceptance and independent release authority.
