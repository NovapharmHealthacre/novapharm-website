# NovaPharm Intelligence — Enterprise mobile and global pharmaceutical data controls

**Reviewed 17 November 2026. Status: source-code candidate, not launched.** A registry entry is not a working integration or an intellectual-property permission.

## Platform architecture

1. **Sources** — national regulators and official API/download data, research, trial, prices, utilization, safety and licensed commercial sources.
2. **Registry** — 101 versioned discovery candidates with unique machine keys, official URLs, status, terms review, rights evidence, data-admission status and active adapter pointers.
3. **Rights authority** — a separate trusted *server-side* service must verify the actual publisher, country, permitted commercial purpose, caching/redistribution/export/AI, expiry and revocation. App-controlled booleans do not confer rights.
4. **Fixed-host adapters** — backend-only, request bounded. The five coded candidates are US FDA Drugs@FDA, Spain CIMA, Canada DPD, ClinicalTrials.gov and Europe PMC. There is no production activation.
5. **Quarantine and immutable provenance** — source identity, original payload SHA-256, retrieval and publication times, licence receipt, schema version, rejection/ambiguous cases, replay and rollback.
6. **Canonical medicine graph** — country-native identifiers, substance, strength, form, route, pack, marketing authorization, effective dates and independently reviewed crosswalks. Same name does not imply clinical equivalence.
7. **Data fact store** — separate regulatory authorisation, prescribing, reimbursement, official ceiling/list prices, tender awards, manufacturer stock and real paid transactions by channel, time, currency, pack and geography.
8. **Protected service** — Cognito full-MFA identity, tenant ABAC, subscription/seat/rights, privacy, quota, redaction, audit, source revocation and independent clinical/commercial admission.
9. **iOS, Android and web** — same controlled server API, not direct client calls to regulator endpoints or confidential customer data.

## Discovery status and evidence boundaries

The version 2 schema (docs/intelligence/global-source-candidate-v2.schema.json) requires a stable candidate key and explicit authority, terms, legal, runtime and data-admission fields. All 101 currently remain not-reviewed, pending authority and terms checks, not-admitted, with no active adapter.

src/core/intelligence-global-evidence-contract.mjs validates the shape of an INTERNAL backend-issued short-lived rights decision: exact source, tenant, country, domain, purpose, allowed uses, licence, receipt, issue/expiration and no revocation. This contract is NOT signature verification and is NOT a legal authorisation on its own. Any authorized internal preview carries a SHA-256 response fingerprint and canPublish=false; it cannot self-admit or be sent to customers.

src/core/intelligence-global-canonical-candidates.mjs preserves native identifiers including leading zeroes. A market-fact candidate cannot be accepted without nation, original product code, source checksum, period, channel, unit, measure and non-production status. Monetary observations additionally require an explicit price class (ceiling, list, reimbursement, procurement award, verified transaction), currency, decimal amount, pack basis and effective date. Cross-country comparability is always false until independently verified.

## Country/data development sequence

**P0 UK:** Finish the rights-approved Apixaban six-view pilot in the web platform, private data authority, real founder/second-tenant full MFA and negative tests. Search, Overview, Identity, Evidence, Observed Market and Geography cannot publish unsupported facts.

**P1 APIs:** Verify rights, API response, rate limits, schema and versioning one source at a time for US FDA, Spain CIMA, Health Canada DPD, ClinicalTrials.gov and Europe PMC. Then develop Denmark Medicinpriser, Poland NFZ, South Korea MFDS/HIRA, Singapore HSA, Australia PBS and EMA PMS beta only after endpoint acceptance.

**P2 government files:** Build hash-verified bounded ingestion for current NHSBSA EPD with SNOMED, Ireland HPRA XML, France BDPM/Open Medic, Malaysia NPRA Parquet, Brazil ANVISA/CMED, Australia TGA and South Africa SEP. **The old NHSBSA EPD is retired**; the newer SNOMED dataset has separate identifiers and guidance: https://www.nhsbsa.nhs.uk/access-our-data-products/open-data-portal-odp and https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code .

**P3 commercial coverage:** IQVIA MIDAS, Citeline, GlobalData, DrugBank and controlled global terminologies only after price/usage/licence approval. Regulatory registers alone cannot establish market share or pharmaceutical sales.

## Enterprise release controls

- **Licensing:** commercial reuse, medical sensitivity, AI training/input/output, geographical restriction, cache/export, attribution, expiry and revocation require source-specific legal evidence.
- **Clinical/commercial:** no diagnosis, therapeutic substitution, medical certainty, unverified product status, stock, price, market share or forecast from source previews.
- **Identity:** original national products/pack codes and effective-date crosswalk; rejected and ambiguous records remain explicit.
- **Security:** zero client secrets, TLS, fixed upstream hosts, bounded requests, no redirects, role and tenant isolation, audience and nonce verified at backend, short-lived sessions and durable revocation.
- **Resilience:** structured non-sensitive telemetry, schema drift, immutable source snapshot, rate and cost ceilings, backup/restore, rollback, stale-data indicators and fail-closed source removal. No new paid infrastructure without approval.
- **Mobile:** secure system-browser PKCE login, device storage review, consent, native OS navigation, scalable typography, VoiceOver/TalkBack, safe areas, RTL, tablet support, reduced motion and offline-denial states.
- **AI:** source-specific permission, human review, provenance, versioned model/system cards, no unlicensed model training, automated prescribing, tender bidding or clinical decisions.
- **Release:** exact SHA checks, lockfiles, iOS/Android simulator and physical device, signing, app privacy disclosures, app-store review and independently verified runtime activation.

## Platform design sources

Apple HIG: https://developer.apple.com/design/human-interface-guidelines/
Apple typography/Dynamic Type: https://developer.apple.com/design/human-interface-guidelines/typography
Apple Icon Composer/app icons: https://developer.apple.com/icon-composer/ and https://developer.apple.com/design/human-interface-guidelines/app-icons
Apple privacy/TLS: https://developer.apple.com/design/human-interface-guidelines/privacy and https://developer.apple.com/documentation/security/preventing-insecure-network-connections
Android adaptive navigation: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
Android data layer: https://developer.android.com/topic/architecture/data-layer
Android security: https://developer.android.com/privacy-and-security/security-tips
Expo SDK: https://docs.expo.dev/versions/latest/

Use Apple HIG and Android standards as platform-specific references while retaining the approved original NovaPharm product identity and red #E3120B accent. Do not redistribute Apple proprietary fonts or icons or claim that React Native is the same as native SwiftUI. The approved Swift Nova ML research package remains separate and has no production app entitlements.

## Automated source contract checks

- node --test scripts/test-intelligence-global-source-gateway.mjs
- node --test scripts/test-intelligence-global-canonical-candidates.mjs
- node --test scripts/test-intelligence-global-source-registry.mjs
- node --test native/novapharm-intelligence-mobile/tests/mobile-contract.test.mjs

The dedicated GitHub workflow also TypeScript-checks and exports JavaScript bundles for both platforms. A successful bundle export is **not** evidence of native signing, real-device QA, regulator licence, mobile production authentication or customer release.
