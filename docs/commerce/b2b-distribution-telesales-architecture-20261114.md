# NovaPharm Healthcare — governed B2B distribution and telesales architecture

**Proposed design, 14 November 2026. Status: source-only first increment; NOT a live telesales or regulated-medicine order service.**

## One account, one commercial ledger, multiple channels

The existing governed customer workspace remains the customer account and visibility boundary. Telesales, customer self-service, approved representatives and authorised ERP/EDI integrations must use the **same** offer, order, stock, finance and fulfilment authorities. Nutraxin and ESCO are product collections, not separate accounts or ledgers. The internal employee role may assist ordering; that permission never authorises customer impersonation.

### Customer journey
1. Search exact product identity, strength, pack, manufacturer, country and accepted provenance.
2. Access only account-specific approved prices, credit terms, VAT and delivery charges.
3. See verified allocatable stock or explicit unknown/quote-only status; never treat declared warehouse quantity as ATP.
4. Create and repeat requests; see them in the same My Orders account.
5. Access evidence-linked order, backorder, delivery, invoice, return and case history; no invented delivery dates.

### Telesales journey
1. Verify employee session, MFA, assigned customer account and the caller using auditable evidence.
2. Search server-authorised catalogue, not client-provided saleability and price claims.
3. Enter a phone-assisted, non-binding request against the customer's account with idempotency reference.
4. Route to current customer/licence eligibility, contract price/credit, regulatory scope, stock, FEFO, quality and fulfilment approval.
5. Clearly present supplier follow-ups, backorder reasons and named case ownership; never offer automatic clinical substitution.
6. Preserve the action trace without disclosing other tenants' information.

## Phased acceptance matrix

| Phase | Capability | Stop/go proof |
| --- | --- | --- |
| P0 | Governed assisted-order draft | Employee/MFA/caller/tenant negative tests |
| P0 | Shared request ledger | Atomic idempotency, customer read-own requests |
| P0 | Product identity | No wrong medicine/strength/pack |
| P0 | Truthful stock | Independent reconciliation; no owner-declared ATP |
| P0 | Regulated product and customer gate | WDA(H)/GDP, supplier, customer, RP and territory proofs |
| P1 | B2B contract pricing and credit | Signed quote expiry, VAT, financial approval |
| P1 | Binding shared order service | Reserving stock atomically, authorization, retry and cancellation tests |
| P1 | Warehouse, shipment, returns | FEFO, scanning, temperature when relevant, proof of delivery |
| P1 | Telesales service and exception desk | Audited case lifecycle and response-quality metrics |
| P2 | EDI/ERP and pharmacy integrations | Scoped credentials, idempotent synchronisation and customer access |
| P2 | Medicine and demand intelligence | Accepted rights, freshness, human oversight and backtests |

## Implemented on this branch

- src/commerce/b2b-assisted-order.mjs: pure, fail-closed request preparation.
- scripts/test-b2b-assisted-order.mjs: staff and caller verification, account isolation, approved catalogue, false availability, regulated-medicine no-release, untrusted browser fields and safe projection.
- Existing commerce lifecycle test suite imports the new regression tests.
- Does NOT create a persistent record, deploy services, render an employee screen, process orders, allocate stock, accept payment, send email or authorise medicine supply.

## Required operational gates
- Never release regulated medicine without current legal authorisations and roles, approved supplier/customer, product-country rights, traceable batch, storage compliance and quality disposition.
- A third-party warehouse licence does not automatically authorise NovaPharm wholesale activities.
- A telesales draft is not an accepted quotation, sale, stock reservation or dispatch instruction.
- £0 additional monthly spend is a planning constraint, not a promise of free cloud transactions.
- Production needs exact-HEAD CI, live server-authorised customer/employee/tenant tests, rollback and business/RP/finance approval.

## Current integration dependencies
- PR #630: unified customer catalogue and non-binding purchasing requests. Integrate rather than duplicate.
- Issue #601 and issue #55: unified enterprise portal and AWS production gates.
- docs/commerce/unified-marketplace-architecture-2026-11-11.md: stock and saleability evidence.
- docs/strategy/global-distribution-execution.md: UK regulated wholesale gates.

## Public reference evidence
- McKesson Connect: https://www.mckesson.com/pharmacy-technology/pharmaceutical-ordering/drug-returns/
- Cencora ABC Order: https://www.besse.com/abc-order-online-supply-management
- PHOENIX My-PIN: https://www.phoenixmedical.co.uk/en/
- UK pharmacy wholesaler supply/ordering study: https://pmc.ncbi.nlm.nih.gov/articles/PMC9335932/
- August 2026 DHSC medicine distribution best practice: https://www.gov.uk/government/publications/best-practice-for-ensuring-efficient-supply-and-distribution-of-medicines-to-patients/ensuring-the-efficient-supply-and-distribution-of-medicine-to-patients-best-practice-guidance
- MHRA UK medicine import requirements: https://www.gov.uk/guidance/import-a-human-medicine
