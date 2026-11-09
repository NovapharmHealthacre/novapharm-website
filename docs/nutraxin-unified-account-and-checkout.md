# Nutraxin: one customer journey for account and checkout

**Status (9 November 2026):** Consumer guest ordering is implemented in the Products-only feature branch. The public checkout API and signed Stripe webhook are deployed. Consumer **account registration, email OTP, persistent customer sessions, saved addresses, and order history are not released**. Do not present staging Cognito or the business customer portal as production consumer login.

## Experience contract

1. Product: browse 19 SKUs, see server-governed GBP pricing, select quantity, Add to Bag or Buy now. No login wall.
2. Bag: edit items, review UK VAT and delivery, continue without account. Mobile and desktop share the same calm four-step journey: **Bag → Details → Payment → Confirmation**.
3. Identity: returning customers may sign in and new customers may verify an email using one-time code **only once a separately audited production consumer-identity service is released**. Guest purchases remain available and must not be forced into the business-account process.
4. Delivery and payment: Stripe Checkout currently collects the buyer's email, billing information, UK shipping address and card securely. Checkout is hosted by Stripe, not embedded. If Embedded Checkout is selected later, explicitly implement Stripe's return/session security and a PCI-responsible integration; no imitation credit-card form.
5. Confirmation: a return URL is **not** proof of payment. A signed Stripe webhook reconciles the ledger and emits the fulfilment notification once; refresh/replay must not duplicate an order.
6. Account: a verified customer can view **only their own** order history, invoices, delivery status and addresses. A guest can optionally claim the purchase after verifying ownership. Payments and UK sales are never routed through the staff / secure business portal.

## Production consumer identity implementation (not yet active)

Use a **separate production Amazon Cognito consumer user pool** and a same-origin backend-for-frontend (BFF) under `/products/nutraxin/api/`. The staff Entra and qualified B2B Cognito identities remain isolated. Use email OTP or passkeys where supported; no client-side ID-token storage.

Required server-owned endpoints:

| Endpoint | Requirement |
|---|---|
| `POST /products/nutraxin/api/identity/start` | Rate-limited email challenge with generic response to prevent account enumeration |
| `POST /products/nutraxin/api/identity/verify` | Verify code with Cognito; issue Secure, HttpOnly, SameSite=Lax session cookie bound to the main site |
| `GET /products/nutraxin/api/identity/session` | Return only authenticated state and minimal profile |
| `POST /products/nutraxin/api/identity/logout` | Revoke server session, clear cookie, protect against CSRF |
| `GET /products/nutraxin/api/orders` | Authenticated, subject-scoped order list; never trust a browser-supplied customer ID |
| `POST /products/nutraxin/api/orders/claim` | Require verified email and short-lived single-use claim proof derived from a **paid** order; verify stored Stripe receipt email/server ownership |
| `GET/PATCH /products/nutraxin/api/profile` | Verified address/profile changes with consent and least-data storage |

Create verified and idempotent links among Cognito `sub`, internal `customer_id`, Stripe customer/payment references, and paid-order IDs. Never link historical orders solely by matching a typed email address. Keep addresses encrypted and retained only under an approved privacy and retention policy. Limit failed OTP attempts, use AWS WAF/rate limiting, audit security events, and guard all state-changing endpoints against CSRF.

## Existing guest checkout safety boundary

Keep the existing Products-only checkout endpoint `/checkout` on its dedicated AWS API and **do not** accept prices, tax, delivery, stock, approval flags, or merchant identity from the browser. Final totals come from a trusted approved server-side register; payment attempts use an idempotency key. The production Stripe webhook is the payment authority, not the browser return page. Where customers are unauthenticated, the paid order remains a guest order until a secure claim succeeds.

## Release checklist

- [x] Apple-inspired Product → Bag → Details → Payment → Confirmation journey in Products branch
- [x] Guest Stripe hosted Checkout and signed-webhook reconciliation code
- [ ] CodeQL and release verification gates green for the Products-only branch
- [ ] Publish and verify the Products-only site artifact
- [ ] Test a real small-amount transaction, signed webhook, reconciliation, notification, fulfilment and refund path
- [ ] Deploy isolated production consumer Cognito + same-origin BFF
- [ ] Verify OTP onboarding, returning sign-in, session expiry, account recovery and CSRF controls
- [ ] Link paid guest order only after verified claim proof
- [ ] Enable My Account (addresses, owned orders, invoices, tracking) after access-control tests
- [ ] Complete keyboard, screen reader, mobile Safari and browser acceptance tests

**Never call the full account-and-order flow live until the relevant identity, payment, deployment and end-to-end checks pass.**
