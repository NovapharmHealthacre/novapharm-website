# Australian PBS public monthly schedule — controlled candidate, 18 November 2026

**Release state: OFFLINE-CANDIDATE ONLY.** A documented Australian Government subsidy schedule is not a real-time price quote, stock database, general ARTG register, safety report, prescribing volume or national medicines inventory. This file grants no publisher rights.

## Verified publisher documentation

- Australian Government PBS official API overview (updated 12 Nov 2026): https://data.pbs.gov.au/document/91327.html
- Public access guidance: https://data.pbs.gov.au/api/api-public.html — public schedule and preceding 12 months, no login needed to use public collection; **one request every 20 seconds shared across all concurrent public users**. Batch monthly snapshot retrieval only.
- Publisher-linked Postman collection: https://www.postman.com/hpps/workspace/pbs-public-data-api/collection/33098837-829fc4a1-741d-4807-b524-a492afe522bb
- Data Dictionary v3.8 and Data Model v3.8, both November 2026, linked from the PBS API overview. Preserve individual schedule_code, effective_date, revision_number, item/pack and restriction identifiers; never assume schedule_code is sequential.
- The publisher recommends using the schedules endpoint before other endpoints, and downloading only when the new schedule is released, ordinarily the first day of each month.

**Not verified:** a live authoritative response body or the precise current integration query scheme and resource headers; source-rights/AI redistribution approval; successful authentication/connection from NovaPharm infrastructure; a central shared publisher rate-lease; national record counts; production data integrity, customer access or deployment.

## Code contract

- `src/core/intelligence-au-pbs-schedule-quarantine.mjs` accepts only locally supplied **at most 512 KiB** UTF-8 JSON evidence (not a publisher connection).
- Parses a conservative synthetic candidate `data` array of at most 1,000 published schedule metadata records; rejects embargo/draft status, malformed dates, duplicate schedule identities and unsafe source identifiers. Preserves local code spelling such as leading zeros.
- Requires pre- and post-parse checks against a **trusted backend** rights authorizer for the precise tenant, jurisdiction AU, reimbursement domain and internal-evaluation purpose; rejects revocation/rotation/expiry.
- Produces immutable source SHA-256, up to five preview schedule records and explicit immutable `canPublish=false`, `productionAccepted=false`, `sourceRightsIndependentlyApproved=false`, `distributedPublisherRateLeaseObtained=false`, `liveRetailOrInventoryDataPresent=false` indicators.
- No fetch/transport method, no external API key, no customer-readable endpoint or Atlas write. A local 20-second delay would be insufficient because the public limit is shared by all users.

## Acceptance before real Australian production

1. Independent source publisher and official endpoint review, exact allowed use/copyright, credit and permitted redistribution/AI terms.
2. Distributed rate-lease mechanism or a manual single monthly download process obeying the cross-user one-request-per-20s constraint; no automatic retry storm.
3. Authentic dated schedule response and released schema verified against v3.8, plus full item/pack/fee/restriction joins and original Australian product identifiers.
4. SHA-256 checksums, versioned monthly snapshots, country-native units and amounts, row-level validation, idempotence and rollback.
5. Independent data admission and tenant authorisation, signed rollout, verified backend deployment and separate iOS/Android protected reads.
6. No new infrastructure spend or public subscriptions without separate approval.

This task improves Australia source contract readiness but does NOT raise the verified number of production-integrated countries.
