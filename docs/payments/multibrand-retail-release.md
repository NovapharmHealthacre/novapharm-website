# NovaPharm multi-brand retail release contract

The owner-selected draft price assumption is 20% UK VAT. Every customer-facing amount is gross GBP; the server calculates VAT per unit in integer pence. Verified statutory exceptions are retained. Do not treat the supplier's purchase or trade prices as approved consumer selling prices.

## Shared flow

New product pages use the existing shopping bag, guest/account checkout, promotion preview, private Stripe worker and signed order-status reconciliation. The existing NUT order-reference namespace is kept for compatibility with payment webhooks and account history; it does not describe product brand. The Lambda feature flag MULTIBRAND_ENABLED defaults to false; do not enable it merely because a PR passes.

## Release prerequisites (all required)

- Deduplicated GTIN identity, category, pack and manufacturer information; current label, ingredients, warnings, directions and permitted claims.
- Approved and variant-matched local images with documented usage rights. Generate product pages from the public allowlist; no supplier purchase prices or trade discounts in Git.
- Private retail offer record per SKU in the existing ledger partition RETAIL#APPROVED. The sort key is NP-CP- plus the GTIN; offerJson must satisfy verified_retail_offer. Set all approval booleans only from actual evidence, including tax verification, valid consumer retail authority, stock verification and seller delivery commitment. Current expiry, quantity, approved net and rounded gross pence are mandatory. No medicine enters this release.
- Agree and publish legally reviewed cross-brand consumer sale, delivery and returns terms, and verify VAT registration/invoicing requirements.
- Verify availability and fulfilment, including any stock reservation/concurrent-order design; the current seller-commitment path does not reserve physical stock. Do not promise dispatch dates or quantity without evidence.
- Confirm product-scope promotions and discount floors, SES order-confirmation and delivery templates, delivery tracking, account order history and refund handling for mixed brands. Existing coupon authorisations do not automatically extend to new brands.
- Test existing Nutraxin-only checkout, mixed basket totals, guest/account flow, Stripe hosted return, signed webhooks, refunds, order history, email delivery and stock failure. Verify browser and mobile accessibility and no regression.
- Deploy the private worker first and then the public API with the flag OFF using reviewed infrastructure changes. Verify existing orders still work. Publish matched public product pages and approved price/offer records, then enable only after independent acceptance and owner approval. Rollback: disable the flag without deleting orders, saved bags or status lookups.
- Reorder and recurring replenishment are distinct release items: no recurring payment without explicit subscription terms, opt-in, price/frequency disclosure and cancellation controls.

This is a draft implementation, not a live release or a claim that any supplier SKU has been approved.
