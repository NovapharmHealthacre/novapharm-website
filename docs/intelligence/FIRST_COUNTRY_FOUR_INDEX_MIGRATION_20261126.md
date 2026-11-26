# First country: executable private four-index migration orchestration
26 November 2026 | Source review, not live deployment

The current production Atlas DB `novapharm_intelligence_production` has zero records in four required collections and no required compound unique index in any of them, as verified by read-only Atlas connector inspection. Its existing ordinary query indexes do not satisfy uniqueness. This module composes the existing rights-index and three G2 migrations; it **does not** ship an Atlas connection, MongoDB driver, credential, customer route, automatically scheduled job or cloud resource.

## Required trusted execution boundary
- Maintenance runner privately opens the **existing** production MongoDB driver/database with least privilege, TLS and a short-lived operational credential. It must never use a client/browser proxy or GitHub-hosted runner with production secrets.
- Independently authenticate an MFA-backed authorised operator and independently verify a signed change ticket, quiesced writers, database backup and tested restore. `verifyChange` is an injection point for that independent backend; a browser-provided object or mocked receipt **never** proves approval.
- Inject a durable append-only audit writer. Before mutation, persist an authorisation event. After every created index, persist a verified-index event. Finally, persist four-index complete. Audit failure **stops** the sequence; an already created index must not be dropped or silently rolled back.
- Run `runFirstCountryFourIndexMigration({database})` **without apply** for a read-only preflight. Apply only from the private authenticated maintenance agent after independently verified authority. The four canonical exact names, fields, order, collation, uniqueness and majority-write concern are enforced by existing source modules.
- After success independently read back all four actual indexes and verify tenant/rights/source gates separately. Four indexes do not admit Apixaban, establish source rights, enable customer reads, prove MFA or activate country coverage.
- Current CodeBuild project `novapharm-intelligence-private-source-archive` is not attached to a VPC. Do not assume it can safely access private Atlas for this migration. The MongoDB Atlas connector does not expose unique-index options and must not substitute a nonunique index.
- No new paid resource, vendor licence, email, public website deployment or customer permission is created by this PR.

Test (offline synthetic fixtures only):
`node --test scripts/test-atlas-first-country-four-index-orchestration.mjs scripts/test-atlas-four-index-preflight.mjs scripts/test-atlas-g2-unique-index-migration.mjs scripts/test-atlas-private-medicine-rights-index.mjs`

Do not mark even England's NHSBSA source live until the specific OGL/attribution and any third-party obligations, exact resource hash/period, first bounded Apixaban admission, protected tenant read tests and authorised deployment all pass. England's prescribing evidence must not be called UK-wide national market coverage.
