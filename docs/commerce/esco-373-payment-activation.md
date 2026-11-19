# ESCO 2026: 373-catalogue ordering and Stripe authorisation

**Scope:** 373 catalogue references in 12 groups; all may enter a customer's Bag and submit a business order request. A reference does **not** acquire permission to collect card payment from its public guide price or 10,000-unit planning-stock statement.

## Merchant-approved 373 unit prices (9 November 2026)

The owner has expressly authorised the **displayed catalogue guide GBP unit amounts as merchant-approved base selling prices** for all 373 references. The merchant review matrix therefore records the same figure in `owner_approved_catalogue_unit_price_ex_vat_gbp` with approval date 2026-11-09. This approves the listed per-reference **base price, excluding VAT, delivery, and any unresolved variant-specific difference**. It does not establish UK delivery included, the correct tax treatment, a physical inventory allocation, exact variation, a supplier entitlement, or eligibility for immediate Stripe card capture. Two pre-existing protected exact-model records retain their server-approved UK-delivered prices, even where those differ from catalogue category guides.

## Current customer journeys

- **Exact approved SKU basket**: protected `GET /readiness` returns a server-approved catalogue identifier and fixed UK delivered ex-VAT price. Customer agrees to terms; `POST /checkout` creates a Stripe-hosted payment session with server-generated line items and automatic tax. Signed Stripe webhook reconciles the completed session with the DynamoDB ledger. A redirect is not proof of payment.
- **Unapproved or mixed basket**: customer sees the guide estimate and a single primary **Continue with order request** action. It opens the existing verified NovaPharm Contact enquiry, prefilled with the precise catalogue identifiers and quantities; the business confirms exact model/variant, price, availability and tax before payment is requested. A grey, inert payment button is hidden. The Bag remains saved.
- **No browser amount is trusted**: the public 373 UK research guide prices and cost envelopes are planning aids, never a payment authority. The shopping cart records only catalogue IDs and integer quantities.

## Merchant review path for all 373

Run `node scripts/esco-merchant-release-matrix.mjs` to produce `docs/commerce/esco-2026-merchant-release-matrix.csv` locally. It includes each catalogue ID, catalogue page, model (when provided), category-level UK guide, illustrative freight and fee budgets, and the maximum assumed supplier/inbound cost compatible with a **modelled** 25% gross margin. Its empty fields deliberately **do not** certify any actual cost, legal status, stock, VAT treatment, variant or UK delivery.

For every reference that should accept **immediate** payment, reconcile:

1. **Exact saleable identity:** model, size/variant, pack configuration, price unit, and correct supplier image/provenance. Supplier catalogue labels alone do not confirm every variant. 300 of the 373 records currently lack model codes.
2. **Supply:** manufacturer sale rights, qualified supplier, allocated available-to-promise units (not owner-declared planning units), dispatch service and GB delivered cost.
3. **Regulatory and tax evidence:** appropriate UK product class, any device registration/UKRP/conformity records applicable to that exact variant, Stripe product tax code and verified UK VAT treatment. Preserve the evidence link/reference even when the merchant states checks are complete.
4. **Commercial authorisation:** fixed delivered ex-VAT GBP unit price, owner sign-off and actual or explicitly owner-attested cost basis. Confirm actual variable costs fit the margin target; guide prices do not prove margin.
5. **Server-only payment release:** use `apps/esco-checkout/merchant_release.py` to generate exact, individually approved SKU records, confirm them with the backend's `eligible()` contract, and publish an immutable SHA256-pinned **private S3 approval manifest**. The existing SSM `/novapharm/production/esco/checkout-policy` retains the small global gate and a manifest pointer; it cannot hold all 373 complete records. Do not put secrets, supplier costs or approval flags in the public catalogue or localStorage.
6. **Exact-SKU testing:** for each batch verify `GET /readiness`, negative unauthorised SKU, quantities, VAT, UK delivery, Stripe Checkout session, signed webhook, idempotency, paid-order ledger, and post-payment fulfilment handoff. Do not simulate a paid customer order and report it as a live settlement.

## Current boundary

The verified private payment policy currently contains ESCO-CAT-0003 and ESCO-CAT-0048 only, at **£710** and **£169** ex VAT respectively with UK delivery included. This statement records the 9 November 2026 check, not a promise that those prices can never change. All other records require per-variant approval before card capture.

A future **confirmed quote → hosted Stripe invoice/payment link** flow may provide secure payment for every requested catalogue reference after exact supplier and commercial confirmation. It has **not yet been implemented** by this document or the existing contact enquiry; do not present a quote request as a completed order or a payment.

## Scalable 373-product activation utility

See [ESCO 373 fixed-price launch](esco-373-fixed-price-launch.md) for the 373-row draft, source-evidence register, protected S3 approval manifest, exact-version policy pointer and release tests. This process does not auto-authorise the 371 remaining references.
