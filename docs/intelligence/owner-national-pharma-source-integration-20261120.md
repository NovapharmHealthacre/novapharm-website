# Owner-supplied 77-country pharmaceutical source reconciliation (20 November 2026)

**Status: SOURCE-ONLY / REFERENCE METADATA / NOT APPROVED FOR MEDICINE DATA INGESTION OR CUSTOMER RELEASE.**

## Provenance and scope
- Owner-uploaded Markdown original SHA-256: `60035222fd8feab1fe6c318d791b56a336595d022dc76dc0b27e406da82cc83c`.
- SharePoint archive (existing internal Engineering Verification folder): `country-pharmaceutical-source-inventory-owner-supplied-2026-11-20.md` under NovaPharm Tier 1.
- Exact attachment table coverage: **77 named national countries and 86 linked source references**. The document also contains narrative caveats; the archive preserves those in their supplied context. Some linked sources are portals or downloads rather than APIs.
- **All 77 national entries match** the existing 77 countries with registered candidates in the canonical 101-country catalogue. The separate additional 24 jurisdictions remain research geography only.
- Derived, machine-readable, non-authoritative metadata: `docs/intelligence/owner-national-pharma-source-brief-20261120.json`. Each link carries `sourceVerified:false`, `accessLicensed:false`, `apiConnected:false`.
- No existing canonical source candidate keys or licensing decisions have been rewritten.

## Three-client parity
- Protected web: `apps/portal/components/country-source-coverage.tsx` shows each country's supplied research requirements and the 86 reference links with an explicit **not verified / API not connected** disclosure.
- iOS and Android: `native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx` imports the **same** JSON artifact and displays owner-supplied needs/source names in the offline country directory. No direct upstream API calls or credentials are introduced.
- Regression contract: `scripts/test-intelligence-country-client-catalog.mjs` checks exact 77/86 coverage, canonical ISO parity, HTTPS-only reference formatting, no source rights or live API claims, and shared web/mobile imports.

## Data and runtime authority boundary
| System | Authorized function now | Not authorized by this change |
| --- | --- | --- |
| SharePoint | Internal versioned research source and engineering evidence archive | Public anonymous source publication; Board-only clinical/commercial data without effective ACL verification |
| GitHub | Peer-reviewable, deterministic reference metadata and offline UIs | Live pharma data admission, production deployment, signed app release |
| AWS | Existing governed authentication, data-ingest quarantine, server-side API gateway and CloudWatch foundations **for later review** | New spending, unrestricted source scraping, changes to API/domain routing or active customer endpoints |
| MongoDB Atlas | Existing source registry and rights/evidence collections **for later approved admissions** | Storing third-party medicine rows without rights grants, schema/provenance checks and G2 unique-index migration |
| Web/iOS/Android | Supplemental, clearly unverified publisher and research references | Live medicinal product/price/stock/market-share representations |

## Path to genuine API integration (each source independently)
1. Verify official publisher identity, endpoint availability, versioned schema, rate limits and rate-limit ownership; classify **API / downloadable dataset / portal / restricted feed / discovery** separately.
2. Obtain evidence of permitted access, commercial redistribution, AI/derived use, attribution, geography, retention and revocation. A public website or API URL is not a licence.
3. Implement a **server-side allowlisted, bounded read adapter** with no raw browser/mobile credentials, strict HTTPS, timeouts, response size and schema limits, sanitised logs and source-specific tests.
4. Store unapproved raw observations in governed quarantine only where legally allowed; reconcile source hash, source period, identifier scheme, products versus brands, unit/pricing type, and rejected/ambiguous mapping.
5. Complete unique indexes, tenant authorization, audit/restore and independent source-rights approval **before** any Atlas production medicine admission or public publication.
6. Prove exact deployed AWS version/route, no-op and denial tests, privacy protections, iOS/Android signed-device access, source freshness and rollback.
7. Maintain the standing owner constraints: `productionSignoff: not_granted`, no new chargeable resources, no unapproved medicine-data admission, no customer billing or protected production cutover.

**Caveat:** Integration of owner-supplied research metadata into all three clients does **not** satisfy an API live-data integration or the worldwide source licensing programme.
