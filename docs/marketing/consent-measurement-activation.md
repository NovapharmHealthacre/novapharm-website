# NovaPharm zero-paid-media measurement release

## Implementation state, 9 November 2026

- PR #170: organic founder-led messaging approved and merged.
- PR #184: Nutraxin consumer search metadata merged; public domain parity requires separate AWS-contact-safe release.
- This candidate: supports coarse, consent-controlled GA4 on public corporate, Intelligence and Nutraxin pages. **Disabled by default**.
- No ad pixel, retargeting, marketing cookie, customer profile or automated email campaign.
- No client-side purchase, qualified-enquiry or early-access event. Verified sales and leads require durable, authorised backend records.

## Explicit activation gates

1. In Google Search Console, verify the owner-controlled property, check canonical site and submit the existing three sitemaps. Record confirmation from Google.
2. In Bing Webmaster Tools, verify or import the same property, submit sitemaps and check IndexNow key is publicly readable. Record confirmation from Bing.
3. Create an owner-controlled GA4 *web stream* for `https://novapharmhealthcare.com`, under the approved privacy terms. Record the actual public `G-...` measurement ID without disclosing passwords or API credentials.
4. Complete applicable UK privacy, cookie and international transfer review. Update published cookie notice to name GA4 and its retention/purpose. Keep optional analytics OFF by default.
5. Only then configure the release build's `PUBLIC_GA4_MEASUREMENT_ID` with the verified measurement ID and `PUBLIC_ANALYTICS_PRIVACY_APPROVED=true`. The identifier alone does not activate the provider.
6. On a staging page, prove no `gtag/js` request or GA cookies before consent. After analytics-only acceptance, verify a generic pageview and coarse brand/CTA/funnel event in GA4 DebugView. On withdrawal, confirm further requests stop and GA cookies expire.
7. Release through the approved AWS-contact-preserving public pipeline, not plain static Pages recovery. Independently verify Contact submissions and Nutraxin checkout remain functional.
8. Join GA4 acquisition counts to *separate* backend-verified, privacy-controlled order and qualified B2B enquiry aggregates before counting conversions. Do not use checkout clicks as purchases.
9. Clarity must remain **off** unless it receives its own reviewed consent, masking, route exclusion, transfer and retention review. Exclude portal, account, contact and all health/supplement/checkout pages; never log sensitive form details.
10. Merchant Center free listings may start only after real sellability, final approved prices/stock/shipping/returns, product labelling, paid-order processing and fulfilment are verified. Never present static catalogue references as approved retail offers.

## Events

| Event | Source | Meaning |
| --- | --- | --- |
| `page_view` | Consent-approved public site | Anonymous page load; query strings suppressed |
| `cta_click` | Consented public CTA | Intent signal, not a qualified lead |
| `view_item` | Nutraxin detail displayed | Coarse item-view signal, no SKU or personal record |
| `add_to_cart` | Nutraxin local Bag mutation | Basket action, not a sale |
| `begin_checkout` | Server-authorised Stripe redirect | Funnel intent, not collected payment |
| `purchase` | **Not emitted by browser** | Must come from reconciled signed Stripe payment and durable fulfilled/accepted order state |
| `qualified_enquiry` | **Not emitted by browser** | Requires verified backend lead qualification |
| `qualified_early_access` | **Not emitted by browser** | Requires approved durable interest record |

No traffic, conversion, revenue or return figures are claimed until the authoritative platforms and backend supply them.

## Organic distribution programme

Distribute original, medically and commercially reviewed content to controlled NovaPharm social channels, without paid boosts. One core idea per post, one specific action, one evidence source, no invented clinical effects, approvals or market availability. Healthcare: market access, quality and supply-resilience education. Nutraxin: range navigation, label literacy, composition data with no unapproved health claim. Intelligence: medicine identity, evidence-versus-model provenance and illustrative terminal walkthrough. Do not send unsolicited commercial email or publish through a user account that is not connected and authorised.
