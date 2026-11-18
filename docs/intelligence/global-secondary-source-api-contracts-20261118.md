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
