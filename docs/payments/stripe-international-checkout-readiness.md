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
