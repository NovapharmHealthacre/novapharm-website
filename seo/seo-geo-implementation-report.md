# SEO and GEO Implementation Report

Status: repository implementation passed; live Azure/search-console validation pending  
Last reviewed: 14 July 2026

## Implemented architecture

- 33 substantive indexable pages including six legal/responsibility pages and six long-form Insights articles;
- five leadership profiles with Vishal Chakravarty consistently titled `Chief Executive Officer`;
- unique titles/descriptions, apex canonicals, Open Graph/X metadata, one H1 and breadcrumbs;
- Organization/Corporation, WebSite, WebPage, ProfilePage, Person, Article, Service, FAQ and Breadcrumb schemas only where supported by real content;
- sitemap, robots, RSS and crawlable internal links;
- portals, administrator paths, private documents, previews, errors and redirect shells excluded from indexing;
- entity/status language distinguishes current, planned, in-development, target-market and subject-to-authorisation capabilities;
- no medical/patient promotion or unsupported product-availability schema.

## Entity model

NovaPharm Healthcare Ltd is connected to its verified legal/company details, logo, leadership, B2B pharmaceutical focus, capabilities, governance and articles. Vishal Chakravarty is connected to his leadership profile, organisation and approved authored content; `Founder and statutory director` remains a separate governance fact and does not replace `Chief Executive Officer`.

## AI/search crawler policy

Public canonical content is crawlable by legitimate search crawlers. Protected and preview routes are denied. The owner's stated GEO objective is implemented by explicitly allowing `OAI-SearchBot` on public routes while disallowing `GPTBot`; search visibility and model-training access are therefore treated separately. No AI citation or ranking is promised.

## Owner actions

Verify apex/`www` in Google Search Console and Bing Webmaster Tools after cutover, submit the sitemap, validate representative schemas, configure IndexNow with a protected key if approved, and monitor crawl/index coverage, branded queries, referrals and Core Web Vitals.
