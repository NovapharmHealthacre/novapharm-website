# NovaPharm search and measurement activation | 9 November 2026

## Verified owner evidence

- **Google Search Console:** the owner supplied an authenticated screenshot of the `novapharmhealthcare.com` property. Its Overview displays **58 web search clicks** in the displayed chart period, **1 indexed** and **6 not indexed** pages. These figures are snapshots, not an assurance that the 57 current canonical URLs are indexed.
- **Old sitemap entry:** the screenshot of `https://www.novapharmhealthcare.com/sitemap.xml` shows *successfully processed*, last read **17 January 2026**, and **1 discovered page**. It is not evidence that Google's crawler has read the new non-www sitemap; do not treat that report as a current canonical-site submission.
- **Bing Webmaster:** the authenticated import-confirmation screenshot shows two successful imported sites: `https://novapharmhealthcare.com/` and `https://vishal.novapharmhealthcare.com/`. The prior import selection showed **zero sitemaps**. Ownership import is done; current canonical sitemap submission is not confirmed.
- **Google Analytics 4:** the owner provided the NovaPharm Healthcare property screen with public measurement ID **`G-897L1VS8BX`**. Its Home panel says **no data received**. Creating this property did not attach it to the published website.
- **Repository XML source:** `sitemap.xml` contains 57 canonical non-www page locations and `sitemap-insights.xml` contains 6 articles, while the image sitemap has a separate index. Counts may change with verified content additions.

## Submit the *canonical, current* sitemaps

In the verified **novapharmhealthcare.com** domain property (not the founder portfolio), open Search Console → Indexing → Sitemaps and submit each exact URL below:

1. `https://novapharmhealthcare.com/sitemap.xml`
2. `https://novapharmhealthcare.com/sitemap-insights.xml`
3. `https://novapharmhealthcare.com/sitemap-images.xml`

Confirm Google records **Success** and a recent *Last read* date. Avoid reusing the old **www** report with only one page. Do not claim 57 pages are indexed merely because a sitemap is accepted. Use URL Inspection and Page indexing reports to investigate canonicalisation, redirect, noindex and coverage exclusions; request indexing for a small number of highest-priority public URLs if needed.

Then open Bing Webmaster Tools for `https://novapharmhealthcare.com/` → Sitemaps → Submit sitemap; add the same three canonical URLs. The successful GSC import is already confirmed, so do not add a duplicate site. IndexNow's 9 November HTTP **202** acknowledges receipt of two changed public URLs, not final crawler validation or indexation.

## GA4 technical preparation and remaining activation control

The public GA4 ID `G-897L1VS8BX` is registered in the source as a non-secret. However, the site generator refuses to publish a tag unless `PUBLIC_ANALYTICS_PRIVACY_APPROVED=true` is set by an approved release, regardless of the ID. This owner-confirmed property is necessary but is **not** proof of a UK privacy/transfer review, consent approval or collected traffic.

Before setting that flag, the owner and privacy lead must document approval of the updated privacy/cookie notices, Google data-processing terms and any international transfers. In Analytics → Admin → Data collection and modification → Data retention, verify and record the user/event-data retention (prefer **2 months** if adequate); disable Google Signals/advertising personalisation and unnecessary Enhanced Measurement, including potentially sensitive form interactions. No Google Ads or paid service is required.

Deployment checks:
- With no visitor choice or **Reject non-essential**, there is no Google tag request, `_ga` cookie or GA measurement event.
- Only after explicit **Analytics** consent on an allowed public route does the browser fetch `gtag/js?id=G-897L1VS8BX`. Basic consent mode defaults advertising to denied and explicitly grants analytics storage after opt-in.
- After Cookie settings → withdraw, additional measurement stops and GA cookies are expired; a subsequent new affirmative consent can re-enable analytics.
- Never track portal, customer accounts, customer contact forms, checkout confirmation, medical questions, personal identifiers, SKU-level purchase data or URL query strings.
- Test opt-in page_view for the three brands in **GA4 Realtime/DebugView** with a controlled visit; don't assume a zero-view Home panel means an error if no one has consented.
- Record the exact protected publishing workflow SHA and live-domain/browser evidence before calling GA4 production live.

This task is **£0 paid media**. The pending external account actions require authenticated control in the Google/Bing interfaces, not GitHub code or a paid connector.
