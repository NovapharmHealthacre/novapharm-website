# NovaPharm Intelligence — real public pharmaceutical API connectivity

**Date:** 18 November 2026  
**Scope:** US FDA Drugs@FDA and Singapore HSA therapeutic products — two official read-only upstream sources.  
**Not** an AWS deployment, a data licence approval, a production ingestion, a customer-accessible read, or a 77-country rollout.

## Verified official public interfaces

| Source | Exact allowlisted GET URL | Canonical local ID | Validated schema |
|---|---|---|---|
| US FDA Drugs@FDA | `https://api.fda.gov/drug/drugsfda.json?limit=1` | `results[0].application_number` | `meta.last_updated`, `meta.results.total`, `results[0].products[0].brand_name` |
| Singapore HSA | `https://data.gov.sg/api/action/datastore_search?resource_id=d_767279312753558cbf19d48344577084&limit=1` | `result.records[0].LicenceNo` | exact `result.resource_id`, `fields` including `LicenceNo` and `Productname`, `records[0].Productname` |

Source documentation:
- FDA original dataset and provenance: https://api.fda.gov/drug/drugsfda.json?limit=1 and https://open.fda.gov/apis/drug/drugsfda/
- FDA rights statement: https://open.fda.gov/license/ — much openFDA data is public domain/CC0 unless exceptions apply; **service terms and GMDN third-party rights** can still restrict certain downstream uses. Never use this alone as an authorisation decision for all data.
- HSA public registered-therapeutic-products dataset: https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view
- HSA platform API mechanics: https://guide.data.gov.sg/developer-guide/dataset-apis/search-and-filter-within-dataset

**Public-source verification:** FDA and Singapore HSA return actual JSON records at their documented public endpoints. Separate deployment-side execution of the exact one-record bounded live-probe script has not been verified until the GitHub workflow finishes; current data rights and service availability could change.

## Implemented GitHub-only code

- `src/core/intelligence-official-live-pharma-probes.mjs`: fixed official HTTPS URLs (not caller-controlled), only one record per source, 8-second deadline, 128 KiB maximum response, strict JSON and source ID/field matching, rejects redirects, HTTP failures and invalid clocks, SHA-256 of exact source bytes.
- `scripts/test-intelligence-official-live-pharma-probes.mjs`: synthetic positive and malicious negative contracts covering no SSRF, no unauthorized publication, spoofed IDs, schema, oversize, redirects, upstream errors, and timing.
- `scripts/run-intelligence-official-live-pharma-probes.mjs`: reads both real public sources using Node fetch, emits only source-ID/hash/size/observed-timestamp evidence receipts, never full records, price/clinical advice, or claims of active customer delivery.
- `.github/workflows/intelligence-official-live-pharma-probes.yml`: source-only Node 24 tests, two bounded official public HTTP calls on PR or manual dispatch, 7-day receipts-only artifact. Zero new AWS account, database, transport service or source credential.
- `server.mjs`: proposed protected `GET /api/v1/intelligence/sources/official/public-live-probe?sourceId=...` route checks independent `board` session scope, rate-limits to two requests per minute per network fingerprint, enforces an explicit **default-OFF** server-side `NPI_OFFICIAL_PUBLIC_SOURCE_PROBE_ENABLED` flag, supports only the two source identifiers, and returns sanitized failures. It is not active merely because code is committed. The response is a receipt, **not** medicine records.
- `scripts/test-intelligence-official-live-pharma-server-gate.mjs`: static route-boundary regression checks; it does not replace full deployed/authenticated end-to-end acceptance.

### Verification stages that must remain distinct

1. **Official source discovery:** registered country-source authority and API documentation.
2. **Source-live HTTP probe:** real request + schema-bound single-record response + immutable observation receipt.
3. **Rights-reviewed and admitted:** independently approved source-specific licences, permissions, historical and current dataset snapshots, provenance, native-country medicine identity reconciliation, no clinical/market inference.
4. **NovaPharm production connected:** protected, isolated, monitored runtime; ingestion/reconciliation and audit logs; revocation; deployed production data paths; customer privacy/ABAC; signed web/mobile read-only acceptance and rollback.

This PR implements source-live read code, a default-off protected application route and a real-source CI probe as a candidate for stage 2. It **must not** transition stages 3 or 4 from an observed public HTTP result or a green CI job. The 77-country register remains 101 entries, 77 national countries plus EU/EEA and Global; no country is certified customer-live.

## Running the checks

```bash
node --test scripts/test-intelligence-official-live-pharma-probes.mjs
node scripts/run-intelligence-official-live-pharma-probes.mjs > /tmp/official-live-source-receipts.json
```

The second command makes exactly two outbound public HTTP reads; never store sensitive credentials in URLs or print raw upstream records. It is safe to run from a non-production, non-customer environment only. Publisher outages and schema changes fail the workflow rather than inventing successful connectivity.

## Next actual integration steps

After the exact-head CI passes, verify publisher legal terms for each data class, approve independent source-specific rights, build versioned controlled source ingestion into the protected data-admission pipeline, establish authorized per-tenant source access, and validate real staging and production end-to-end reads. Without connected AWS, protected deployment and authenticated customer access cannot be verified here.


## New protected in-memory live-source quarantine path

`createOfficialLivePharmaQuarantineReader` in `src/core/intelligence-official-live-pharma-probes.mjs` now connects the **actual official source HTTP response bytes** directly to the existing `buildSourceSnapshotQuarantine` contract for FDA and HSA, rather than stopping at a connectivity receipt. It still has **no public route, filesystem write or database write**.

The reader requires four independent, backend-injected services: a trusted tenant/source/domain bound rights authorizer, a protected publisher release inventory (dataset ID, schema version and genuine publication/observation dates), a bounded official HTTP transport, and a trusted monotonic server clock. It verifies rights before the network call and **again after** quarantining the versioned raw sample; any revocation, licence/receipt/version rotation, expired grant or rollback denies the result. The untrusted source cannot pick its own dataset identity or invent source release dates. The resulting evidence contains a digest and **no medicine or patient records**, with `canPublish:false` and `productionAccepted:false`.

Additional regression coverage: `scripts/test-intelligence-official-live-pharma-quarantine.mjs` tests valid synthetic publisher response shapes, strict data release identity, fixed tenant controls, revoked and expired rights, fingerprinting, no source records in returned JSON, and failure if the authorised clock moves backwards.

**This is a live-ingestion plumbing candidate for internal, strictly quarantined evaluation**, not a completed live production medicine database. The protected release inventory and actual commercial source licence review are not connected in the current AWS-disconnected session. No legal approval, full snapshot or customer admission can be inferred from the synthetic rights fixtures.


## Official source-specific terms and throttling review (18 November 2026)

**US FDA Drugs@FDA / openFDA**
- The FDA licensing page: https://open.fda.gov/license/ states openFDA data is generally public-domain / CC0 and may be commercially reused, subject to site terms, third-party rights, privacy/publicity, patent and trademark exceptions. Its GMDN medical-device restrictions must not be assumed to license GMDN terminology, mapping or AI training.
- The source API itself includes `meta.terms`, `meta.license`, `meta.last_updated`, and a disclaimer warning that API observations can be unvalidated for medical care. The live quarantine reader requires the specific `meta.last_updated` calendar date to match the independently supplied publisher-release `publishedOn` date exactly.
- FDA data alone does not establish a medicine's current UK licence, actual market availability, price or clinical suitability.

**Singapore HSA registered therapeutic products**
- The specific publisher page https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view identifies HSA's **Listing of Registered Therapeutic Products (2026)**, 12 named columns, about 5,500 entries, **last updated 7 August 2026**, and an approximately six-month dataset refresh cadence. These facts are publisher-page descriptions; the one-row probe cannot certify full coverage or update freshness.
- The same dataset page says **free for personal or commercial use under the Open Data Licence**. The full https://data.gov.sg/open-data-licence (or equivalent official https://developers.data.gov.sg/open-data-licence) should be retained in a dated, source-specific rights decision, including attribution, restrictions and permitted downstream/sub-licensing uses. Avoid assuming a blanket right to resell independent API access, to train models, or to reuse third-party material.
- Publisher API rate guidance https://guide.data.gov.sg/developer-guide/api-overview/api-rate-limits states unauthenticated `datastore_search` access is **4 calls per 10 seconds** (higher tiers require API keys). The dedicated runner makes **one request per HSA probe, no retry**, and fails closed on 429. A real multi-tenant customer service requires a **distributed cross-instance rate budget** and approved production API key/tier rather than the present network-fingerprint limiter.
- Query docs https://guide.data.gov.sg/developer-guide/dataset-apis/search-and-filter-within-dataset identify `resource_id`, `limit` and exact column-keyed JSON search syntax; dataset versions can change.
- The dataset is **product-registration evidence**, not current inventory, dispensing, price or adverse-event incidence.

**Approval boundary:** These are authoritative public statements and concrete legal review inputs, not a signed NovaPharm legal or clinical data-admission decision. Source rights and production admission remain unverified, even if the bounded public GET succeeds.
