# International card payment integration (Stripe Checkout)

**Status: integration adapter and tests only. Not enabled in production; no public Buy Now, order acceptance, payment collection or live account has been established by this change.**

## Intended phase-one experience

Authorised NovaPharm UK customer -> price and availability confirmed in secure portal -> approved GBP order including UK tax and shipping -> Stripe-hosted Checkout -> card, eligible international cards and wallets -> signed webhook -> verified, auditable payment in NovaPharm's durable order ledger.

A UK GBP charge can be paid using an overseas card where the provider allows it. That does **not** mean overseas delivery or charging in foreign currencies is enabled. Export tax, customs, product legality and shipping must be approved for each destination; local-currency presentment can follow once settlement and refunds are tested.

## Implementation

The new src/core/payments/stripe-checkout.mjs offers:
- Default-deny test/live activation with distinct server API and webhook secrets.
- A server-only builder that demands an approved, nonexpired quote, reserved stock, customer and attempt IDs, and reconciled gross GBP line totals.
- Hosted Checkout Session creation via Stripe's server API with a durable, stable idempotency key, fixed HTTPS return paths, card payment support and no client card storage.
- Raw-body HMAC-SHA256 Stripe webhook signature verification and 5-minute timestamp tolerance.
- Verification that signed payment events match an existing stored attempt (session, order, amount, currency, live mode and quote version). A browser return page never confirms payment.

**Deliberately no public API endpoint** is wired by this PR, because the production customer identity, trusted order ledger, stock reservation, VAT registration confirmation, processor approvals and secure portal routing remain unverified. No user's ability to send arbitrary price or approval flags should permit charging a card.


## Durable payment ledger reference

`src/core/payments/payment-ledger-reference.sql` is a **review-only** SQL specification, not an applied production migration. `scripts/test-payment-ledger.mjs` verifies unique provider event IDs, one collectable attempt per order, permitted retries after failed/expired attempts, and rejection of wrong-currency and invalid-state records. This is not sufficient to launch an endpoint: the production database migration, atomic reservation, tenant isolation, CAS updates and transactional outbox must still be reviewed and deployed before any customer funds can be accepted.

## Merchant registration status (8 November 2026)

Owner-provided Stripe screenshots confirm a NovaPharm account dashboard and a connected GBP payout destination. Earlier screenshots show unfinished/invalid director verification. This is **registration, not independently verified live merchant activation**. No complete bank details or identity documents are recorded in this repository.

`src/core/payments/stripe-merchant-readiness.mjs` uses an authorised *server-side* Stripe secret key to read `/v1/account`, producing only non-sensitive capability/status booleans. It checks `charges_enabled`, `payouts_enabled`, `details_submitted`, reported card capability status and outstanding/pending verification requirements. A `pk_live_` publishable key cannot be used for the check. The test suite uses mocks and no real secrets. Do not run this against production or enable live checkout until Stripe merchant category, commercial order/stock/tax and payout eligibility are approved.

## Steps before live payment activation

1. NovaPharm Healthcare Ltd opens a Stripe UK merchant account and confirms legal entity, bank payouts, beneficial ownership, chargeback/refund handling and approved merchant category. **Pharmaceuticals and regulated medical products are restricted categories.** Confirm written approval for applicable product types. Nutraxin food supplement labels and claims also need eligibility review.
2. Complete [commercial production gates #135](https://github.com/NovapharmHealthacre/novapharm-website/issues/135): valid portal/API TLS and DNS, production customer Cognito and scoped sessions, compliant Nutraxin offer/stock and B2B terms; verify actual VAT registration and effective date. For UK standard-rated products, compute VAT where the seller is obliged to charge it. Do not impose UK VAT on every international sale by default.
3. Implement authenticated POST /api/payments/checkout, accepting only opaque order ID. Resolve all commercial data from the server-side database, verify customer ownership, tax location, current prices, entitlement, stock and expiry. Atomically create a durable payment attempt and stock reservation, then call createStripeHostedCheckout with the trusted quote. Persist Stripe session ID before redirect.
4. Implement POST /api/payments/stripe/webhook with raw-body signature validation, unique event-ID deduplication, a transactional state machine for payment/stock/order/fulfillment, retries and independent Stripe reconciliation. Only use verified paid events for settlement. Add partial/full refund and dispute handlers.
5. Add identity-aware customer receipt and payment status pages, finance reconciliation, invoice rules, audit, support, notifications and stock release on expiry. Validate AWS Secrets Manager secret rotation, WAF, throttling, CSRF, TLS, backups and alarm thresholds.
6. Pass sandbox trials with international cards, 3D Secure, declines, timeouts, abandoned sessions, replayed/out-of-order webhooks, cross-tenant attempts, returns, refunds and double-spend cases. Release on an exact commit with rollback and signed approvals. Only then turn on live.

## Secret/environment placeholders (never commit real values)

- NOVAPHARM_PAYMENTS_ENABLED=false (only exact true can activate)
- NOVAPHARM_PAYMENTS_MODE=test (test by default)
- NOVAPHARM_PAYMENTS_LIVE_APPROVED=false (separate approval for live)
- STRIPE_SECRET_KEY: protected server-only AWS Secrets Manager reference, sk_test or sk_live
- STRIPE_WEBHOOK_SECRET: protected server-only AWS Secrets Manager reference, whsec
- Approved portal HTTPS origin, e.g. https://portal.novapharmhealthcare.com

Never put these in GitHub code, static pages, browser storage or app bundles. These named environment variables are **documentation for future API wiring**, not variables that already activate a route.

Provider references: https://docs.stripe.com/payments/checkout ; https://docs.stripe.com/webhooks/signature ; https://stripe.com/legal/restricted-businesses .

Existing customer account staging foundation: https://github.com/NovapharmHealthacre/novapharm-website/pull/140 . Nutraxin order-request PR #137 remains non-binding.

## Commercial pricing, supply and international tax evidence (8 November 2026)

- The AWS Nutraxin customer API implements Cognito-backed login, verified-email checks, staff approval, private pricing visibility and idempotent NON-BINDING B2B requests. The 19-SKU SSM secret contains provisional customer selling prices in 24+ and 48+ tiers, but NO cost-of-goods values from which to prove a 25% gross margin. Do not overwrite tiers or enable binding checkout without a private cost register and price approval.
- Owner reports manufacturing capacity at all quantities. Production capacity is not the same as available-to-promise warehouse stock, batch/expiry status and a customer-accepted production lead time. The commerce-margin-policy module requires either verified ready stock or staff-approved manufacture-to-order with the customer's explicit acceptance of lead time.
- Outlook's Polar Speed correspondence identifies inbound handling charges (December 2025), but not a current destination- and basket-specific final-mile shipping quote for UK delivery or exports. Such a quote requires destination, weight, cartons, service, pick/pack, applicable surcharges, expiry and carrier confirmation. The calculator refuses to guess.
- Target 25% gross margin, rather than 25% markup, is calculated on trusted landed costs with sale price = ceiling((goods + delivery + handling cost) / 0.75), before tax. Profit after card fees, returns and other overhead must be assessed by finance. No private costs are included in this repository.
- Country selection does not establish the VAT, GST, sales-tax or zero-rated treatment. The correct amount depends on product classification, tax registration, location, customer, shipping and import/export terms. Stripe Tax remains pending and there are zero recorded tax registrations as of the last connected account check. A confirmed tax amount for the exact quote is mandatory.
- Live Stripe merchant charges and payouts are enabled, but no approved production secret, public authenticated backend, stock reservation, signed webhook delivery, production payment ledger or verified tax/fulfilment mechanism exists. No live charges until these gates pass.

## Synthetic end-to-end tests

- scripts/test-commerce-margin-policy.mjs: margin arithmetic, stock vs manufactured-to-order, international tax assessment and current delivery evidence.
- scripts/test-stripe-refund-policy.mjs: exact refund charge, merchant-mode and payment identity matching.
- scripts/test-commerce-payment-lifecycle.mjs: private synthetic cost -> checked quote -> Stripe-hosted session mock -> signed payment event -> unique ledger -> signed partial-refund event.
- These do NOT create or refund real Stripe transactions and do not substitute for test-mode 3-D Secure, failed payments, retries, dispute, bank payout, tax invoice, and production rollback testing.
