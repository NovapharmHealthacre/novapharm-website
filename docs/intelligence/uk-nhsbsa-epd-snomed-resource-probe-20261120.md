# NHSBSA EPD with SNOMED — bounded public-resource metadata probe

**Scope:** source-only GitHub Actions candidate, 20 November 2026; **not** a licensed prescribing data feed, official NHSBSA acceptance, or web/iOS/Android production integration.

NHSBSA retired the original English Prescribing Dataset and moved to EPD with SNOMED CT codes. Official publisher references:

- Current dataset: https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code
- Pinned historic-May-2026 metadata resource: https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code/resource/004d6f4e-9881-4312-82dc-094f9a543885
- Official transition notice: https://opendata.nhsbsa.net/news/updated-dataset-available-epd-with-snomed-ct-codes-on-the-open-data-portal
- NHSBSA open data overview: https://www.nhsbsa.nhs.uk/access-our-data-products/open-data-portal-odp
- NHSBSA public-data licence conditions: https://www.nhsbsa.nhs.uk/data-hub-end-user-agreement

## Exact technical boundary

One fixed government `GET` request to CKAN `resource_show?id=004d6f4e-9881-4312-82dc-094f9a543885`. This requests resource **metadata only** (not `datastore_search`, download, or prescribing records). No redirect, dynamic URL, credentials, subscription, customer browser fetch or background task. Responses are streamed with a 256 KiB cap and a deadline. Validation pins the resource ID, May-2026 SNOMED resource name, CSV format and official publisher URL. The source module never follows the CSV download link.

A passing receipt includes one timestamp, size, SHA-256 of response, and fixed official resource identity; no raw metadata, prescription values or patient identifiers are returned. A subsequent production adapter must independently select a **current** published period rather than treating this pinned historical May-2026 sample as live/fresh.

**Rights and interpretation:** The dataset page states OGL 3.0 with attribution; NHSBSA also warns that third-party data retain their own rights. SNOMED CT/BNF rights and permitted downstream AI/commercial redistributions are **not independently signed off**. EPD covers prescriptions associated with England and is retrospective, not UK-wide sales, live stock, medicine authorisation, or product availability.

Release gate defaults remain `canPublish:false`, `publisherDataAdmitted:false`, `customerCountryLive:false`, `snomedTerminologyRightsReviewed:false`, `sourceRightsIndependentlyApproved:false`. Existing research catalogue for 77/101 countries is unchanged. No AWS/Atlas/SharePoint production write is performed.

## Independent acceptance outstanding

1. Observe actual publisher API response on an exact-head CI run; if blocked or format changed, fail closed rather than claim live API connection.
2. Review publisher licence, attribution, terminologies and source-specific reuse exceptions.
3. Design period selection, schema mapping, source revisions/revocation, snapshot provenance and tenant-scoped rights.
4. Complete private staging ingestion, signed evidence, secure web and native preview integration, and independently verified production deployment.
