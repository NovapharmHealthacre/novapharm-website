# Crawl, Sitemap and IndexNow Implementation Report

## Canonical crawl model

Public corporate and Insights content is available to Googlebot, Bingbot and OAI-SearchBot. Private application areas remain protected and excluded from discovery. Search discovery and model-training access are separate policy decisions.

### Explicitly public

- corporate pages;
- services, regulatory, product, partner and technology pages;
- leadership hub and approved profiles;
- Insights hub and approved articles;
- legal, privacy, cookie and accessibility information;
- contact and business account information intended for public discovery.

### Excluded/protected

- customer, employee, board and administrator portals;
- authentication completion routes;
- secure modules and controlled documents;
- APIs and uploaded documents;
- preview/staging environments;
- internal files and application data.

robots.txt is a discovery instruction, not an access control. Server-side authentication and the protected build remain responsible for confidentiality.

## Sitemap architecture

| File | Purpose | Inclusion rule |
|---|---|---|
| `sitemap.xml` | canonical public pages | public, indexable, 200-equivalent canonical routes only |
| `sitemap-insights.xml` | long-form Insights | canonical published articles with meaningful publish/modified dates |
| `sitemap-images.xml` | public image discovery | licensed public images attached to canonical pages |

The build generates each sitemap from the repository source of truth. Redirects, noindex pages, portals, APIs and private documents are excluded. Article `lastmod` values come from article data; cosmetic builds do not manufacture freshness.

## IndexNow

- Verification key is hosted at the public root.
- The key location, host and key are generated centrally.
- Dry-run is the default command.
- Live submission requires `--submit`.
- Only apex HTTPS URLs are accepted.
- Private application routes are rejected before any request.
- Canonical URL lists are deduplicated and capped at the protocol batch limit.
- Status handling is explicit for 200, 202, 400, 403, 422 and 429.

IndexNow should be used only for URLs that were created, materially updated, redirected or removed. It is not a reason to resubmit unchanged pages. Google recrawl requests remain a separate Search Console action.

## Search Console and Bing

After an approved merge, the owner should verify a domain property in Google Search Console and verify or import the site in Bing Webmaster Tools. Submit all three sitemaps, inspect representative URLs and retain a dated baseline for indexing, queries, pages, countries, devices, Core Web Vitals and crawl/security reports.

## Validation

Automated release checks verify:

- self-canonical apex URLs;
- one indexability decision per public page;
- no private URL in sitemaps;
- explicit crawler policy;
- root IndexNow key integrity;
- no orphaned canonical public pages;
- schema and publisher/author relationships;
- generated file reproducibility;
- no unsupported public regulatory claims.

## Non-guarantee

A technically valid sitemap, crawler rule or submission request does not guarantee crawling, indexing, ranking, rich results, AI citations or a Knowledge Panel.
