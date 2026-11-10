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

Google requires feed availability to match the product landing page, schema and checkout. All 19 current retail records have available_to_sell=false; the shared catalogue also has delivery_verified=false. Therefore the first feed is correctly out_of_stock for all 19. This DOES NOT claim that physical stock is zero. Do not automatically convert nominal 10,000 unit manufacturer stock to sellable stock without a verified fulfilment commitment. Change flags only after verified sellability and deployment. Every product is in_stock only when delivery_verified, checkout_enabled, payment_collection_enabled, ordering_enabled and available_to_sell are all true.

The feed contains owner-approved GBP prices, no guessed GTIN or MPN, and no unverified delivery SLA. The feed lists the owner-approved UK customer delivery charge, currently £0 as shown in the Bag. This does not verify the fulfilment service, transit time or ability to dispatch. Merchant Center still requires actual UK delivery and returns policies; do not claim unverified delivery times.

## Google Merchant Center actions (account controlled)

1. In Settings > Business info, confirm novapharmhealthcare.com is verified and claimed; ensure genuine business/support contacts.
2. Under Products and shop > Delivery and returns, confirm actual UK delivery service, charges, handling and transit estimates, return and refund policy.
3. Settings > Data sources > Add product source > Add products from a file. Provide the live HTTPS TSV URL above. Schedule fetch, select UK / GBP and enable free listings. Do not select paid Shopping Ads.
4. Products > Needs attention: review each offer's approval, GTIN and identifier issues, business verification and policy violations.
5. Confirm the feed fetched successfully, every individual product URL is publicly accessible, Product markup parses correctly, checkout matches the same price and availability, and Google's final product status is approved.

GitHub code, a merged PR, or a screenshot of a new Merchant account does not demonstrate Merchant Center product approval. Google alone decides approval. Nor does a merge alone demonstrate live deployment.
