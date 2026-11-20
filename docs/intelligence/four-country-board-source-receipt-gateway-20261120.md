# Board-only official pharmaceutical source receipt gateway — 20 November 2026

**Engineering stage:** source-code candidate for protected internal review only. Not a licensed feed, customer search, medicine ingestion, national coverage certification, clinical source or released iOS/Android feature.

## Scope

The existing Node API GET `/api/v1/intelligence/sources/official/public-live-probe?sourceId=<fixed-source-id>` can now dispatch an **existing bounded source probe** for one of four fixed publisher records:

| Exact sourceId | Publisher | What is observed | Required follow-up |
| --- | --- | --- | --- |
| `us-fda-drugsfda` | US FDA / openFDA | One Drugs@FDA source-native application schema, hash/time receipt | Published terms and third-party exclusions |
| `sg-hsa-registered-products` | Singapore HSA via data.gov.sg | One registration identifier, hash/time receipt | Dataset licence, API terms, permitted commercial/AI use |
| `ca-health-canada-dpd` | Health Canada DPD | One fixed DIN `00326925`, hash/time receipt | Source-specific rights, native drug identity and import QA |
| `es-aemps-cima` | Spain AEMPS CIMA | One fixed registration `51347`, hash/time receipt | Attribution/reuse terms, source version and identity QA |

Publisher reference code: `src/core/intelligence-official-live-pharma-probes.mjs`, `src/core/intelligence-canada-dpd-public-live-probe.mjs` and `src/core/intelligence-es-cima-public-live-probe.mjs`.

## Mandatory security and operational controls

- The Node endpoint performs **server-side board-scope authentication**, then checks `NPI_OFFICIAL_PUBLIC_SOURCE_PROBE_ENABLED === "true"`. The flag is not enabled or provisioned by this PR.
- Exact source IDs are checked *before* rate limiting (two authorised requests per minute) and before an outbound publisher request. Unlisted/invalid IDs do not create requests.
- All publisher URLs are fixed inside the existing adapters. Each uses HTTPS, bounded streaming, fixed record identity, timeouts, no redirects/credentials and response schema verification.
- A successful endpoint response is **receipt metadata only**. Original prescribing, medicine or product rows remain in transient memory and are not exposed in the receipt or persisted.
- The Next.js gateway permits only the exact `v1/intelligence/sources/official/public-live-probe` path and **GET** before any upstream URL is constructed. The Node API separately enforces the board session.
- Both gateway and backend return no-store responses; no public data fetch is added to Expo iOS/Android or the country-source directory.
- Unexpected publisher errors fail closed as sanitised 503 responses. A successful source HTTP observation is not a production connection.
- `config/intelligence/owner-production-constraints.json` remains **unchanged**: no new paid infrastructure, licence purchase, unapproved medicine admission, customer billing/access or portal cutover; `productionSignoff: not_granted`.

## Acceptance and rollback

The CI should execute `node --test scripts/test-intelligence-official-live-pharma-server-gate.mjs` and preexisting official publisher adapter/security tests, followed by secure portal browser and role acceptance. Verify exact SHA, CI results and approved privileges before any source-code merge. Restore the previous gateway and Node route source blobs to roll back this optional source-review path. No independent legal/source-rights acceptance or production endpoint deployment has occurred.

**Not in scope:** an AWS API Gateway/Lambda change, publisher raw-data storage in SharePoint or MongoDB, clinical terminology reconciliation, signed iOS/Android builds, activating environment flags, or declaring customer-live national integrations.
