# NovaPharm WMS — Provider ingestion and quality operations integration

**Date:** 14 November 2026  
**Status:** source implementation and regression tests; no live warehouse interface is contracted or verified in this code.  
**Delivery:** existing NovaPharm employee portal, read-only inventory and execution evidence.  
**Additional SaaS:** none.

## What is now built

The existing enterprise WMS review and reconciliation components from PR #662 are extended by:

1. `src/core/wms-signed-provider-feed.mjs` — optional authenticated feed screening for a **hypothetical, contracted HMAC-SHA256 feed**. A valid server-supplied contract ID, exact tenant/site/provider scope, raw-body signature, bounded size, one-hour freshness, lot/QC schema validation, and **durable atomic feed-id claim callback** are all mandatory. Returns *staged for independent reconciliation*, never verified ATP or quality-released inventory. Nothing in this code claims Polar Speed/UPS supports HMAC or provides signed push/webhook inventory today.
2. `src/core/wms-quality-workflows.mjs` — receiving vs ASN/purchase order discrepancy detection; damaged/over/short goods exception review; returned-item isolation and human QC disposition candidacy; batch-level potential-recall customer/site exposure review. No receipt booking, stock-restoration, outbound call, supplier invoice, email or recall notice.
3. `apps/portal/components/employee-distribution-workspace.tsx` — three calm, role-guarded warehouse operation paths: receipt/reconciliation, quality/returns/recall, and fulfilment reconciliation. Existing ERP inventory tables continue to disclose their unverified data origin.
4. `scripts/test-wms-signed-provider-feed.mjs` and `scripts/test-wms-quality-workflows.mjs`, included in `npm run test:global-distribution-foundation`. Every test uses isolated fixture records and has no vendor side effects.

## Inbound receipt data contract

A received goods record must match a verified purchase order and ASN and the same NovaPharm tenant, 3PL site, stock owner, exact SKU and batch or agreed serial-equivalent.

| Field | Required | Verification and exceptions |
| --- | --- | --- |
| Supplier / PO / ASN | Yes | Exact, approved supplier and PO, unique ASN; expected lines must not be empty |
| 3PL receipt | Yes | Exact receipt reference, 3PL evidence ID, provider timestamp, physical positive line quantities |
| Owner/site/tenant | Yes | Reject cross-tenant or missing owner/site context |
| Product, lot or serial | Yes | Reject unexpected or duplicated identity; maintain UOM conversion separately |
| Received vs expected | Yes | Record discrepancies; never silently create sellable stock |
| Damage / QA hold | Yes | Damaged stock and quality state must be isolated and reviewed |
| Product/right-to-supply | Production gate | Qualified SKU, jurisdiction, buyer and authorised route, RP where necessary |

The source routine returns `receipt_candidate_for_quality_review` only when the disclosed data shape is coherent; even that result does not mean the goods physically exist or may be sold.

## Reverse logistics and recall

- A return must have a prior matching outbound order, original SKU/batch, customer RMA and the exact warehouse receipt. Zero or excess returned quantity is rejected.
- All goods stay in `quarantined` or `isolated_at_3pl` until an independently authenticated quality reviewer records a proposed disposition. Even a reviewed disposition is a proposal requiring a separate execution authority.
- A recall observation checks attributable, exact-batch shipments and stock positions from tenant-matched evidence. It identifies **candidate** recipient and warehouse scope, but not complete recall coverage.
- An empty shipment list or absent physical site positions is **missing evidence**, not proof of no affected customers. Recall communications must remain a separate authorised QMS procedure and independently recorded.

## Provider integration still required — do not guess these details

To connect to real Polar Speed / UPS Marken, obtain, verify, and store **in approved private configuration**:

- Contracted legal entity, warehouse account number, QTA schedules, service site and product/temperature authorization.
- Official inbound inventory interface (REST, EDI, SFTP or another documented protocol); base URL, authentication method, role/scope, IP/mTLS as appropriate, version, sample messages.
- Exact provider field mapping for stock owners, bins, batch/lot, expiry, serial/LPN where supported, QA/recall holds, on-hand/reserved/allocated quantities, receive/pick/pack/shipment event IDs.
- Cut-off and arrival windows, backorder/partial fulfilment handling, carrier/POD sources, cancellation and replay semantics.
- Provider-issued testing tenant/environment and one approval-controlled end-to-end validation dataset.
- Operational support contact, incident escalation, SLA, feed frequency and backfill procedure.
- The actual charge schedule and invoice data definitions, not illustrative tariff values.

**Do not invent endpoint paths or populate `POLAR_SPEED_*` secrets from email snippets.** HMAC authentication is used only if specifically agreed as the provider feed standard; otherwise implement the documented provider-supported transport while preserving the same trust, replay and staging controls.

## End-to-end production sequence

1. Register and approve provider, customer/product territory, warehouse site and supply scope with documented ownership.
2. Authenticate and receive signed/verified provider data in a private isolated ingestion service, with atomic replay control and immutable payload fingerprint.
3. Stage source data; validate seller/lot, owner/site/bin, timestamp, temperature and quality fields.
4. Reconcile against the independent NovaPharm inventory ledger and QMS; discrepancies block ATP. Never equate “the packet parses” with real stock.
5. Approve a time-bounded stock/lot authority in an auditable service, with exact SKU/channel/country, including independent WDA(H)/GDP/MA/RP controls where applicable.
6. Match customer price/credit/payment and order acceptance to **that** authority. Existing enterprise order gate must remain default-deny unless independently verified.
7. Execute any provider reservation or dispatch only through a contracted, audited, authenticated writer with idempotency and a bounded release decision. This PR does **not** add one.
8. Reconcile WMS pick/pack, carrier scans and signed POD to order and invoice; monitor unacknowledged/out-of-order transitions.
9. Match warehouse and carrier invoices to contracted rates, reconcile contribution and returns. Never assume £0 costs when a fee is unknown.
10. Conduct an audited recall/return simulation, exception-replay tests and regulator/quality signoff before expanding to further countries.

## Supplier neutrality and operating lanes

This is a 3PL-agnostic model borrowing good principles (not source code) from Manhattan Active, Blue Yonder, SAP EWM, Oracle WMS Cloud, Infios and Infor WMS. It **does not replace** a contracted warehouse's physical execution system. The same user experience may serve Nutraxin wellness, ESCO B2B and medicines, but release authority stays distinct per line, country, product and customer.

## Acceptance matrix

| Test | Expected outcome |
| --- | --- |
| Contract absent, no approved credential, no atomic replay store | Reject feed |
| Altered body or bad HMAC | Reject before parsing trusted feed |
| Duplicate feed ID | Reject atomically |
| Wrong tenant, site, provider, contract or quality status | Reject |
| Stale/oversized/invalid provider message | Reject |
| Good authenticated data, no independent ledger/QMS match | Stage for review only; no ATP |
| ASN and receiving mismatch | Flag exception; no stock increment |
| Quarantined return with authenticated reviewer | Proposal only; no stock restoration |
| Recall recipient evidence incomplete | Block closure, no claim of zero exposure |
| Order, reservation, dispatch or email action from these contracts | Impossible; no execution API |
| Portal role and browser CI | Existing access controls, mobile, keyboard and no fabricated stock |

**Release criterion:** exact-HEAD CI green, no enterprise authority widening, no new paid vendor plan, and a separate acceptance package before any production warehouse writes.
