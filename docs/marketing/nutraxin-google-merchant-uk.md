# Nutraxin Google Merchant Center UK implementation

Google Merchant Center account from the owner screenshot: NovaPharm Healthcare (5902381696).

## Implementation

- Retail source: assets/data/nutraxin-retail-catalogue.json
- Product descriptions and pack images: docs/nutraxin-product-register.json
- Build generator: scripts/generate-nutraxin-shopping.mjs
- Product feed after deployment: https://novapharmhealthcare.com/shopping/nutraxin-uk.tsv
- Canonical individual product pages: https://novapharmhealthcare.com/products/nutraxin/<slug>/
- Validation: node scripts/generate-nutraxin-shopping.mjs --check and node --test scripts/test-nutraxin-merchant.mjs

The existing /feed.xml is a news RSS feed. It is not a Merchant Center product feed.

## Stock and delivery truth

Google requires feed availability to match the product landing page, schema and checkout. On 10 November 2026 the NovaPharm owner confirmed genuine sellable stock exists for all 19 products and stated the range is already supplied through Amazon and eBay. Combined with the previously authorised seller-funded UK delivery commitment and 30-day customer-accepted fulfilment expectation, the catalogue now records available_to_sell=true and delivery_verified=true. This is an owner-attested operational assertion, not an independent warehouse audit or reserved-stock count. If direct UK fulfilment stops, immediately close the relevant product sale-readiness flags and regenerate all pages/feed. Every product is in_stock only when delivery_verified, checkout_enabled, payment_collection_enabled, ordering_enabled and available_to_sell are all true.

The feed contains owner-approved GBP prices, no guessed GTIN or MPN, and no unverified delivery SLA. The feed lists the owner-approved UK customer delivery charge, currently £0 as shown in the Bag. This does not verify the fulfilment service, transit time or ability to dispatch. Merchant Center still requires actual UK delivery and returns policies; do not claim unverified delivery times.

## Google Merchant Center actions (account controlled)

1. In Settings > Business info, confirm novapharmhealthcare.com is verified and claimed; ensure genuine business/support contacts.
2. Under Products and shop > Delivery and returns, confirm actual UK delivery service, charges, handling and transit estimates, return and refund policy.
3. Settings > Data sources > Add product source > Add products from a file. Provide the live HTTPS TSV URL above. Schedule fetch, select UK / GBP and enable free listings. Do not select paid Shopping Ads.
4. Products > Needs attention: review each offer's approval, GTIN and identifier issues, business verification and policy violations.
5. Confirm the feed fetched successfully, every individual product URL is publicly accessible, Product markup parses correctly, checkout matches the same price and availability, and Google's final product status is approved.

GitHub code, a merged PR, or a screenshot of a new Merchant account does not demonstrate Merchant Center product approval. Google alone decides approval. Nor does a merge alone demonstrate live deployment.

## Merchant Center ingestion evidence, 10 November 2026

Owner screenshot shows Google Merchant Center account 5902381696, PRODUCTS SOURCE 2, message 'Your products have been updated', 19 new products added, all attribute names recognised, no product-file issues. This proves file ingestion only; it does not prove each SKU is approved for free listings or Shopping.

The 19 product URLs, source file, schema offers and site purchase actions must publish in_stock only with the owner's attested inventory and delivery commitment. Merchant Center source must fetch the latest live TSV after deployment. Inspect Products > All products and Needs attention to establish each SKU's status. No automatic claim of Google approval is authorised.

## Search-discovery and Merchant feed remediation — 20 November 2026

On 20 November the Merchant Center connector reported LOW click potential for all 19 products and no daily product performance rows for 10–20 November. Missing daily rows do **not** prove zero Shopping impressions. Google's web-search URL Inspection results showed 8 discovered/not indexed, 11 unknown to Google; all 19 product detail URLs had zero web-search impressions for 10–17 November, although the sitemap was downloaded successfully.

- Generated Merchant descriptions now include catalogue-confirmed ingredient **names**, not generic range-only text. No invented GTIN, MPN, therapeutic claim, or dosing assertion is supplied.
- Product and WebPage JSON-LD, concise page metadata and social descriptions remain aligned with their canonical offers. Product Offer seller includes the public logo.
- Updated product detail URLs use 2026-11-20 sitemap last-modified values, while untouched URLs retain previous dates.
- Prices, pack names, stock gating, UK shipping charge, image links and 19 product IDs remain unchanged.
- After deployment verify live TSV and pages, resubmit the existing sitemap, request indexing using Google Search Console UI for priority URLs, and monitor Search visibility separately from Shopping impressions and clicks.
- Obtain manufacturer-authenticated GTINs and UK pack-label confirmation before modifying identifiers.
