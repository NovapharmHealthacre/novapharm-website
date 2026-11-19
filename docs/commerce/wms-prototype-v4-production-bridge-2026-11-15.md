# NovaPharm Distribution Enterprise WMS — HTML prototype v4 production bridge

**Reviewed:** 15 November 2026  
**Owner-provided source:** `NovaPharm_Distribution_Enterprise_WMS_Prototype(1).zip`  
**Source manifest:** one ~111 KB standalone HTML file, a README and four preview screenshots  
**Prototype version:** 4.0, dated 14 November 2026  
**Current release scope:** safe mapping of 16 named capabilities to the existing `employee.warehouse` route, **not** production execution of the HTML simulation.

## What was confirmed directly from the attachment

The prototype is a self-contained, styled HTML application with one inline script and 16 navigation workspaces. The README documents product creation, ASN receipt, batch/LPN registration, local QA review, FEFO reservation, pick, pack, dispatch, proof-of-delivery demonstration, scenario planning, source-integrity warnings and CSV/JSON export. The screenshots visibly display detailed tables/charts in a quiet graphite/white interface with no decorative imagery.

The code uses browser `localStorage` under key `NOVAPHARM_DISTRIBUTION_WMS_ENTERPRISE_DEMO_2026_V4`, has no `fetch()` calls or server API requests, and runs only local demonstration event transitions. The application includes a seed dataset of Nutraxin, ESCO, dressing and **restricted medicine** examples. The source labels live UPS/Polar Speed, ERP, carrier and QMS services as unavailable.

These are **actual prototype behaviours**, not verified operational acceptance, stock provenance or genuine WMS integration.

### Risks to address before production use

1. **Fixed expiry reference**: `START='2026-11-14'` and `b.expiry > START` in the FEFO allocator. A production allocator must use an authoritative warehouse-local current-date policy, accepted shelf-life constraints and batch/quality status, not a frozen date. Do not reuse this rule as production stock allocation.
2. **Local-state authority**: browser storage can be edited or reset by the user. It has no tenant authentication, durable replay protection, immutable ledger, QA e-signature or segregated duties. Local releases and stock writes cannot be accepted by the production system.
3. **Mock dispatch and POD**: setting `DEMO-DISPATCH-RECORDED` or `DEMO-POD-RECORDED` is not a carrier scan, warehouse pick/pack acceptance or independent delivery confirmation.
4. **CSV formula safety**: CSV export quotes values, but does not neutralise spreadsheet formula prefixes such as `=`, `+`, `-` or `@`. Production exports must escape those cell values and apply authorised data-scope filtering.
5. **Synthetic intelligence**: chart throughput, 72-bin heatmap and AI planning responses are derived from mock/local state and deterministic rules, not signed site telemetry or validated predictive models.
6. **Source traceability and UOM**: prototype's simple product/lot schema omits various country licensing, multi-owner unit conversion, provider adjustment, serial and multi-site quality-release prerequisites. Import validated schemas from the existing WMS control-plane contracts, not demo objects as authoritative records.

## How the sixteen concepts map to NovaPharm

A new component, `apps/portal/components/wms-prototype-workspace-map.tsx`, is displayed on the existing authorised `/employee/warehouse/` page. It follows the prototype's four groupings, preserves the sixteen names, and explicitly distinguishes **an existing evidence view** from **a capability needing integration**.

| Prototype concept | Governed employee destination | Scope now |
| --- | --- | --- |
| Control tower | Operations Dashboard | Existing read-only application view |
| Exceptions & decisions | Warehouse & Inventory | Recorded cross-domain exception worklist; no case execution |
| Performance analytics | Reports | Application reporting; live OTIF unverified |
| Product master | Product Master | Catalogued product identity; no assumption of physical stock |
| Inbound & ASN | Purchasing | Recorded receipts and purchasing; 3PL feed absent |
| Batch & lot control | Warehouse & Inventory | Ledger-based lot/expiry view; source unreconciled |
| Quality & recalls | Quality | Recorded case review; physical recall action not connected |
| Inventory & slotting | Warehouse & Inventory | Recorded stock; no live provider slotting |
| Orders & allocation | Telesales Orders | Orders observations; reservations still gated |
| Waves & execution | **Not enabled** | Requires provider WMS/WES execution contract |
| Yard & delivery | **Not enabled** | Requires real dock/carrier/POD events |
| AI planning studio | **Not enabled** | Requires production-grade historical data and tested model |
| Labour & automation | **Not enabled** | Requires staffing, WES/WCS, automation integration rights |
| 3PL & billing | Finance | Commercial review; invoices and margins unreconciled |
| Integration monitor | Operational Administration | Internal events; provider-specific connection pending |
| Audit & data export | Operational Administration | Existing application audit; never browser-local legal records |

The existing platform has 13 employee modules. This feature maps 16 **prototype concepts** into those governed modules. It does **not** assert that 16 independently complete WMS modules have been deployed.

## Integrating the real capabilities safely

- **P0 — Integration foundations**: accept the provider's officially contracted schema, authentication method, site/owner/lot semantics, product-rights requirements, quality signoffs and event archive. Track Polar Speed/UPS credentials/EDI/API in [issue #664](https://github.com/NovapharmHealthacre/novapharm-website/issues/664).
- **P0 — Stock release control**: independently reconcile ASN -> receipt -> bin/owner/batch -> QMS hold/release -> permitted ATP. Never use UI flags or browser data for this authority.
- **P0 — Fulfilment**: approved order and payment/credit -> warehouse acceptance -> verified pick/pack/ship -> carrier signed POD -> invoice matching. Default-deny all real writes until accepted.
- **P1 — Warehouse operations**: human-reviewed FEFO, cycle count, shortage/damage, returns, recalled lots, customer notifications, 3PL billing, order and event exception queues.
- **P1 — Intelligence**: OTIF/perfect-order and contribution computed only from independently reconciled periods with transparent denominators.
- **P2 — WES/WCS and AI**: resource forecasting, slotting, wave orchestration, yard, scanners and automation only when allowed by the contracted warehouse and model/data acceptance.

The unified portal runtime itself is gated by [issue #601](https://github.com/NovapharmHealthacre/novapharm-website/issues/601). Code merges and screenshot similarity alone do not prove live WMS availability.

## Implementation detail and testing

- The new component displays a responsive, typography-led grouped directory with first-party employee route links; unconnected workspaces have **no executable buttons**.
- The component imports the authoritative `employeeModules` catalogue and never creates mock roles, tenant IDs, warehouse APIs or localStorage.
- `apps/portal/components/employee-distribution-workspace.tsx` mounts the directory on the existing server-authorised employee warehouse route.
- `apps/portal/app/employee-distribution.css` adds no decorative icons or generated media, and includes visible keyboard focus and mobile layout.
- `apps/portal/test/wms-prototype-workspace-map.test.ts` asserts all sixteen names, four groupings, twelve existing governed routes, four explicit unconnected capabilities and absence of storage/network/command side effects.

**No new SaaS subscription, production stock mutation, warehouse operation, or extra standalone application.**
