# NovaPharm Distribution — operational exception worklist

**Stage:** application read-only integration candidate (14 November 2026).  
**Scope:** existing employee-authorised `employee.warehouse` module only.  
**Physical stock authority:** the contracted warehouse, not the application database.

## Purpose

The existing WMS control tower shows batch expiry/hold flags alongside recent commercial orders, receiving, quality, returns, carrier and integration records. This change presents a **single bounded review worklist**, taking decisions about where to investigate next without fabricating live incidents or creating operational side effects.

The worklist draws only on seven existing employee warehouse sections:

| Source | Observed signal | Suggested review |
|---|---|---|
| Warehouse exception review | Expired/near-expiry lot, quarantine/quality flag, quantity discrepancy | Warehouse / quality |
| Receiving and purchasing evidence | Rejected goods or missing receipt quantities | Warehouse receiving / quality |
| Quality and recall observations | Open complaint or potential safety escalation | Quality / Responsible Person |
| Return isolation review | Recorded return on quality hold | Returns / Quality |
| Shipment and carrier observations | Dispatched/delivered status without tracking reference or delivery timestamp | 3PL / carrier evidence |
| Integration delivery exceptions | Pending, retrying or blocked events | Integration operations |
| Commercial fulfilment queue | Held or blocked internal order | Commercial operations |

## Evidence and safe semantics

- Each record states `application_record_not_3pl_reconciled`. An application-level signal **is not** independent evidence of a warehouse incident, regulatory breach, unsafe lot or failed delivery.
- High/standard priorities are suggested screening order, **not** binding QMS severity, RP decision or regulatory timelines. No SLA, notification, assignment or warehouse task is created.
- The existing WMS views generally show the most recent 30 records per domain. The worklist caps any source to 120 records and the combined response to 120. It must never be called a network-wide count of exceptions.
- Empty or absent source tables mean the evidence is incomplete. A zero-length worklist does not prove that inventory is available, no customers are exposed to recall, or that transport/3PL feeds are healthy.
- The worklist ignores full customer/employee identities; displays only source references and suggested teams. It masks malformed references and allows no external links, HTML or commands from records.
- All actions are default OFF: no available-to-promise, reservation, batch release, warehouse adjustment, goods receipt, carrier booking, customer notification, invoice or recall closure.
- Use existing application database snapshots after server-side employee RBAC. The provider integration API and warehouse stock reconciliation still need the exact contracted Polar Speed/UPS protocol and accepted site scope (issue #664).

## Files and verification

- `src/core/wms-operational-exception-worklist.mjs`: pure deterministic inspection/priority function.
- `src/core/enterprise-module-overlays.mjs`: adds the source-labelled WMS worklist section after the ledger and cross-domain application read views.
- `scripts/test-wms-operational-exception-worklist.mjs`: fixture tests for all seven signal classes, scope denial, missing records, truncation, PII-like malformed reference masking and absence of side effects.
- `npm run test:global-distribution-foundation`: includes worklist regressions.

## Next release steps

1. Test exact commit, security, production build and protected-portal Chromium/WebKit acceptance.
2. Verify the worklist remains legible on mobile and does not change the 13 employee module routes, account permissions or unrelated brands.
3. Deploy only through the separately approved unified portal workflow. Do not infer that merging into `main` automatically cut over the public domain (issue #601).
4. After provider-issued data arrives, replace observational gaps with appropriately attributed **authenticated 3PL evidence**; keep QMS human review and regulatory restrictions unchanged.
5. Establish durable cases, assignment and escalations only with an approved server-side object, audit log, access policy and notification procedure. These are intentionally **not** invented by this PR.

**Additional SaaS subscription:** £0. **Physical warehouse operations authorised by this worklist:** none.
