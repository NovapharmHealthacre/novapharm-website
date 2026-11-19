# NovaPharm Intelligence — 101 distinct national jurisdictions (scope proposal)

**Date:** 18 November 2026. **Status:** research-only draft; no source approval, customer data, production deployment or AWS access.

This scope proposal addresses the owner's later requirement for 101 **individual countries**, which is distinct from the original 101 **candidate source records**. The source registry currently has 101 discovery entries associated with **77 national labels**, plus **European Union / EEA** and **Global** groups. The latter are not countries and must never be included in national completion percentages.

This proposal names 24 additional countries (5 Europe, 6 Americas, 5 Asia, 8 Africa), producing a **proposed geographic scope of 101**. It does **not** add 24 verified pharmaceutical APIs or rights-approved sources, change the canonical 101-source register, or certify live coverage.

The country records and an independent negative-test audit live in:
- `docs/intelligence/country-101-scope-proposal-20261118.json`
- `scripts/test-intelligence-country-101-scope-proposal.mjs`

Authority research directories (not grants, endpoints or verified country feeds):
- Europe: [EMA human medicines national competent authorities](https://www.ema.europa.eu/en/partners-networks/eu-partners/eu-member-states/national-competent-authorities-human). Includes EEA-linked authorities; do not assume every national authorisation appears in EMA's central catalogue.
- Americas: [PAHO/WHO Pan American network members](https://www.paho.org/en/pan-american-network-drug-regulatory-harmonization-pandrh-0/members-pandrh-network).
- Asia: [WHO pharmaceutical product certification country contacts](https://www.who.int/teams/regulation-prequalification/regulation-and-safety/regulatory-convergence-networks/certification-scheme/contacts). National contacts can be stale; revalidate before sourcing.
- Africa: [AUDA-NEPAD Africa National Regulatory Authorities directory](https://risp.auda-nepad.org/all-nras.php). Reconfirm country-specific links independently.

## Mandatory next gate per country

1. Verify current competent national authority and source identity, official medicine dataset URL and transport method (API vs downloadable feed vs portal).
2. Validate publisher terms, commercial and AI-use rights, scope, redistribution and retention; record a signed independently approved receipt where necessary.
3. Validate dataset schema, language, product identifiers, snapshot provenance, update cadence, timestamps and mismatch/quality thresholds.
4. Develop bounded server-side ingestion (no direct regulator API access from iOS/Android), tenant and rights authorization, time-of-use revalidation, sanitized errors and replay protections.
5. Reconcile with canonical medicines, clinical relevance and evidence boundaries without assuming that authorisations equal sales, prices equal transaction prices or safety reports equal incidence.
6. Admit a regulated snapshot only after audited rights and acceptance; certify protected staging, security, data quality, monitoring and rollback before customer release.

**Release classification:** This proposal is non-customer and private-only. No workflow may deploy or publish based on these research-file changes. The 101-country *scope* target is not a 101-country *integration completion* claim.

## Country-by-country status output (no source publication)

This draft now derives **101 explicit national release rows** from two separate, pinned inputs: the original 77-country/101-source discovery register and the 24-country research-only proposal. No records are fabricated for countries without verified datasets.

- `src/core/intelligence-country-101-proposed-ledger.mjs`: immutable, fail-closed country status, native ISO identity, zero approval and customer-live flags.
- `scripts/render-intelligence-country-101-proposed-ledger.mjs --json`: auditable national release readiness in machine-readable form.
- `scripts/render-intelligence-country-101-proposed-ledger.mjs --markdown`: owner-facing 101-country table with status and next evidence gate.
- `scripts/test-intelligence-country-101-proposed-ledger.mjs`: negative tests reject fictional national rights, fabricated source entries, altered ISO/region/directory claims and accidental production classification.

The dedicated pull-request audit must execute both the registry/release ledger and the AWS/public deployment-routing regression suite on the same exact GitHub commit. **New geography is not new regulatory source ingestion:** the 24 additional countries have 0 registered national datasets, 0 coded adapters and 0 verified customer-live coverage. The original 77-country ledger remains the canonical statement of existing 101 candidate source references, including the two supranational/global groups.
