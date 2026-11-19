# NovaPharm WMS — 2026 enterprise benchmark and controlled integration specification

**Source review:** 14 November 2026. **Implementation mode:** existing unified employee portal, source-only, read-only evidence controls. **Additional subscription cost:** £0. **Physical warehouse system of record:** the contracted 3PL, not NovaPharm's product catalogue.

## 1. Decision

Build a **3PL-agnostic distribution control plane** on top of the existing NovaPharm customer, employee, purchasing, finance and quality workspaces. It should make the connection from supplier rights and warehouse proof to the qualified customer's order, shipment and accounting transparent. Do not attempt to replace Polar Speed/UPS's internal WMS, introduce six expensive SaaS packages, claim physical control of a third-party bin, or turn inferred stock into saleable ATP.

### Evidence from the attached NovaPharm audit

The supplied `NovaPharm_Global_Distribution_Deep_Audit_2026-11-14(1).html` reports a historical snapshot: 392 catalogue references (19 Nutraxin, 373 ESCO), zero payment charges in the inspected Stripe account, empty scanned shipment/seller event tables, and **no independently inspected live Polar Speed WMS API**. These are *audit observations*, not current production counts. It reports an outstanding temperature-mapping CAPA and a mismatch between the public portal hostname and the intended enterprise runtime. The controlling fact for WMS is that **neither declaration nor catalogue implies pickable, quality-released stock**.

Distinguish the three supply lanes:
- **Nutraxin wellness:** owner-operated consumer/trade, subject to actual lot-level stock, returns, tax and checkout governance.
- **ESCO laboratory/equipment:** exact variant-level B2B quotation, freight/packing, installation/serial and manufacturer-rights evidence; catalogue references do not prove buyable inventory.
- **Regulated medicine wholesale:** exact country/SKU/customer/site approvals, WDA(H)/GDP and responsible-person decisions, serial/batch/expiry and recall controls; keep default OFF until independent acceptance.

## 2. Six-vendor reference architecture

| Vendor | Source-supported operating principles | NovaPharm-specific adoption | Status |
| --- | --- | --- | --- |
| Manhattan Active | Common real-time operational data model across WMS, labor, yard, automation; network-to-site drill-down; configurable receiving, order streaming, labor planning and slotting; WES inside WMS | One control tower within existing portal, source-provenance model, exception queue, order-to-warehouse-to-carrier lineage; *do not build unneeded robot controls* | Read-only order lineage and ledger flags implemented; live WES not implemented |
| Blue Yonder | Predict shift resources, use pull-based execution and adaptive priorities, optimize slotting, analyze exceptions, integrate automation vendor-agnostically; AI agents assist with interventions | Explainable, human-reviewed replenishment/slotting recommendations and bottleneck signals only after verified source coverage; no unsupervised dispatch | Existing replenishment reviewer and new exception evidence; no live AI WES |
| SAP EWM | ASN/receiving, bin-level physical inventory, multi-owner stock, cycle counts, wave pick/pack/ship, batch/serial, yard, labor, cross-dock, quality and ERP links | Canonical identifiers for tenant, site, owner, SKU, batch, expiry, licence plate/bin, allocation, movement, count and status; stock reconciliation first | Legacy inventory ledger and derived QA flags; physical bin reconciliation pending |
| Oracle WMS Cloud | Multi-client/multi-site 3PL, configurable wave allocations, inventory visibility, returns, yard-to-dock, equipment/ERP connection | Strict tenant/site isolation, scalable 3PL adapter and separate site-scoped data contracts; no single global stock assumption | Tenant/site-scoped feed shape checker; actual contract/transport pending |
| Infios | Modular WMS/WES/WCS, receiving, cross-docking, task interleaving, slotting, labor/yard and multi-site orchestration, optional SaaS or hybrid | Provider-neutral integration interface with reversible connectors; mode-specific process modules, without vendor lock-in | Provider-neutral review contracts; connectors for additional 3PLs pending |
| Infor WMS | Multi-owner and bin/LPN visibility, RF/voice, wave picking, cross-dock, 3PL billing, labor performance, analytics, 3D representation, AI use cases | Controlled per-site 3PL cost estimate and eventual invoice matching, actual QC status, accessible employee console; only a truthful diagram where site layout data is licensed | Scoped 3PL cost estimate implemented; invoices and operational site map pending |

The comparison is **functional**, not a claim that NovaPharm is licensed to use vendor software or has reached parity with their products. Their architecture, branding, application code and proprietary algorithms are not copied.

### Attached evidence

- `MAWM_product-ebook_2024.pdf`, pp. 2–5: unified control/execution and network visibility; pp. 6–8: labor and slotting; pp. 9–11: order streaming and WES.
- `blue-yonder-warehouse-management-solution.pdf`, pp. 2–4: pull-based warehouse execution, staffing forecast, automation coordination, returns, slotting, yard and insights. Vendor case-study percentages are **marketing assertions**, never NovaPharm targets or measured performance.
- `Infor WMS-2-Pager_BRO-EN-0626-86aj0a4kn-2.pdf`, pp. 1–2: bin/LPN control, mixed warehouse waves, RF and voice, 3PL billing, 3D, replenishment, configurable low-code and labor management.
- User-supplied SAP link: full inbound/storage/outbound cycle, track and trace, quality integration, slotting and robot capability. The SAP source is a capabilities reference, not a product procurement authorization.

## 3. Target business architecture

```text
Customer portal / Employees / CEO / Quality
                    |
Tenant and object-scoped identity / approved product-rights policy
                    |
Qualified quote or paid/credit-eligible accepted order
                    |
       NovaPharm distribution control plane
      +-------------------+-------------------+
      | product & quality | inventory evidence|
      | sourcing/finance  | fulfilment monitor|
      | reconciliation    | exceptions/returns|
      +-------------------+-------------------+
                    |
     3PL adapter: contracted schema, signed/verified transport
                    |
Polar Speed / UPS, future qualified 3PL nodes (each scoped separately)
                    |
Carrier events + signed POD + independent finance reconciliation
```

**Authoritative ownership split:**
1. Product owner/manufacturer controls product information and rights.
2. Legal/regulatory/quality officers approve territory, batch, handling, recall and route.
3. The 3PL attests receipt, actual location, quarantines, holds, picks, packing and physical dispatch.
4. Carrier independently provides consignment, tracking and proof of delivery.
5. Payment provider or agreed credit policy establishes commercial settlement.
6. Finance matches invoice, freight bill, product cost, refund and contribution.
7. NovaPharm's portal is a *bounded orchestration and evidence layer*; it must never assert physical events without their origin.

## 4. Canonical data contracts for production build

**Site and owner identity**: tenantId, legalEntityId, warehouseProviderId, warehouseSiteId, ownerId, country, regulatory status, contract scope and permitted temperature lanes. Do not combine legal entities, customers or sites in one unqualified quantity.

**SKU identity**: SKU, exact variant, GTIN when provided, manufacturer, UOM and conversions, country marketing/rights status, product class, temperature class, licensed lifecycle, pack and price version.

**Batch/serial evidence**: location or bin, LPN/SSCC when provided, batch/lot, manufacturing and expiry dates, serial where applicable, physical count, allocated, reserved, quarantined, damaged, recalls, quality status, temperature excursion record, provider evidence ID, captured time, signature/digest and revision. Never assume a blank required attribute means a good state.

**Inbound**: qualified purchase order and ASN -> carrier/dock receipt -> quantity/identity check -> quarantine/QA sampling -> approved putaway -> 3PL confirmed balance -> separate saleability assessment. Support damaged, incorrect, short and over-delivery exceptions, and never accept inbound ASN alone as physical stock.

**Outbound**: eligible customer request -> approved quote/price and buyer -> independent ATP proof -> binding commercial acceptance -> order release -> 3PL acceptance -> allocated batch -> pick -> pack -> carrier handover -> delivery proof -> invoice match -> returns/claim closure. Each transition must have an immutable event ID, provenance, action and accepted time.

**Returns and recalls**: isolate returned goods by default, trace potentially affected batch recipients, record deviation/CAPA and human quality disposition. Prevent any stock-restoration-on-refund shortcut. Support recall notification and stock-hold fan-out to all sites.

**3PL charges**: versioned, scope-approved rate card with storage, receipt, per-carton, special handling, returns, carrier and surcharges; quote cost in minor currency units; compare to actual invoice and purchase/order cost. Principal resale revenue must not be mixed with agency GMV.

**Event interface**: at-least-once delivery, idempotency keys, outbox, deduplication, producer authentication, clock-skew and freshness limits, scoped replay, schema version, retry/dead-letter review, matching of external and internal IDs, and no public/unsigned write endpoints.

## 5. Capability priorities and acceptance

| Level | Required capability | Production acceptance |
| --- | --- | --- |
| P0 | Provider API/EDI agreement, entitlement and event/stock schema | Signed 3PL operational contract; two-sided API dry run; security approval; real permissioned site |
| P0 | Confirmed goods receipt, multi-bin/lot balance and stock adjustments | Provider receipt/count reconciles to NovaPharm ledger; no cross-tenant leak; differences cannot sell |
| P0 | FEFO, expiry and quality/temperature/recall holds | Independent quality-controlled lots; blocked lots cannot enter sale/dispatch; documented review |
| P0 | Authenticated order-to-dispatch-to-POD chain | Signed external evidence IDs, dedupe, failure and replay, payment/credit and invoice matching |
| P0 | Regulatory lane isolation | Explicit medicine WDA(H)/GDP/RP authority and country/product/site checks; no bypass |
| P1 | Inbound ASN, dock/receipt, goods discrepancy and cycle counts | Tested with 3PL operations staff; bin/LPN/serial scope according to contract |
| P1 | Dynamic order-priority and B2B/B2C wave-planning review | Verified order/service windows and human acceptance; avoid robot commands at external 3PL |
| P1 | 3PL billing and gross-contribution ledger | Binding rate card; invoice reconciliation; actual carrier fees; no synthetic profitability |
| P1 | OTIF, perfect order, lead time, cost and inventory accuracy | Reconciled provider, carrier, order and finance period; unknown values remain null |
| P2 | Predictive slotting, labor planning and service exceptions | Rights-cleared history, transparent simulation, independent backtest and human decision |
| P2 | Robotics/digital-twin/3D integration | Only after provider grants source, site layout and machine interface rights; not needed for asset-light launch |

**Correct scale-up sequence:** (1) real warehouse evidence, (2) one completed and audited lawful customer fulfilment, (3) repeatable service and economics, (4) additional customer/product density, (5) qualified cross-border nodes, (6) optional AI optimization. A cloud WMS dashboard does not itself make an enterprise distributor.

## 6. Implemented in branch `feat/wms-control-tower-benchmark-20261114`

- `src/core/wms-control-tower.mjs`: read-only lot/expiry/quarantine/quantity exception review; site-scoped provider feed sanity; FEFO suggestions with no ATP or reserve authority.
- `src/core/wms-execution-review.mjs`: provider-sourced event lineage for order→allocation→pick→pack→dispatch→POD observations; missing/duplicate/out-of-sequence cases; scoped 3PL rate-card costing estimate.
- `src/core/enterprise-module-overlays.mjs`: authored employee warehouse exception table, updated 90-day expiry handling and explicit unverified provider truth.
- `src/core/enterprise-domain-service-base.mjs`: removed an expired hard-coded 2026 stock expiry reference from base module metrics.
- `apps/portal/components/employee-distribution-workspace.tsx` and portal CSS/dashboard: integrated calm, typography-led WMS entry in the **existing employee.warehouse route**.
- Tests are part of `npm run test:global-distribution-foundation`; portal component tests separately check the no-write boundary.

**Not implemented and not represented as live:** direct 3PL API/EDI authentication, worker-verified receipts, actual warehouse bin/slot plan, WES robot commands, live cost ledger, production event stream, authenticated operational snapshots, cross-site network deployment, physical pick/pack, signed delivery, medicine trading authority.

## 7. Reliability and security test matrix

All inputs must be server-scoped; never trust a browser-selected tenant or site. Test the following before production activation:

- Duplicate event, replay, missing/out-of-order stage, mismatched order, stale/future feed, invalid signature/digest, 3PL timeout and API failure.
- Cross-tenant/site/owner exposure, scope mutation, invalid and overflow quantities, null/missing lot, recall and temperature excursion.
- Expiry today, expired stock, near-expiry window, damaged/returned goods, stale inventory, partial fulfilment and absent physical counts.
- Provider cancellation, carrier never scanned, missing POD, incorrect invoice or surcharge, payment rollback and refunded-but-quarantined stock.
- No owner/role/env override bypasses the enterprise order gate; quality release must be separately approved.
- Accessibility: no decorative emojis/icons, responsive tables, keyboard/focus visibility, labels, mobile navigation.
- CI checks exact branch HEAD plus focused WMS tests, portal typecheck/lint/build, security scans and protected release workflows.

## 8. Official benchmark sources (reviewed 14 November 2026)

- Manhattan Active Warehouse: https://www.manh.com/solutions/supply-chain-management-software/warehouse-management
- Manhattan 26.2 execution release: https://www.manh.com/releases/2026/waypoints-supply-chain-execution-26.2
- Blue Yonder Warehouse Operations: https://blueyonder.com/solutions/warehouse-management/adapt-in-real-time/warehouse-management-operations
- Blue Yonder 2026 release: https://blueyonder.com/release-announcements/2026-3-release
- SAP EWM (provided): https://www.sap.com/india/products/scm/extended-warehouse-management.html
- SAP EWM functions: https://www.sap.com/products/scm/extended-warehouse-management/features.html
- Oracle WMS: https://www.oracle.com/scm/logistics/warehouse-management/
- Infios WMS: https://www.infios.com/en/supply-chain-solutions/warehouse-management-systems
- Infor logistics/WMS: https://www.infor.com/products/logistics-management
- Infor 3PL billing: https://docs.infor.com/wms/2024.x/en-us/useradminlib_op/sce3plbug/bfk1612894241223.html
- MHRA licences/GDP: https://www.gov.uk/guidance/apply-for-manufacturer-or-wholesaler-of-medicines-licences
- GS1 barcode traceability: https://support.gs1.org/support/solutions/articles/43000734104-which-barcodes-are-used-to-represent-gtins-

**Commercial/technical caveat:** Vendor benefit figures and qualitative descriptions are vendor-reported, not independent audited comparative benchmarks. Deployment and any production-stock claims require actual accepted provider data and licensed commercial operations.
