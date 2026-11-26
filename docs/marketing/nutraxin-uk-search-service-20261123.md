# Nutraxin UK SEO + customer service rollout (23 Nov 2026)

This branch improves 19 exact UK Nutraxin product pages, not medicine marketing.

## Candidate changes
- 19 distinct search-intent phrases; human-written product-specific wording limited to catalogue facts. No guaranteed rank, volumes, medical claims or reviews.
- Align HTML meta, Open Graph, Twitter and WebPage JSON-LD description to `assets/data/nutraxin-uk-search-intents.json`.
- Add an accessible order-assistance link to the existing Contact route on each product page; no unapproved customer-service SLA.
- Merchant feed, prices, stock, checkout, GTINs and production permission remain unchanged.

## Remaining external and release gates
- Exact-head CI and managed AWS Contact-preserving production authorization; merging is not deploying.
- Verify all 19 pages and the live UK Merchant TSV on the actual custom domain.
- Use free native Search Console: inspect 19 URLs, track indexed count and GB search impressions/clicks after 7 and 28 days. GSC Wizard connector presently requires a subscription.
- Merchant Center: 18 active/1 disapproved latest recorded baseline. Investigate Magnesium Complex + B6 against the actual product-level Google policy diagnostic and supplier UK label; never disguise an ingredient or file an unsupported appeal.
- Confirm real manufacturer/GS1 identities, approved UK pack labels/photography, and the 15-versus-20-tablet Vitamin MAX effervescent discrepancy.
- Owner must confirm public UK returns/refund terms (window, exceptions, address, handling and costs), customer-support email/hours, delivery times before website/Merchant policy publication.
- Only count purchases from verified Stripe paid-order reconciliation; maintain consent-gated non-sensitive GA4 and report orders, return rate, customer service and repeat purchases using real data.
