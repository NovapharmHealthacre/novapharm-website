# Nutraxin UK / ChatGPT merchant discovery: operator handoff

## Verified source, not a live ChatGPT feed
- Exactly 19 existing UK Nutraxin offers; the canonical source is shopping/nutraxin-uk.tsv and assets/data/nutraxin-retail-catalogue.json.
- UK prices and one £4.49 UK delivery line are verified by the existing AWS read-only quote API. A ChatGPT product listing does not process checkout or reserve stock.
- The exporter is **offline**. It uploads nothing, does not send emails, and cannot buy Ads. It does not alter website prices, shipping, product descriptions, images, or crawler permission.
- The two magnesium SKUs NUT-UK-MGCX-T60 and NUT-UK-MGDL-T60 have **is_eligible_search=false** pending review of Google's unapproved-supplements policy flags and actual UK pack evidence. This conservative hold is a NovaPharm decision for this *candidate export* only; it does not claim Google policy applies to OpenAI.
- All 19 records have is_eligible_checkout=false and is_ads_eligible=false. Direct ChatGPT checkout and Ads are separately authorized integrations, not inferred from existing NovaPharm Stripe readiness.
- The primary Nutraxin product imagery is the actual manufacturer-sourced image already in the canonical Merchant feed, not generated marketing imagery.

## Current platform limitation — do not work around it
OpenAI's published **stable** product feed schema (27 November 2026) describes standard geography as US, with additional country handling depending on a registered integration. It does **not** confirm that every UK/GBP merchant can upload GB listings. Do not submit them as US, invent US stock or convert to USD.
Official references:
- https://developers.openai.com/commerce/guides/submit-product-feeds
- https://developers.openai.com/commerce/specs/file-upload/products
- https://developers.openai.com/commerce/specs/file-upload/overview

## Business Hub prerequisites
1. An authorized NovaPharm representative claims the business in https://chatgpt.com/merchants/ (or Business Hub).
2. Complete the owner/company identity check; confirm registered seller name, UK market, GBP currency, accepted feed type and product eligibility.
3. Only if OpenAI/Business Hub specifically confirms UK/GBP processing for this merchant, obtain written internal approval for the precise feed/upload channel.
4. Run:
   node scripts/build-nutraxin-openai-feed.mjs --check
5. After all three approval conditions are evidenced, export **offline**:
   OPENAI_BUSINESS_VERIFIED=yes OPENAI_GB_FEED_SUPPORTED=yes OPENAI_NUTRAXIN_UPLOAD_APPROVED=yes node scripts/build-nutraxin-openai-feed.mjs --export=/private/nutraxin-uk.tsv.gz
6. Inspect the exported compressed TSV and its 19 prices, identifiers, URLs and no-Ads/no-checkout flags, then upload through the approved Business Hub or SFTP process. This script never performs a network upload.
7. Record upload receipt, ingestion errors and actual ChatGPT listing status. A submitted feed does **not** guarantee display, ranking, recommendation, purchase or Ads placement. Set up a verified periodic snapshot only after the feed is accepted.

## AI and search best practices already present
The main branch's robots.txt permits OAI-SearchBot, Claude-SearchBot, PerplexityBot, Bingbot, Googlebot and Applebot on public pages. It separately blocks GPTBot and Google-Extended training; do not change that ownership decision.
Each of 19 canonical pages includes Product/Offer/Breadcrumb/WebPage structured data, price+shipping, GTIN, descriptive answers, clear UK delivery rules, and five crawlable category hubs. Do not introduce fake FAQ rich results, unsupported supplement health claims, synthesized reviews or keyword-stuffed AI-targeted pages. Google's official AI search guidance says conventional SEO and non-commodity, useful content remain fundamental, not special llms.txt hacks.
The Search Console generative-AI inclusion preference and *actual* URL Inspection status require an authorized Google Search Console account. GSC Wizard's subscription was unavailable on 27 November; Windsor Search Console supplies aggregate analytics but not per-URL inspection. Search Console UI is the free alternative. Bing submission is independent of Google indexing.

## Operational dashboards
Track each SKU's verified indexed URL status, Google-selected canonical, live source/price parity, Merchant free listing vs Shopping Ads eligibility and specific issue codes, organic GB clicks and impressions, AI referral sessions, verified GA4 paid orders, and contribution after marketing spending. Never claim first-place rankings, 'every AI chatbot', or 100% indexed without provider evidence.
