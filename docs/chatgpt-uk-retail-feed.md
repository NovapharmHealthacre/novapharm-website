# ChatGPT UK retail feed — governed release

## Verified production price snapshot — 28 November 2026

A read-only DynamoDB Query against `eu-north-1`,
`novapharm-production-nutraxin-payment-ledger`, partition
`RETAIL#APPROVED` returned 52 approved retail offers.
The first five manually commerce-policy-reviewed non-supplement
records were joined to the publicly approved consumer catalogue:

| GTIN | Product | Approved VAT-inclusive GBP |
|---|---|---|
| 4103040003188 | Sebamed Clear Face Mattifying Cream | £7.30 |
| 4103040004932 | Sebamed Clear Face Gentle Scrub | £6.86 |
| 4103040036308 | Sebamed Clear Face Foam | £6.64 |
| 5060062999488 | Lansinoh Feeding Bottle 160ml | £4.87 |
| 5060062999518 | Lansinoh Feeding Bottle 240ml | £5.24 |

DynamoDB gives `orderingEnabled=true`, `priceApproved=true`,
`ukRetailApproved=true`, `fulfilmentVerified=true` and
`sellerDeliveryCommitment=true` for these five, but
`stockVerified=false` and `supplierBackedOrdering=true`.
**OpenAI availability must therefore be `unknown`, NOT `in_stock`.**
Never convert owner-declared 1,000-unit supplier capacity into warehouse
inventory. Product URLs and pack image paths are drawn from the approved
public catalogue, never from supplier quotes or planning prices.

The price snapshot has a maximum 48-hour freshness. A future Pages
build with stale pricing withholds the entire feed rather than
advertising stale prices or blocking the corporate website.
**Production still needs an automatic authorised read-only AWS refresh**
to make the feed reliably available beyond this snapshot.

The standard OpenAI feed schema describes US market support by default;
the UK/GBP Business Hub selection does not guarantee acceptance.
Do not claim UK ingestion or sales until OpenAI accepts and reports
the uploaded feed in Business Hub.


The Business Hub hosted-URL field should eventually use:
`https://novapharmhealthcare.com/feeds/chatgpt-products.csv`

**Do not enter this URL in the Business Hub while it returns 404.** The
endpoint is intentionally unpublished until there is at least one product
with an approved, fresh, accurate UK retail offer. A header-only feed or a
fabricated offer would misrepresent the merchant catalogue.

## Existing sources
- `src/content/approved-consumer-catalogue.json`: confirmed public
  identities and product photography, **not** an active price or stock feed.
- `assets/data/connective-owner-price-guide.json`: guide prices only,
  **not** verified active checkout prices.
- `shopping/nutraxin-uk.tsv`: Google Merchant feed for food supplements,
  **not** an eligible OpenAI shopping feed.
- ESCO records are source references and not approved retail offers.

## Admission contract
Write only authorised, publicly displayable SKU offers to
`src/content/chatgpt-uk-verified-offers.json`. Every record must have:
- `ean`, matching approved identity, product type and licensed pack photograph.
- `productUrl` equal to its real NovaPharm SKU page.
- `pricePence` (positive, VAT-inclusive), `availability` in
  `in_stock` or `out_of_stock`.
- `priceCheckedAt` and `stockCheckedAt` (recent UTC; max 48 hours).
- `sellerApproved=true`, `checkoutVerified=true`,
  `priceIncludesVat=true`, `source="verified-live-retail"`.
- `policyApproved=true` and `policyReviewReference` after a separate
  OpenAI Commerce-policy review.

Only `cosmetic` and `consumer_non_medicinal` classes can be admitted;
food supplements, medicines, ESCO quote-only entries and supplier
references are excluded. Any failed admission stops the build.
Only real, approved and publicly reachable landing pages and
photographs can be published. Search is enabled, but OpenAI Ads and
in-ChatGPT checkout are explicitly disabled.

## Build and release
`node --test scripts/test-chatgpt-uk-feed.mjs`
`node scripts/build-chatgpt-uk-feed.mjs` reports eligible row count.
During `scripts/stage-pages-artifact.mjs`, the feed is generated into
`_site/feeds/chatgpt-products.csv` only if nonempty and valid. The staged
allowlist permits that one exact path, not arbitrary files in `feeds/`.
The existing verified GitHub Pages publication gate remains unchanged.

**Operating note:** Static-file snapshots cannot reflect live AWS stock
changes without an authenticated exporter and scheduled publishing.
Before enabling any offers, implement a verified read-only WMS/AWS export
and daily refresh with anomaly monitoring, then confirm HTTP 200 and
content with a live request and inspect Business Hub Upload history.
The AWS connector currently returns an organisation-level explicit deny
for DynamoDB ListTables. No IAM bypass or guessed prices were used.

References:
- https://openai.com/policies/commerce-policies/
- https://developers.openai.com/commerce/specs/file-upload/products
- https://developers.openai.com/commerce/guides/submit-product-feeds
