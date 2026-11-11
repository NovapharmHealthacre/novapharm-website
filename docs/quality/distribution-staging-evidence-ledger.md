# Distribution evidence ledger: staging-only design

**Status:** Infrastructure candidate, not deployed or approved for regulated operations. Prepared 11 November 2026.

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

## Before infrastructure deployment

- Decide the production system of record and tenancy/role boundaries; obtain a formal IT/security and Quality design review.
- Use an approved encrypted evidence-document store and explicit document hashes if real supporting files are required.
- Review residency, retention, lawful basis, access control, audit, backup/restore and incident handling.
- Perform a CloudFormation changeset review; check actual AWS account, stack name, cost and staging ownership before executing.
- Only then create the isolated **staging** stack and run controlled tests with synthetic data.
- Do not connect this staging storage to public contact forms, checkout, subscription entitlement, medicine availability or dispatch.
- Actual wholesale orders require valid applicable MHRA permissions, RP/GDP QMS, validated facility/carriers, supplier/buyer and SKU-country rights, accepted real batch stock and independent owner/quality/finance sign-off.

**Acceptance gate:** Neither table creates an operational pharma distribution platform by itself. All governed releases remain blocked pending issue [#356](https://github.com/NovapharmHealthacre/novapharm-website/issues/356).

