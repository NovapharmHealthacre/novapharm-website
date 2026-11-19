# Nutraxin account-first ordering journey: staged implementation

Date: 8 November 2026
Release state: **pre-commerce handoff only**. No public sale, price, checkout, payment, order write or confirmation.

## Implemented in this change

1. An Apple-inspired product-detail business-account entry panel uses the governed Nutraxin product register, 19 names, SKU identifiers and pack imagery.
2. Selection is transported as a publicly non-sensitive SKU, not price, identity, stock or a customer record.
3. Customer login, and the federated sign-in callback if enabled, preserve a validated SKU selection and continue to the customer-products workspace.
4. The customer-products workspace displays the selected product after the authenticated account check, without placing an order.
5. Unknown SKUs, arbitrary URLs and non-customer access do not receive a product-specific redirect.
6. Customer onboarding continues to require separate business verification and approval.

## Release gates for actual Buy Now and order placement

- Determine Nutraxin UK food-supplement seller/FBO status, distance-selling information and exact approved labels for all sellable SKUs. No medicine-specific WDA requirement should be incorrectly applied to supplements.
- Approve UK sales rights and product-level UK sale status, with any Amazon exclusion honoured.
- Verify live price-list authority (customer tiers, currency, effective dates), VAT treatment, delivery/returns terms and invoice content.
- Connect governed lot/expiry-aware stock and available-to-promise; integrate reservation and fulfilment events.
- Fix the existing generic createOrder service's hard-coded tax = 0, add idempotency, no overselling, reprice/revalidate on server, order confirmation and cancellation/reconciliation before exposing it.
- Implement customer-authenticated checkout and payment or invoice terms under the approved merchant arrangement; never accept card data directly on this website.
- Prove login, Entra/Cognito federation where appropriate, account activation, tenancy isolation, audit trail, secure CSRF and rate limits, operational monitoring, email notifications, failed payment and rollback.
- Pass production smoke tests with real approved customer credentials and written launch approval.

## 8 November UK VAT and public-release status

- HMRC VAT Notice 701/14 section 4.2 and VFOOD1960 support 20% standard-rated UK VAT for vitamin/mineral supplements and dietary supplements not normally eaten as food.
- `src/core/uk-vat.mjs` calculates tax-exclusive GBP line values in integer pence, rounds per line and refuses unknown VAT classifications and non-GB destinations; `scripts/test-uk-vat.mjs` provides explicit checks.
- `src/core/domain-service.mjs` rejects attempted Nutraxin order submission even if its lifecycle flags are misconfigured; the generic order service's existing zero-tax path must not be used for Nutraxin.
- The static GitHub Pages product detail generator now shows a responsible business account CTA, without public pricing or a false Buy Now claim.
- The Next.js product/account journey is built but gated: the public account button routes to an application until `NOVAPHARM_CUSTOMER_PORTAL_ACTIVE=true` **and** `PORTAL_ORIGIN=https://portal.novapharmhealthcare.com`. Both require separately verified production infrastructure.
- In AWS eu-north-1, the authenticated portal found in the accessible account was a staging-private ECS service; no independent public production customer portal/checkout endpoint was confirmed at this review.

The existing `docs/products/nutraxin-commerce-readiness.md` commerce gate remains in force. **Do not ship a Buy button or claim that orders can be placed until all applicable gates are closed.**
