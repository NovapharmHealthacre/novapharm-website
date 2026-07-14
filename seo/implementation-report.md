# NovaPharm SEO, GEO and Digital Authority Implementation

**Branch:** `seo/authority-knowledge-graph`  
**Implementation date:** 14 July 2026  
**Scope:** repository-controlled implementation of the 50-part SEO, GEO, AEO, entity-authority, Knowledge Panel readiness and digital-marketing brief.

## Executive result

This phase converts the website from a collection of individually valid SEO elements into one connected authority system. It establishes one persistent organisation entity, one persistent website entity, one canonical Person entity for each public leader, linked article authorship, explicit crawler policy, multi-sitemap discovery, IndexNow support, editorial standards, consent-aware attribution and repository tests that fail when those relationships drift.

The implementation does not promise rankings, AI citations, Google Discover inclusion or a Knowledge Panel. Those are external outcomes controlled by search systems and the quality and consistency of public evidence over time.

## Material changes

- Standardised the organisation identifier as `https://novapharmhealthcare.com/#organization`.
- Standardised the website identifier as `https://novapharmhealthcare.com/#website`.
- Connected leadership ProfilePage and Person entities to NovaPharm through stable `@id` relationships.
- Removed the registered residential address from amplified organisation schema. The Companies House reference remains the authoritative legal verification route.
- Added high-quality leadership portrait `ImageObject` relationships where approved images exist.
- Connected each Insights article to a canonical author, publisher, representative image, accurate dates, word count and reading time.
- Added visible editorial, source, update, correction, conflict and scope standards.
- Added explicit policies for Googlebot, Bingbot, OAI-SearchBot, GPTBot and Google-Extended.
- Added primary, Insights and image sitemaps generated from the content source of truth.
- Added a verified IndexNow key, safe dry-run client and explicit response-code handling.
- Added consent-aware UTM, referral and ChatGPT Search attribution without storing full form contents or private information.
- Added comprehensive automated SEO/entity/discovery/performance checks.

## Fifty-task implementation matrix

| # | Requirement | Repository implementation | External or ongoing dependency |
|---:|---|---|---|
| 1 | Strategic objective | Canonical entity graph, linked pages, audience journeys and authority reporting implemented. | Authority must compound through real independent evidence. |
| 2 | Official guidance | Primary-source register created from Google, IndexNow, OpenAI, web.dev and W3C guidance. | Review at least quarterly because crawler and rich-result guidance changes. |
| 3 | Non-negotiable principles | No doorway pages, hidden text, fake credentials, reviews, ratings, product availability or patient advice introduced. | Editorial approval remains required for new content. |
| 4 | Canonical entity architecture | Persistent Organization, WebSite and Person IDs defined centrally and validated. | External profiles should adopt the same names and official URLs. |
| 5 | NovaPharm organisation entity | Legal identity, company number, founder, logo, description and verified Companies House source connected. Residential address removed from amplified schema. | Owner should approve any future customer-facing office address before publication. |
| 6 | Vishal Person entity | Canonical public name, CEO title, founder relationship, approved portrait, worksFor, expertise and verified profiles linked. | Independent coverage cannot be manufactured. |
| 7 | Other leadership entities | Stable Person/ProfilePage IDs, roles, approved portraits and NovaPharm relationships implemented. | New sameAs links and biographies require verification. |
| 8 | Knowledge Panel readiness | Entity consistency, canonical sources and owner claim checklist documented. | Google decides whether a panel exists; claiming is owner-controlled. |
| 9 | Source consistency | Website source-of-truth matrix and correction checklist created. | LinkedIn, directories and other external profiles require owner/account access. |
| 10 | Google Business Profile eligibility | Eligibility guardrails documented; no virtual, residential or unstaffed location recommended. | Reassess only after a genuine eligible customer-facing or service-area operation exists. |
| 11 | Technical crawlability | Canonicals, indexability, HTML content, internal links, no private sitemap URLs and route consistency tested. | Search Console live crawl data becomes available after verification. |
| 12 | Robots and AI crawler policy | Search discovery allowed for Googlebot, Bingbot and OAI-SearchBot; training policy separated for GPTBot and Google-Extended. | Review when official user-agent guidance changes. |
| 13 | robots.txt and private content | Explicit private-route exclusions, noindex/authentication boundaries and sitemap references implemented. | robots.txt is not treated as access control. |
| 14 | XML sitemaps | Canonical page, Insights and image sitemaps generated automatically with meaningful last-modified dates. | Submit in Search Console and Bing Webmaster Tools. |
| 15 | IndexNow | Root key, safe client, dry-run mode, private-route rejection, batching and status handling implemented. | Live submission should run only for materially changed canonical URLs. |
| 16 | Search Console and Bing | Domain-property and Bing owner-action runbooks prepared. | DNS verification and platform access are owner-controlled. |
| 17 | Structured data system | Linked Organization, WebSite, WebPage, ProfilePage, Person, Article, BlogPosting, Breadcrumb and Service entities validated. | Rich results are not guaranteed. |
| 18 | Site name, logo and brand | Preferred name and official logo references retained; alternate legal name reconciled. | Correct inconsistent external listings. |
| 19 | Titles, descriptions and headings | Page metadata register generated; uniqueness, H1, canonical and indexability tested. | Review search snippets after enough impressions exist. |
| 20 | Internal linking | Orphan detection and contextual route map implemented; articles, capabilities and leadership are connected. | Continue adding relevant links as new content is published. |
| 21 | Content authority strategy | Eighteen evidence-led topic pillars mapped to NovaPharm’s actual operating model. | Expert input and primary sources required for publication. |
| 22 | Original content | Original-framework test and content brief standard documented. | Do not publish commodity drafts without expert value. |
| 23 | GEO/AI-answer readiness | Executive summaries, clear headings, tables, authors, dates, citations, accessible HTML and stable entities specified. | AI citation remains an external decision. |
| 24 | Editorial trust/YMYL | Visible editorial standards and article trust notices implemented. | Qualified technical review must be real and recorded. |
| 25 | Sources and citations | Primary-source hierarchy, source register and link-maintenance standard documented. | Periodic source-link review required. |
| 26 | Article/author schema | Canonical author/publisher/image/date/section/word-count relationships implemented. | New authors require canonical profiles or a verified author policy. |
| 27 | Image SEO | Dimensions, alt text, stable direct URLs, image sitemap and portrait entity links validated. | Maintain licence/provenance register for new media. |
| 28 | Video SEO | Video eligibility and metadata standard documented; no fake VideoObject added without a qualifying video. | Apply after the visual phase chooses a final homepage video. |
| 29 | Core Web Vitals | Budgets and LCP/INP/CLS targets encoded; initial public JS/CSS budget checked. | Field data requires real traffic and Search Console/CrUX. |
| 30 | Audience strategy | Ten B2B audiences mapped to needs, page, CTA and regulatory sensitivity. | Sales follow-up workflows remain operational decisions. |
| 31 | Conversion journeys | Contextual journeys and CTA IDs implemented; source page and referral attribution prepared. | Live server-side CRM mapping follows backend activation. |
| 32 | Lead magnets | Nine authority-asset concepts, page pattern and quality gate documented. | Publish only after substantive owner/expert approval. |
| 33 | LinkedIn thought leadership | Executive/company post pattern, UTM convention and article distribution sequence documented. | No social post is published automatically. |
| 34 | Digital PR | Ethical publication and association targeting framework created; prohibited tactics recorded. | Outreach requires owner approval. |
| 35 | Backlink/mention audit | Classification and reclamation process documented; current branded search produced no reliable indexed result in the available search audit. | Repeat after Search Console verification and index growth. |
| 36 | International SEO | UK English remains canonical; no thin country pages or false hreflang variants created. | Add regional/language pages only with distinct verified content. |
| 37 | Social/share metadata | Secure OG image, Twitter image alt, canonical/social metadata completeness tests implemented. | Page-specific social artwork can expand with visual phase assets. |
| 38 | Analytics/attribution/privacy | Consent-aware session attribution, ChatGPT referral recognition and CTA event interface implemented. | Select and configure an approved analytics provider after privacy review. |
| 39 | SEO authority dashboard | Metric specification and empty-state reporting model documented. | Requires Search Console, Bing and analytics data connections. |
| 40 | Content calendar | Detailed 90-day calendar and 12-month roadmap prepared. | Owner assigns authors/reviewers and publication dates. |
| 41 | Recommended themes | Sixteen themes assessed and sequenced around commercial/regulatory value. | Full drafts require expert source review. |
| 42 | Repository SEO testing | Automated entity, metadata, crawl, sitemap, social, article, image, IndexNow, private-route and performance tests added. | CI must remain required for future PRs. |
| 43 | Search rendering validation | Raw/rendered/mobile/JS-independent validation plan and automated HTML checks implemented. | Google Rich Results Test and live URL Inspection are owner/browser actions. |
| 44 | Competitive benchmark | Category benchmark criteria documented without copying competitor content or layout. | Refresh annually or after major redesign. |
| 45 | Paid media | No spend launched; future B2B channel framework and approval gates documented. | Separate campaign, legal and budget approval required. |
| 46 | Owner-controlled actions | One consolidated owner guide created for DNS, tools, external profiles, analytics and panel claiming. | Owner completes external authentication and verification. |
| 47 | Implementation order | Repository audit, entity correction, discovery assets, content strategy, tests, materialisation and PR workflow followed. | PR remains unmerged pending owner review. |
| 48 | Required deliverables | Technical, entity, content, PR, attribution and owner guides are committed or generated by the build. | Live platform evidence is added after external verification. |
| 49 | Completion standard | Repository-controlled completion is enforced by CI; private pages remain excluded and claims remain conservative. | Rankings, panels and field metrics cannot be declared complete. |
| 50 | Strategic standard | NovaPharm and Vishal are represented through consistent, scrutinised, evidence-led entities rather than manufactured authority. | Continue publishing original, useful, verified work. |

## Branded-search baseline

Queries assessed included NovaPharm Healthcare, NOVAPHARM HEALTHCARE LTD, the domain, Vishal Chakravarty and combinations with NovaPharm/pharmaceutical. The available public search audit returned no reliable indexed result set. This is a baseline, not proof that Google or Bing has indexed nothing. Search Console and Bing Webmaster verification are needed for authoritative coverage and query data.

## Claims and privacy controls

- NovaPharm remains described as pre-operational for regulated wholesale supply.
- No WDA(H), PLPI, NHS-supply, product-availability, warehouse-ownership or manufacturing-ownership claim was introduced.
- No private portal URL is submitted in sitemaps or IndexNow.
- No full form contents, passwords, documents or patient information are captured in analytics.
- The registered address remains available through Companies House but is not amplified as a customer-facing location in the organisation entity.

## Completion interpretation

**Repository-controlled SEO/GEO phase:** implemented and testable on the review branch.  
**External authority phase:** pending owner-controlled verification, indexing, profile consistency, legitimate third-party coverage and ongoing publication.
