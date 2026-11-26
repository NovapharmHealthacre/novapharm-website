# Canada — official Health Canada DPD public live-source evidence

**Scope:** Source-only national pharmaceutical registration/provenance probe. **Country:** Canada (CA). **Original source candidate:** `north-america-canada-health-canada-drug-product-database`. **Date:** 18 November 2026.

## Exact official publisher interface

Health Canada's published <https://health-products.canada.ca/api/documentation/dpd-documentation-en.html> Drug Product Database (DPD) API Guide identifies `https://health-products.canada.ca/api/drug/` as the base, and `drugproduct` as the Canadian drug-product endpoint, supporting individual `din` lookup and English `lang=en` and `type=json` formats.

This source-only implementation requests **one fixed sample DIN** documented by the government:

`GET https://health-products.canada.ca/api/drug/drugproduct/?din=00326925&lang=en&type=json`

The official guide's sample record identifies DIN `00326925`, `drug_code=2049`, brand name, company, class, and last update date. Health Canada's DPD is an official product-registration resource; that record **does not** demonstrate present market supply, national inventory, active prescribing, public formulary reimbursement, clinical interchangeability, price, or current UK/other-country marketing authorisation. A per-record last-update date also does not establish a dataset's current publication date.

## Implemented source-only checks

- `src/core/intelligence-canada-dpd-public-live-probe.mjs`: fixed official HTTPS URL, no untrusted query inputs, no third-party network redirects, 64 KiB streaming bound, 20-second deadline, strict MIME/HTTP, one DIN-matched source record with **string-preserved eight-digit Canadian DIN** and exact source update date, SHA-256 digest of original bytes.
- Supports a single object or one-element array because official DPD documentation says one or more objects; rejects any larger payload or substituted DIN.
- `scripts/test-intelligence-canada-dpd-public-live-probe.mjs`: source registry binding, native DIN and drug code validation, non-publishable receipt, HTTP/JSON/schema errors, denial of lost leading zeroes or Unicode spoofing, sanitized time/DNS/TLS/transport failures.
- `scripts/run-intelligence-canada-dpd-public-live-probe.mjs`: makes one real network read, then discards medicine content and writes only source identity, source-record date, observation timestamp, SHA-256, count and non-publishability flags.
- `.github/workflows/intelligence-canada-dpd-public-live-source.yml`: independent Node 24 contract tests and **mandatory actual Health Canada source HTTP read**. Uses existing trusted runner proxy configuration when present; no proxy, secrets, infrastructure, credentials or paid services are provisioned. Artifact stores only the receipt for 7 days, with pinned immutable GitHub Actions.

## Rights, freshness and release gates

The API guide states responses are available in JSON/XML for reuse by developers; this statement by itself does **not** independently verify NovaPharm's commercial or AI downstream reuse rights or obligations. A legal review must document the relevant Government of Canada Open Government Licence/terms and attribution, any third-party rights and restrictions, privacy constraints, and clinical use limitations.

No bulk dataset was fetched, no source rights service was connected, no source data was admitted, no production database or customer API was deployed, and no iOS/Android user-facing medicine search was activated. **All customer production flags remain false.** The source-live status remains **unverified in NovaPharm CI** until the exact-head real HTTP job succeeds. Future approved ingestion must use trusted rights grants, immutable source snapshots, native DIN mapping, source-data quality and provenance, per-tenant access control, revocation, monitoring and rollback.

**Related:** global country/source inventory issue #808, source registration PR #839, US FDA/Singapore source candidate PR #844, Spain source candidate PR #846.
