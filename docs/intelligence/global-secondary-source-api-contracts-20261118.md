# NovaPharm Intelligence — two distinct national source API contracts (18 November 2026)

**State: backend-only candidate code, no real upstream connection or production data.**
This supplements the five initial API gateway candidates; global PubMed/ChEMBL/PubChem are handled separately by PR #830 merged via #807. It does **not**
activate an external feed, grant a licence, load Atlas, claim the 101 candidate sources
are integrated countries, or distribute private data via the mobile applications.

## Added bounded API-read candidates

| Source ID | Authority / dataset | What may be previewed in separately authorised internal evaluation | Authority documentation |
| --- | --- | --- | --- |
| sg-hsa-products | Singapore Health Sciences Authority / data.gov.sg registered therapeutic products | Licence number and product name from a **specific 2026 HSA dataset**, not live national sales | https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view |
| gb-nhsbsa-dataset-catalogue | NHSBSA Open Data Portal CKAN | **Dataset discovery metadata only**; NOT EPD prescribing records or SNOMED/dm+d identity | https://opendata.nhsbsa.net/pages/documentation |

Each reader uses a source-specific fixed HTTPS origin and endpoint, GET-only, no redirects or ambient cookies,
bounded upstream bytes/records/time, exact ID preservation, Unicode spoof rejection, response schema checks,
and a separate trusted source/tenant/country/domain/purpose-specific rights-authorisation callback.
Requests are refused before transport for unapproved grants. Postfetch clock/expiry checks prevent
expired receipts from generating previews. A successful synthetic test can only produce
**unreconciled_upstream_preview; canPublish=false** with a raw response SHA-256 and evaluation receipt ID.

## Explicit limitations and release blockers

- Both newly added contracts are isolated from customer HTTP routes and native clients.
- Unit tests use **mocked** payloads; they do not prove external endpoint availability, real API versions,
  service quotas, host-level response structure on 18 November, completeness, licence or data quality.
- The HSA source listing states the 2026 dataset was last updated 7 August 2026 and is updated
  approximately every six months; a query is **not** a real-time approval/stock/sales feed.
- The NHSBSA source uses only the dataset catalogue. NHSBSA requires dataset-level licence review,
  publisher attribution and fair-use/high-volume controls. Its BNF/SNOMED/dm+d terms must be checked
  independently before ingesting detailed EPD facts.
- Global PubMed, ChEMBL and PubChem are deliberately NOT duplicated in this adapter; PR #830 owns their source IDs and tests.
- No API secrets, subscriptions, data sales licence, AWS connection, real client authentication,
  regulator approval or customer/data release is created.


## Offline Singapore HSA full CSV candidate

The official HSA dataset also has a CSV file (about 5.5k rows / 1.3 MB in the 2026 publisher listing). The separate `intelligence-singapore-hsa-bulk-candidate.mjs` module provides an **offline-only** candidate validator that accepts trusted server-supplied bytes, not an upstream download URL. It requires the same independent source/tenant/country/domain/purpose evaluation receipt **before processing**.

- Validates exact publisher-documented 12 column names, UTF-8, quoted commas and escaped quotes, CSV row widths, and bounds of **16 MiB / 30,000 rows / 4,096 characters per field**.
- Preserves HSA `LicenceNo` strings verbatim, quarantines invalid identity records, flags duplicate licence identifiers, counts all rows, and exposes at most five non-publishable identity previews.
- SHA-256 hashes the supplied file bytes and re-checks trusted time/rights expiry after parsing.
- Explicitly sets file authenticity, publication date verification, national completeness, commercial/clinical decision use, production acceptance and customer access to **false**. Synthetic rights receipts are tests only.
- This is **not a completed full-file ingestion pipeline**: no download/streaming scheduler, source-authenticated signed release, schema mapping to the national medicine graph, durable staging, independent legal permission or private Atlas deployment exists.

```
node --check src/core/intelligence-singapore-hsa-bulk-candidate.mjs
node --test scripts/test-intelligence-singapore-hsa-bulk-candidate.mjs
```

## Verification

Run using Node 24 at the repository root:

    node --check src/core/intelligence-global-secondary-source-gateway.mjs
    node --test scripts/test-intelligence-global-secondary-source-gateway.mjs

This work should remain under #808 until official API contract checks with permitted usage,
independent source-specific rights receipts, quarantined live ingestion, tenant authorization,
audit/rollback and publish acceptance succeed. Never use a CI pass as proof of production rights.

## References

- Singapore HSA dataset and 2026 data update: https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view
- NHSBSA licensing and fair-use obligations: https://opendata.nhsbsa.net/pages/terms-and-conditions
- EMA PMS **beta** remains a separate onboarding/terms gate, not enabled here:
  https://plm-portal.ema.europa.eu/Guidance/article/KA-02917/en-us

## GitHub-only production publication isolation

This secondary national-source contract is **private research source**, not a contact,
marketing, billing or customer publication. A main-branch merge of these files must
not dispatch an AWS contact release or overwrite public GitHub Pages. Both the
contact dispatcher and the public publisher independently classify all six source
and contract paths as private; the three publication-guard files are neutral only.
A guard repair must include a protected source-document or contract change, so its
own first-parent diff is recognised as private; guard-only workflow changes do not
silently suppress genuine public publication.

Run `node --test scripts/aws/contact-release-routing.test.mjs` alongside this
module's source-contract tests. The test requires exact file-path coverage and
rejects accidental suppression of real public contact, Nutraxin and website
publication paths. Owner approval and separate rights/staging validation remain
required for any real pharmaceutical-data ingestion.
