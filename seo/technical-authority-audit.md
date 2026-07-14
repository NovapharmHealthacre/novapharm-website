# Technical SEO, Entity and Knowledge Panel Readiness Audit

## Baseline

The merged site already had substantive page titles, canonical URLs, one H1 per public page, structured data, a sitemap, RSS, conservative claims and protected portal shells. The authority weaknesses were structural rather than cosmetic.

### Material baseline gaps

1. The organisation identifier used `#organisation` while the approved authority brief specified `#organization`.
2. A full Organization record, including the registered residential address, was repeated on every public page.
3. Leadership pages had Person data but portraits were plain URLs rather than fully connected image entities.
4. Article authorship, publisher, page and person relationships were not centrally governed.
5. One sitemap served all discovery needs; no dedicated Insights or image sitemap existed.
6. robots.txt had no explicit OAI-SearchBot policy and did not distinguish search discovery from model-training access.
7. No IndexNow key, safe client or change-submission process existed.
8. Editorial, correction, source and update standards were not consolidated visibly for users and crawlers.
9. Search/referral/CTA attribution had no privacy-controlled interface.
10. Existing tests did not fail on entity-ID drift, author linkage, crawler-policy drift, orphaning or IndexNow errors.

## Implemented authority model

### Organisation

- **Name:** NovaPharm Healthcare
- **Legal name:** NOVAPHARM HEALTHCARE LTD
- **Company number:** 16716501
- **Canonical URL:** `https://novapharmhealthcare.com/`
- **Entity ID:** `https://novapharmhealthcare.com/#organization`
- **Verification:** Companies House and canonical website
- **Founder:** Vishal Chakravarty Person entity
- **Address policy:** do not amplify the registered flat as a customer-facing business location; retain Companies House as the legal verification source.

### Website

- **Name:** NovaPharm Healthcare
- **Entity ID:** `https://novapharmhealthcare.com/#website`
- **Publisher:** NovaPharm organisation entity
- **Language:** en-GB

### Leadership

Every canonical profile uses:

- `ProfilePage` as the page entity;
- one stable `Person` `@id`;
- visible verified role and biography;
- `worksFor` and `affiliation` to NovaPharm;
- approved direct portrait URL as `ImageObject` where available;
- verified `sameAs` references only;
- `mainEntityOfPage` back to the canonical profile.

### Insights

Every article uses:

- `Article` and `BlogPosting` types;
- one canonical author Person;
- NovaPharm as publisher;
- accurate visible and schema dates;
- representative image;
- word count and reading time;
- article section and keywords;
- visible editorial trust statement and source/correction policy link.

## Crawl and index architecture

### Canonical public discovery

- Apex HTTPS domain is canonical.
- Public pages are self-canonical.
- UK English and x-default alternates point to the same canonical page because no genuine translated/regional equivalent exists.
- Core content remains in HTML and is not dependent on interaction.
- Internal-link validation detects orphaned canonical pages.

### Private boundary

The following remain outside discovery and are protected by access controls/noindex as applicable:

- `/portal/`
- `/employee/`
- `/admin/`
- `/entra-complete/`
- `/_secure/`
- `/docs/`
- `/api/`
- root `NP_` modules

robots.txt is not treated as security. The Node server and protected build remain the enforcement layer.

### Crawler decision

| Crawler | Public corporate content | Private content | Decision |
|---|---:|---:|---|
| Googlebot | allowed | blocked/protected | Search and Google AI feature eligibility |
| Bingbot | allowed | blocked/protected | Bing and Microsoft search discovery |
| OAI-SearchBot | allowed | blocked/protected | ChatGPT Search discovery/citation eligibility |
| GPTBot | disallowed | disallowed | Separate model-training policy; not required for ChatGPT Search |
| Google-Extended | disallowed | disallowed | Separate model-use decision; normal Google Search crawling remains allowed |

## Sitemap architecture

- `sitemap.xml`: canonical public pages only.
- `sitemap-insights.xml`: canonical long-form article URLs and material dates.
- `sitemap-images.xml`: discoverable, licensed public images tied to canonical pages.
- Portal, employee, admin, API, private and redirect URLs are excluded.
- `lastmod` changes only for meaningful content/release changes; article dates come from article source data.

## IndexNow

- Root key file: `/da125ceca8032e01fc98782c388f894f.txt`
- Key location and host are generated centrally.
- Dry-run is the default.
- Live submission accepts only apex HTTPS URLs and rejects private paths.
- Explicit handling exists for 200, 202, 400, 403, 422 and 429.
- Google recrawl remains a separate Search Console process.

## Knowledge Panel readiness

### NovaPharm Healthcare

Readiness signals now include a stable organisation ID, legal identity, company number, logo, canonical page, founder relationship and Companies House corroboration. The site avoids false LocalBusiness/pharmacy schema and does not amplify an ineligible virtual/residential location.

### Vishal Chakravarty

Readiness signals include a canonical public name, CEO title, founder relationship, approved portrait, NovaPharm relationship, personal site, LinkedIn and Companies House officer record. The public title remains **Chief Executive Officer**; founder is represented separately.

### Baseline observation

The available branded-search audit for NovaPharm and Vishal produced no reliable result set. This is not a definitive Google/Bing index report. Authoritative visibility data requires domain verification in Google Search Console and Bing Webmaster Tools.

### What is not implemented

- No Knowledge Panel claim because no panel can be assumed and Google authentication is owner-controlled.
- No Wikipedia or Wikidata entry because notability and independent editorial standards cannot be manufactured.
- No Google Business Profile because current location eligibility is unverified and a registered flat/virtual office is not an SEO shortcut.
- No fake reviews, ratings, awards, press coverage or directory citations.

## Metadata and social signals

The generated page register records title, description, H1, canonical, indexability, schema types and contextual CTAs. Tests enforce uniqueness and complete social image metadata. Page-specific images remain where the current page configuration provides them; the approved corporate logo remains the fallback.

## Rendering and validation plan

Automated checks cover raw generated HTML, schema JSON parsing, canonical relationships, image alt/dimensions, crawl policy, sitemaps, private-route exclusion, internal links, article trust and performance budgets. The PR workflow additionally runs the existing full repository checks and Chromium/WebKit acceptance.

Live owner/browser checks after merge:

- Schema.org Validator;
- Google Rich Results Test for eligible types;
- Search Console URL Inspection and rendered HTML;
- Bing URL Inspection/crawl tools;
- mobile rendering and social-card previews;
- field Core Web Vitals after sufficient traffic.

## Risks and controls

| Risk | Control |
|---|---|
| Entity duplication | central IDs and automated `#organisation` rejection |
| Address misrepresentation | address excluded from amplified organisation schema |
| Fake freshness | article dates come from content data; cosmetic builds do not update them |
| Portal leakage | noindex/authentication/private-route sitemap and IndexNow rejection |
| Keyword/AI-page spam | no mass pages; content authority requires original framework and expert review |
| Tracking before consent | attribution storage/events activate only after analytics consent |
| Video/visual performance | explicit budgets and no VideoObject without a qualifying visible video |
| Unsupported pharmaceutical claims | existing public-claims audit remains in the release check |
