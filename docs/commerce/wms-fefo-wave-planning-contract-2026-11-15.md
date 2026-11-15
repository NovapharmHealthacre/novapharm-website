# NovaPharm Distribution — FEFO and wave review contract

**Release:** 15 November 2026.  
**Scope:** Independently reviewable FEFO and wave planning logic; no order/warehouse write operations.

## Leader patterns and NovaPharm implementation

The source-reviewed v4.1 HTML prototype demonstrates FEFO reservation, pick, pack and dispatch as browser-local steps. The production application must not reuse those mutable `localStorage` operations. Instead, the next real integration uses existing server-side WMS validation contracts:

- **Manhattan Active WM:** unified inventory visibility, fulfilment planning/execution and exception control. NovaPharm preserves a unified evidence-based view but does not claim Manhattan automation/WES parity or warehouse command rights.
- **SAP EWM:** wave grouping, warehouse requests/tasks, batch identity, FEFO, activity areas and process monitoring. NovaPharm's review engine groups qualified lot/order *candidates* deterministically; it does not release actual warehouse tasks.
- **Blue Yonder:** demand/resource intelligence and exception-driven orchestration. NovaPharm uses explicit priority/due-date sequencing and partial-shortfall signals, not synthetic ML forecasts.
- **Oracle/Infor/Infios:** integration-oriented multi-site/3PL orchestration. NovaPharm scopes every order, lot and allocation candidate to legal tenant, warehouse site and stock owner, with no cross-owner borrowing.

Reference source pages:
- https://www.manh.com/en-in/our-solutions/supply-chain-management-software/warehouse-management-system
- https://www.sap.com/india/products/scm/extended-warehouse-management/features.html
- https://blueyonder.com/solutions/warehouse-management
- https://docs.infor.com/lncs/2025.x/en-us/lncslib/lncspov/wzu1564481459702.html

## Review-only FEFO and waves

`reviewFefoWaveCandidates()` accepts a separately supplied 3PL inventory packet, an independently originated ledger snapshot, scope and order-demand review lines. It first calls the existing `review3plInventoryReconciliation()` and `reviewQualified3plSnapshot()`. A mismatch, stale/future/cross-tenant record or absent source blocks planning.

The planner additionally requires:
- Exact tenant, site, **stock-owner** and SKU isolation.
- Matching, explicit base unit of measure across provider, internal ledger and orders. **No silent BOX/EA/PALLET conversion.**
- Positive integer order quantities and unique `(orderId,lineId)` values.
- Deterministic urgent/standard, due-time, order/line ordering.
- FEFO from the already-screened lot candidates, never batches on quality hold, recall, temperature excursion or expired stock.
- Order-specific remaining shelf-life constraint, enforced per lot.
- Decrementing hypothetical quantities across all proposed orders so the same lot cannot be allocated twice.
- Bounded review-wave grouping (1–100 task candidates per review wave).
- Explicit shortage records for unfilled line demand.

All results are read-only **candidate** arrays. Even a perfect packet always returns `providerAuthenticated:false`, `independentlyReconciled:false`, `availableToPromise:null`, `stockReserved:false`, `warehouseTasksCreated:false`, `waveReleased:false`, `dispatchAuthorised:false`. The function neither sends a provider command nor creates an application order.

### Physical execution release gate (not satisfied)

The following are all required before production stock commitments:

1. Official Polar Speed/UPS provider interface specification and accepted operating scope (#664), including authentication, site ownership, source event format and a service account.
2. HMAC or equivalent verification *only if actually supported by the provider*, durable replay protection, source archive and monitoring.
3. Independent physical 3PL inventory reconciliation, including lot/owner/bin/UOM and accepted release state.
4. Legal product/customer/country selling rights, QMS segregation, temperature and recall policy, and customer commercial order acceptance.
5. Authenticated execution outbox, warehouse accepted wave/task events, exceptions/retries, carrier proof and finance reconciliation.
6. Penetration/tenancy, negative inventory, rollback, split-shipment, partial receipt/returns, scale and disaster-recovery tests in staging.

No real 3PL integration, approved stock authority, task/WES creation, AI forecast or production cutover is implied.

## Verification

`node --test scripts/test-wms-fefo-wave-review.mjs` exercises owner isolation, FEFO order, multi-order non-double-counting, wave limits, quantity and shelf-life shortfall, recall/cold-chain/QA holds, invalid UOM, duplicate order lines and stale source rejection. It is wired into `npm run test:global-distribution-foundation`.

The existing employee WMS workspaces remain governed. The core review engine will be surfaced as a production planning service only when accepted provider data contracts and role-boundary release checks exist.
