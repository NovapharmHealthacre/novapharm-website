# Distribution evidence ledger: staging-only design

**Status:** Staging infrastructure **deployed and verified 11 November 2026**, not approved for regulated operations. Repository pull request/release checks remain separate from this AWS staging activation.

**Deployment evidence:** AWS account `250675045172`, region `eu-north-1`, CloudFormation stack `novapharm-distribution-evidence-staging`, `CREATE_COMPLETE`. Exact source reviewed from PR #443 at commit `46a6ba7035ef8865ac2e49b7922d8bab8d86afb5`. The change set contained exactly two DynamoDB table additions and zero AWS validation errors. `novapharm-distribution-evidence-staging-evidence` and `novapharm-distribution-evidence-staging-events` are `ACTIVE`; both have server-side encryption, PITR and deletion protection enabled, on-demand billing, and estimated item count 0. No API, IAM writer, live trading, product stock or dispatch is provisioned.

This design introduces two private AWS DynamoDB **staging** tables only: a qualification evidence ledger and a journal for immutable business events. CloudFormation creates **no IAM writer, public API, network exposure, account, checkout, medicine stock, price, order release or shipment execution service**. The templates cannot become a production authorisation and make no statement about MHRA licence status.

## Access patterns and record contract

No real records are preloaded. Every example identifier below is an illustrative **schema** only, not a real licence, stock, shipment, person, buyer or agreement.

- Evidence table `pk=ORG#<legal-entity-id>#SCOPE#<jurisdiction>#<site-id>`; `sk=GATE#D01-...#DOCUMENT#<document-id>#REVISION#<revision-id>`. Record `status` is not automatically trusted: required fields include authority/source, reviewer, rights/scope, evidence hash, effective period and verification method. Sensitive evidence should remain in an separately approved encrypted object store; the table is an indexed metadata ledger, not a location for raw personal documents.
- Event table `pk=ORG#<legal-entity-id>#CASE#<case-id>`; `sk=EVENT#<ISO-UTC-timestamp>#<unique-event-id>`. Events have actor/role, source request, action, policy revision, result (denied/candidate/review only), references and immutable event ID. Implement future writers with conditional PutItem, no general UpdateItem/DeleteItem, role separation and audit monitoring. A record change without an append-only event must fail.
- All cases are scoped to an exact legal entity, product, destination country, site, counterparties and effective evidence version; **do not infer entitlement from a tenant claim or a browser-submitted status**.
- Avoid storing patient data or live customer licence documents in this staging candidate. No data retention schedule is invented; set applicable retention and legal hold rules through documented quality/legal review before real records.

## Evidence stages and non-negotiable operating boundary

1. `unverified`: newly registered reference; cannot support a quote, medicine order or stock release.
2. `review_pending`: checked for completeness, awaiting independent source and current licence verification.
3. `source_verified_candidate`: internal reviewer and original evidence recorded; still not production authorisation.
4. `approved_by_quality`: can only be asserted by authenticated quality/RP authority in a separately accepted runtime with applicable regulator decisions.
5. `revoked` / `expired` / `superseded`: eligibility falls to **blocked** immediately, including during in-flight order review.

The source module `src/core/distribution-release-candidate.mjs` in PR #430 tests the D01–D15 completeness boundary but does not independently verify documents and **always returns `transactionAuthorized:false` and `medicineDispatchAuthorized:false`**. There is no authenticated production writer or reader yet. Do not confuse this CloudFormation template's successful syntax validation with accepted GDP implementation.

## Before any production integration or permission expansion

- Decide the production system of record and tenancy/role boundaries; obtain a formal IT/security and Quality design review.
- Use an approved encrypted evidence-document store and explicit document hashes if real supporting files are required.
- Review residency, retention, lawful basis, access control, audit, backup/restore and incident handling.
- Perform a CloudFormation changeset review; check actual AWS account, stack name, cost and staging ownership before executing.
- The isolated **staging** stack exists. Before writing any real or synthetic records, define and approve a least-privilege identity, scope-based access, role-segregated auditing, automated negative tests and safe cleanup procedures.
- Do not connect this staging storage to public contact forms, checkout, subscription entitlement, medicine availability or dispatch.
- Actual wholesale orders require valid applicable MHRA permissions, RP/GDP QMS, validated facility/carriers, supplier/buyer and SKU-country rights, accepted real batch stock and independent owner/quality/finance sign-off.

**Acceptance gate:** Neither table creates an operational pharma distribution platform by itself. All governed releases remain blocked pending issue [#356](https://github.com/NovapharmHealthacre/novapharm-website/issues/356).

