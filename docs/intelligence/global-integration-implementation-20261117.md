# Global pharmaceutical ingestion + mobile implementation: first guarded code

**Status:** Candidate code only; no production licence, live API connection, private medicine data, cloud spend or app release.

## What exists

1. Research register: docs/intelligence/global-pharma-sources-20261117.json contains 101 national/global candidates and flags EVERY candidate as rights not reviewed / not connected.
2. Country/domain research: docs/intelligence/global-pharma-api-blueprint-20261117.md.
3. Backend candidate: src/core/intelligence-global-source-gateway.mjs adds **five** bounded query/normalizer implementations for official documented interfaces:
   - US FDA Drugs@FDA, search by brand name (not a sales dataset);
   - Global ClinicalTrials.gov v2, study discovery (not proof of clinical benefit);
   - Spain AEMPS CIMA, medication search (not Spanish pack sales).
   - Health Canada Drug Product Database, brand/DIN metadata (not Canadian sales or live stock).
   - Europe PMC literature discovery (not rights to republish journal full text).
4. Expo SDK 58/React Native mobile candidate: native/novapharm-intelligence-mobile. It displays the canonical 22-workspace navigation catalogue and the 101 source candidates, without login, protected data or commercial claims.

## Run source contract tests

From the repository root using Node 24:

    node --test scripts/test-intelligence-global-source-gateway.mjs
    node --test native/novapharm-intelligence-mobile/tests/mobile-contract.test.mjs

A network call is never made during these tests. The source reader cannot initiate a request until an injected trusted server-side rights authorizer grants a dated, source-and-tenant-scoped review; it then uses a fixed upstream host, GET-only, a timeout, response media checks, bounded size and schema checks. A successful result is tagged **unreconciled_upstream_preview** with **canPublish: false** and must never flow directly to a mobile customer or dashboard.

## Source-rights and data acceptance

The source-authorizer must be implemented at the protected backend boundary and based on independent, signed authoritative permissions. It must validate source, tenant, purpose, jurisdiction, licence scope and revocation. A client-controlled boolean, mock callback or compiled library call is not an acceptable substitute.

Future production ingestion requires:
- Official source URL, exact API contract, rate rules, documentation and terms individually verified.
- Separate commercial, AI, caching, derivative insight, export, redistribution, retention and geography permission records.
- Signed source manifest and SHA-256 of each ingested immutable object, dates and exact query terms.
- Quarantined staging, bounded pagination, full backfill checks and sample-vs-population accounting.
- Country-native identifiers plus reviewed substance/pack crosswalk; no guessed clinical equivalence.
- QA promotion approval, tenant rights, stale/withdrawn-data handling, rollback, monitoring and full audit.
- A protected API with short-lived Cognito MFA, audience/nonce verification, scoped sessions, explicit tenant ABAC and revocation. All licenses and server keys stay off mobile devices.
- Country-specific currency, packs, price type, payer/channel, as-of date and original publisher attribution.
- Independent commercial/legal review before displaying any results as live or reselling data.

## Sequencing

**P0:** Accept one UK medicine identity in six governed workspaces and complete MFA/two-tenant proof. Next, approve and test the five candidate API adapters.

**P1:** Add France, Canada, Denmark, Poland, Singapore, Korea, Australia, EU/EMA where documented, permitted and needed. Every adapter separately reviewed and tested.

**P2:** Add file ingestion with hashes and snapshot archiving for UK NHSBSA, France, Ireland, Malaysia, Brazil, Australia, South Africa and wider country registers.

**P3:** Negotiate commercial market feeds (IQVIA/Citeline/GlobalData etc.) if economics and licensing support it, then expand to the other countries in the register. No automatic live sales, shortage, pricing or market-share claim.

## Known unverified release work

Not installed/tested on Apple or Android devices; package-lock not generated; Expo/RN compat not checked locally; app icons and bundle IDs not approved; no backend Cognito mobile client or redirect; no app store accounts/signing; no source-rights receipts; no live production source adapters; no verified commercial licence. These remain mandatory launch gates, not a percentage that can be claimed complete.
