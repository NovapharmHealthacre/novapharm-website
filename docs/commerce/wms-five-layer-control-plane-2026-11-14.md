# NovaPharm WMS: integrated five-layer operational control plane

**Release candidate:** 14 November 2026, built on the warehouse quality/3PL integration candidate from PR #663.

## Executive design decision

NovaPharm is the commercial and distribution *control plane* for an asset-light pharmaceutical and healthcare distribution network. The warehouse operator remains authoritative for physical stock, receiving, bin placement, pick/pack and handover. NovaPharm controls its own customer/product approvals, prices, order intents, regulatory and QMS reviews, inventory visibility, integrations and network intelligence. No unverified field is promoted to financial or stock execution authority.

### One portal; five separately governed layers

| Layer | Existing application source | Integrated read model | What is explicitly not claimed |
| --- | --- | --- | --- |
| Commercial | Customers, organisations, orders and commercial rights | Recent order/PO context in the employee warehouse workspace | Accepted customer, legal supply permission, paid invoice or binding order |
| Inventory visibility | Inventory balances, location, product and batch | Existing ledger + rolling expiry and quarantine exception review | Live 3PL physical ATP, bin-count accuracy, actual available-to-promise |
| Quality | Complaints, CAPA, batch release and returns | Recent open cases, quarantined returns and expiry review | Operational validated QMS, RP signoff, recall closure or product release |
| Order orchestration | Purchase orders, goods receipts, shipments, carrier delivery events | Recent receipt and shipment events, status exceptions and provider handoff needs | Warehouse allocation, physical dispatch, signed POD or shipment completion |
| Distribution intelligence | Integration event ledger + existing distribution controls | Five-layer source posture and observed sample sizes | OTIF, inventory accuracy, global network truth or gross contribution without independent period reconciliation |

### Code paths

- `src/core/enterprise-domain-service.mjs` still runs employee module authentication and role authorization before the warehouse overlay; it adds the five-layer read model only for `employee.warehouse`.
- `src/core/enterprise-module-overlays.mjs` uses existing SQL application tables with **independent bounded 30-record samples per domain**. It exposes provenance, unresolved evidence, a five-layer authority table and the prior 90-day warehouse expiry review, and forces no operational actions on this module.
- `src/core/wms-five-layer-readiness.mjs` is a pure read-only authority report; missing records are unknown, not zero, and the results explicitly set sale, payment, shipment and recall closure authority to false. Physical ATP/OTIF/contribution are null.
- `src/core/enterprise-domain-service-base.mjs` no longer headlines `available_quantity` as “Released available”; it labels recorded ledger availability as **not ATP**. This does not rewrite customer stock/checkout endpoints or expose customer cross-tenancy.
- `apps/portal/components/employee-distribution-workspace.tsx` links the five layers to the **already existing** employee modules rather than building five additional sites or adding a new role selection mechanism. It uses editorial typography, no decorative icons, accessible semantic navigation and responsive layout.
- `scripts/test-wms-five-layer-control-plane.mjs` validates five independent layers, missing-source semantics, route restrictions, zero authority, query wiring and availability wording.
- The existing `src/core/enterprise-order-release-gate.mjs` remains default-deny. The code does not bypass regulated medicine release, merchant checkout or provider fulfilment permissions.

## Evidence model

**Recommended source priority:** provider-confirmed signed or otherwise authenticated stock and events -> validated 3PL reconciliation -> quality release/lot holds -> approved customer/product/country/price -> binding order decision -> carrier POD and invoice settlement -> independently measured service and contribution. The WMS read model does not collapse this sequence into a misleading “connected” badge.

The `src/core/wms-signed-provider-feed.mjs`, `wms-control-tower.mjs`, `wms-network-reconciliation.mjs` and `wms-quality-workflows.mjs` review source evidence; they are not a substitute for a contracted real integration. A separate approved provider adapter must establish transport authentication, message version, idempotency, stock-owner and site semantics, error retries, confidentiality and independent reconciliations.

**Crucial exception policy:** A missing provider feed, empty carrier sample or zero quality complaints in the portal is *not* proof that the warehouse has no stock, deliveries succeeded or no product is affected by recall. Display the state as unavailable/unreconciled.

## Production acceptance, in order

1. Confirm executed 3PL QTA and service-specific annexes, legal WDA(H)/GDP permissions where applicable, correct site/temperature/country/product authorisation and business ownership.
2. Obtain exact official warehouse integration schema and sandbox/production authentication method. Do not invent HMAC, EDI, REST or endpoint paths for Polar Speed without provider documentation. Track this dependency in issue #664.
3. Build and test a least-privilege adapter using approved secrets and immutable source evidence. Test foreign tenant, stale feed, all missing batches, recalls, damaged returns, duplicate event/replay and recovery.
4. Reconcile one accepted receipt, stock-owner/bin/lot balance and quality release to provider evidence; then establish a **separate** ATP and reservation authority with explicit audit.
5. Integrate customer price/eligibility and finance into accepted order transitions only after the existing release gate is independently certified. No public customer-stock claim from the WMS screen.
6. Reconcile pick/pack, carrier tracking, signed POD, invoice and margins. Only then calculate observed OTIF, perfect-order and contribution metrics using trustworthy numerator/denominator and source lineage.
7. Complete end-to-end incident, return/recall, load, browser accessibility, security and disaster-recovery acceptance before repeating for multiple providers/territories.

## Commercial constraints

- **Nutraxin** wellness, **ESCO Anand** B2B equipment and regulated **medicines** remain separate supply rights and execution lanes within one workspace.
- Use current AWS, database, portal and GitHub subscriptions; no new paid SaaS licensed by this implementation.
- The 3PL's own WMS remains its execution system: NovaPharm does not direct another organisation's labour, robots or warehouse hardware without an accepted integration agreement.
- Code merge establishes source acceptance only. Production deployment, stock truth and legally authorised medicines distribution require independent evidence.

## Verification

Run `npm run test:global-distribution-foundation` (includes five-layer tests), the portal's employee and browser suites, CodeQL, production-readiness, supply-chain and tenancy security checks against the *exact* branch HEAD. A PR must not be merged on partial CI success.
