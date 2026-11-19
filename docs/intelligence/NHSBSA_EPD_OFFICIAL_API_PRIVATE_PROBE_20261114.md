# Official NHSBSA EPD API — private integration (14 November 2026)

**Status: source implementation, private review only. NOT live customer Medicine Search, licensed third-party terminology, an accepted identity register, or a full ingested dataset.**

## Publisher and API

Publisher: NHS Business Services Authority. Dataset: https://opendata.nhsbsa.net/dataset/english-prescribing-dataset-epd-with-snomed-code

CKAN API endpoints:
- https://opendata.nhsbsa.net/api/3/action/package_show?id=english-prescribing-dataset-epd-with-snomed-code
- https://opendata.nhsbsa.net/api/3/action/datastore_search

The NHSBSA EPD page advertises Open Government Licence 3.0 for NHSBSA copyright material, gives the acknowledgement wording "NHSBSA Copyright 2025", and explicitly reserves the rights of third parties. BNF, dm+d, and SNOMED CT reuse, commercial redistribution and AI-use rights require separate source-specific analysis and permission where applicable. An API response is not such a licence. The EPD reports historic community prescribing in England, not live medicine inventory or wholesale demand; code meanings are period-specific.

## What is implemented

- Private read-only module: src/core/intelligence-nhsbsa-epd-private-api.mjs
- Board-only server route: GET /api/v1/intelligence/sources/nhsbsa/epd/private-probe
- The route is OFF unless a separate server configuration explicitly sets NPI_NHSBSA_PRIVATE_API_PROBE_ENABLED=true; it also requires a verified board session and enforces a four-requests-per-minute limit
- API requests use the fixed official HTTPS origin, dynamic publisher-verified resource UUID and exact optional 15-character BNF presentation code
- Parameters: period=YYYY-MM, presentationCode=exact BNF code, limit=1 to 5
- At most one metadata lookup and one DataStore GET per request; strict response byte limits, validation, no arbitrary URLs, no SQL and no bulk download
- Only hashes and a tiny unapproved ITEMS/NIC private sample are returned. Raw practice, product, BNF and SNOMED fields are never returned
- No accepted medicines, source rights, database writes, licence grants, customer entitlements or customer access are generated. The existing production Medicine Search route is unchanged
- The focused CI test suite uses fake publisher responses. It does NOT claim a successful real API connection

## Second identity

One owner-supplied real email was staged in the existing NovaPharm Intelligence Cognito production customer pool. A user was created with MessageAction SUPPRESS and then disabled. Its email is unverified, no invitation was sent, no password was revealed, and no tenant or customer permissions were granted. The similarly named account in Nutraxin staging is not an Intelligence session.

This staged account is not yet an independent authenticated second tenant. A trusted identity administrator must arrange a controlled invitation, establish ownership and MFA, define separate real test tenant memberships and verify cross-tenant isolation and revocation before live approval.

## Production launch gates

1. Independent source and field-level rights determination, appropriate BNF/SNOMED/dm+d permissions and a signed revocation-aware source-rights grant.
2. Full immutable source QA, exact dated medicine identity crosswalk, accepted evidence, unique MongoDB rights/evidence/manifest/audit indexes and audited ingestion.
3. Persisted authenticated backend with source/tenant permissions, operational API fair-use controls, logs, monitoring and rollback.
4. Two genuine MFA-backed, separately scoped internal tenant sessions with negative and revocation tests.
5. Owner-approved zero-incremental-cost architecture and a signed-off immutable build/deployment.
6. Only after all gates: independent commercial and security acceptance for an actual customer search.

Sources:
- https://opendata.nhsbsa.net/pages/terms-and-conditions
- https://docs.ckan.org/en/latest/maintaining/datastore.html
- https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- https://www.pharmaceuticalpress.com/services/content-licensing-and-integration/
- https://www.snomed.org/licensing
