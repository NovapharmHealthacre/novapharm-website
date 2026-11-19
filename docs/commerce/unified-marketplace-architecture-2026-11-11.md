# NovaPharm Commerce: unified product, merchant and inventory system

**Date:** 11 November 2026  
**Current implementation:** Atlas catalogue and 392 stock positions created; public multi-brand discovery in PR #438.  
**Release status:** Public marketplace page not yet deployed; database-backed customer ordering/returns/shipments not yet wired into production. Never call the new stock system a production inventory authority before reconciliation and acceptance.

## One umbrella, independent sellers and brands

Commercial entity: NovaPharm Healthcare Ltd, the current first-party merchant. Manufacturer/supplier records are Nutraxin and Eastern Surgical Company (ESCO). Do **not** present a manufacturer as an onboarded third-party seller: no independent seller contract, KYC/AML, settlement agreement, tax liability or payment account has been verified. A future third-party seller becomes active only after checks and marketplace administration approval.

Every product has one durable identity with branded SKU. Each seller offer belongs to a product + seller and declares a currency, commercial price basis, saleability policy and fulfillment mode. The same product may ultimately have several seller offers. Customer checkout must bind to the selected offer and seller, not to a catalogue family.

## Verified Atlas resources

Atlas project: NovaPharm Intelligence Production, cluster `npi-bootstrap`. Database: `novapharm_commerce` (separate logical database). The source catalogues are `docs/nutraxin-product-register.json` (19 Nutraxin references) and `assets/data/esco-catalogue.json` (373 ESCO entries).

Written records:
- 392 product master records, 392 inventory positions, 392 product compliance records.
- 392 price records. Nutraxin prices have owner-approved UK consumer retail scope including VAT estimate; ESCO prices have owner-approved website ex-VAT/ex-delivery base scope, **not** checkout price approval.
- 392 first-party merchant offers, identified by `merchantId=NOVAPHARM-OPERATOR`.
- 392 owner declarations of 10,000 units per catalogue record, or 3,920,000 units in aggregate **as declarations only**.
- All 392 records must keep `availableToPromise=0` until the specific warehouse, exact variant, batch/serial (where applicable), quantity, quarantine, release, tax, rights and fulfillment acceptance have been reconciled.
- Store lot, expiry, temperature hold, bin, source invoice, goods received note, supplier attestation, stock adjustment approver and audit event separately. A blank field means UNKNOWN, not ZERO.

Supported collections include sellers/onboarding, offers, suppliers, warehouses, inventory positions and lots, movements, reservations, returns, orders and order lines, picking, packing, shipments/events, finance ledgers, refunds/reconciliation, fee schedules, advertising, subscriptions, customer order tracking and observed commerce analytics. A created collection does **not** imply an operational endpoint.

## Existing production systems and authoritative boundaries

- Nutraxin public storefront: `/products/nutraxin/`, 19 products.
- Nutraxin AWS checkout API: `https://7cs8kxkj5d.execute-api.eu-north-1.amazonaws.com`; currently uses an SSM owner-price policy and a DynamoDB payment ledger.
- Existing DynamoDB `novapharm-production-nutraxin-inventory` contains 19 owner-attested 10,000-unit records with `reconciliationRequired=true`; the checkout Lambda is not currently proven to reserve these stock positions atomically.
- ESCO public storefront: `/products/esco/`, 373 catalogue records.
- ESCO payment API: `https://vflz5z5jfc.execute-api.eu-north-1.amazonaws.com`. Private SSM approval policy controls individually approved variants, exact payable price, delivery and release. Public guide amounts and seller stock declarations cannot override the SSM policy.
- The GitHub Pages site is a **static public host**. Never expose Atlas credentials, internal stock evidence, contact PII, settlement records, regulated documents or seller tax details in its assets.

The new public route `/products/marketplace/` is an integrated **discovery** surface generated from source-controlled catalogues; it is not a production API connected to Atlas yet. The display page links to the brand-specific existing order journeys. The privacy-safe `assets/data/commerce-marketplace.json` contains no reserved stock or secret payment data.

## Proposed authenticated commerce API contract

Base path `/api/commerce/v1` (not exposed until backend deployment):
- `GET /catalogue`, `GET /products/{id}`, `GET /offers/{id}`: public sanitized summaries and verified availability only. Paginated, rate-limited, cached, no customer PII, immutable server-authoritative prices.
- `GET /orders/{orderId}`, `GET /orders/{orderId}/tracking`: customer Cognito session + order-owner check, no enumeration. Order status requires payment/warehouse/carrier evidence.
- `POST /checkout/reservations`: authenticated/bounded guest-order session, idempotency key, Atlas transaction (or DynamoDB conditional transaction), exact offer approval, verified available-to-promise, TTL and stock ledger event.
- `POST /checkout`: create Stripe hosted checkout only from a committed reservation; Stripe idempotency and server-generated line items.
- `POST /webhooks/stripe`: signature-verified, replay-safe order state changes, cancellation/refund reconciliation and compensating inventory movements. No fulfillment based solely on a browser redirect.
- `POST /seller/products`, `POST /seller/stock`, `POST /seller/fulfilment`: authenticated seller scopes, tenant partitioning, admin approvals and audit. No self-approval of goods receipt/adjustment.
- `POST /admin/reconcile`, `GET /admin/audit`, `GET /admin/finance`: internal privileged roles and MFA only. Restrict source database and AWS secrets access.

Every write must include actor ID, correlation/event ID, supplier/warehouse evidence and time. Idempotent retries may never double-decrement stock, double-charge, duplicate refunds, or send unapproved emails.

## Marketplace economics and NOVA

Commission, advertising, fulfillment, subscriptions, retail margins and additional services are modeled as **separate** ledgers. Do not book uncontracted or unsent charges as revenue, or infer positive margin from unverified supplier costs. Merchant revenue is a settled Stripe/warehouse-derived observation, not a draft plan.

NOVA Commerce Intelligence may consume only accepted, source-linked, privacy-minimized aggregates:
`{date, productId, orderCount, shippedUnits, grossSalesMinor, verifiedAvailableUnits, ownerDeclaredUnits, evidenceLabels, sourceIds}`.
Label sales as **Observed fact** only when signed payment and order ledger reconcile. Owner warehouse declarations are **Commercial assumptions** until count and goods-receipt acceptance. Replenishment suggestions are **Recommendations**; demand forecasts are **Model forecasts**, with backtests and intervals required before customer publication. Never translate supplement/equipment sales into medicine shortages without separate lawful and validated datasets.

## Production acceptance before marking fully live

1. Reconcile warehouse address/locations, product identity, 10,000-unit declarations to physical or supplier-allocatable stock for **each** SKU. Record lots, damaged/quarantined units, expiries/serials, supplier rights and dispatch SLA.
2. Provision secure Atlas service identity and network policy for production application, secret rotation, replica backups and least-privilege rights. The free-tier `npi-bootstrap` is a bootstrap environment, not proof of production SLA.
3. Wire order reservations to the same stock authority used by both Stripe checkout APIs. Run concurrent last-unit purchase tests, reservation expiry/cancellation tests and signed Stripe webhook/return/refund idempotency tests.
4. Enforce paid-order picking/packing and carrier scans with a genuine UK delivery service integration; test tracking and returns on a non-customer acceptance order. Never send external emails without a specific approved recipient and message.
5. Gate third-party seller onboarding with commercial agreements, KYC, seller settlement/Stripe Connect capability, VAT/invoicing, moderation, prohibited listings and dispute handling. Keep uncontracted monetization plans inactive.
6. Deploy the public route through the protected GitHub CI/CD workflow; verify HTML, search, accessibility, mobile Safari, links, security checks and live content parity. Only then describe the new page as live.


## Owner-authorised 10,000-unit inventory integration (11 November 2026)

The owner has confirmed 10,000 units per catalogue record as on-hand warehouse stock. This was accepted as an **owner attestation** for all 392 references, without pretending an independent audit occurred.

- Atlas `novapharm_commerce`: 392 `inventory_positions` and 392 `seller_offers` carry `ownerConfirmedAvailableUnits=10000`; 392 `inventory_reconciliations` carry `ownerApprovalStatus=approved`. Existing `verificationStatus=unverified`, `physicalQuantity=null` and `availableToPromise=0` remain independent release safeguards.
- DynamoDB: 19 Nutraxin and 373 ESCO records carry `ownerConfirmedUnits=10000` and `ownerConfirmedAvailableUnits=10000`. Original stock and item-level approval policy fields remain intact.
- Owner-confirmed combined quantity: **3,920,000 units**.
- Production read-only stock API: `https://eyoj5e64zb.execute-api.eu-north-1.amazonaws.com/stock?skus=NUT-UK-MVE-T60,NP-ESCO-0003`. Requires 1-24 validated SKUs. DynamoDB `BatchGetItem` only; rejects unsafe fields and never authorizes checkout. Lambda: `novapharm-public-commerce-stock`. CloudFormation: `novapharm-production-commerce-stock-read-api`.
- Marketplace browser now fetches stock for its visible products and uses the term `Owner-confirmed warehouse stock`. Displaying the quantity does not enable payment on ESCO records without exact variant and commercial approval.
- NOVA's private evidence bucket contains `commerce/owner-attestations/2026-11-11/owner-confirmed-warehouse-stock-392.json` with all 392 owner confirmations. The scheduled evidence-export source is prepared to include the same owner-confirmation fields.
- **Free-tier-compatible alternative:** DynamoDB is the runtime inventory source for AWS commerce, with MongoDB Atlas remaining the separate catalogue and analytics staging database. This avoids a mandatory paid Atlas PrivateLink/NAT dependency; DynamoDB/API Gateway/Lambda usage can still incur charges if monthly free quotas or AWS credits are exceeded.

Remaining integrations: transactional checkout reservations and failed/expired-order release against the same stock ledger, verified Stripe charges and refunds, carrier tracking provider onboarding, seller KYC/Connect payout setup, downstream NOVA customer workspace acceptance, and successful GitHub Pages publication. Do not equate an owner confirmation with a third-party physical-stock certificate.
