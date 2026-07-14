# Analytics, Attribution and Digital Authority Dashboard Specification

## Measurement principles

1. Measure qualified B2B outcomes, not vanity traffic alone.
2. Do not activate optional analytics before valid consent where required.
3. Never send passwords, full form messages, uploaded documents, portal records, customer records, patient information or adverse-event information to an analytics provider.
4. Search Console and Bing data remain their own source of truth for search performance.
5. Empty or unavailable metrics remain empty; no historical data is invented.

## Consent-aware attribution already prepared

The public site now recognises:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- referring host
- first landing path
- source CTA
- ChatGPT Search referrals through `utm_source=chatgpt.com` or a ChatGPT referrer

Attribution is stored in session storage only after analytics consent. The site emits a neutral `novapharm:marketing-event` interface so an approved provider can subscribe later without embedding the provider into core forms.

## Approved event vocabulary

| Event | Trigger | Allowed parameters | Prohibited data |
|---|---|---|---|
| `cta_click` | user activates a marked public CTA | CTA ID, source path, destination path, source class | visible form content or personal data |
| `qualified_contact_submit` | secure API confirms contact submission | enquiry type, source page, CTA, campaign classification | name, email, phone, company, message |
| `account_application_start` | user begins the business application | source page, campaign, customer-type category | company identifiers or responsible-person data |
| `account_application_submit` | secure API confirms application | application reference hash/category, source classification | application body, documents, bank or licence data |
| `authority_asset_download` | approved public asset download | asset ID, source page, campaign | user identity unless separately consented |
| `article_engagement` | meaningful article engagement threshold | article slug, section, engagement band | text selection or personal behaviour profile |
| `portal_signin_start` | user initiates secure sign-in | portal area, source page | username or identity token |
| `portal_signin_success` | backend confirms authorised session | portal area, identity-provider class | name, email, token, roles beyond necessary aggregate |

## Search and authority dashboard

### Discovery

- indexed canonical URLs;
- excluded URLs and reasons;
- crawl errors;
- sitemap status;
- security issues and manual actions;
- rich-result and structured-data eligibility;
- Core Web Vitals by template/device.

### Search demand

- branded impressions/clicks for NovaPharm and Vishal variants;
- non-branded impressions/clicks by topic pillar;
- top canonical pages and queries;
- country and device;
- query-to-page mismatch;
- new query themes requiring content improvement rather than keyword pages.

### Authority

- authoritative referring domains;
- linked and unlinked brand mentions;
- verified partner references;
- cited NovaPharm frameworks;
- discovered Google AI Overview/AI Mode, Bing/Copilot or ChatGPT citations recorded as observations;
- Knowledge Panel presence and claimed status;
- external profile consistency issues.

### Qualified outcomes

- qualified organic enquiries;
- conversion rate by landing page and audience journey;
- product opportunity, supply partner, CMO/CDMO, regulatory, pharmacy/wholesaler and strategic enquiry categories;
- article-assisted enquiries;
- authority-asset engagement;
- LinkedIn-to-site qualified visits and conversions;
- ChatGPT referral sessions and qualified conversions.

## Source hierarchy

1. Google Search Console for Google search clicks, impressions and indexing.
2. Bing Webmaster Tools for Bing search, crawl and IndexNow reporting.
3. Approved privacy-compliant analytics for consented public-site behaviour.
4. Canonical application database for confirmed forms and accounts.
5. Manually verified authority/mention register for third-party coverage and AI citations.

Never merge sources in a way that exposes personal data or makes approximate attribution appear deterministic.

## UTM governance

Use lowercase, hyphenated values:

- `utm_source`: platform/publisher, e.g. `linkedin`, `industry-publication`, `chatgpt.com`.
- `utm_medium`: `organic-social`, `referral`, `email`, `paid-social`, `paid-search`.
- `utm_campaign`: `<pillar>-<year>-q<quarter>`.
- `utm_content`: `<asset-or-article>-<format-or-speaker>`.
- `utm_term`: only where a paid-search term is genuinely required.

Do not include names, email addresses, companies or confidential deal identifiers in UTMs.

## Access and retention

- Search Console/Bing: least-privilege users and quarterly access review.
- Analytics: owner/admin access restricted; retention set to the minimum justified period.
- Raw event exports: no automatic long-term retention without an approved business need.
- Form source fields: stored only where necessary to assess marketing effectiveness and deleted under the applicable retention schedule.

## Launch acceptance

Before connecting a provider:

1. Cookie notice identifies the provider and purpose.
2. No request is made before analytics consent.
3. Reject and withdrawal stop new optional collection.
4. Debug tools show no personal/form/private data.
5. Events deduplicate correctly.
6. Search Console/Bing remain separately reported.
7. Dashboard contains empty states rather than sample numbers.
