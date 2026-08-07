# Search Platform and Crawler Activation Register

Status: code-level eligibility implemented; live activation not complete
Review date: 1 August 2026

## Eligibility versus activation

| Capability | Repository eligibility | Live activation / evidence | Final status |
|---|---|---|---|
| Three-site metadata/canonicals | Implemented and tested in each application | Recheck final production HTML after cutover | Complete at repository level only |
| Connected entity graph | Shared IDs and cross-application tests implemented | Validate rendered production schema and external corroboration | Complete at repository level only |
| Sitemap/RSS | Generated from canonical route/content sources | Submit and monitor after verified ownership/cutover | Complete at repository level only |
| Public crawler policy | Googlebot, Bingbot and OAI-SearchBot allowed; private routes excluded | Verify production `robots.txt` and access logs | Complete at repository level only |
| Training crawler policy | GPTBot and Google-Extended disallowed by current owner policy | Recheck official agents and production response | Complete at repository level only |
| WAF crawler verification | Test plan documented | Requires deployed Front Door logs plus forward/reverse-DNS/IP verification under current crawler guidance | External verification pending |
| Google Search Console | Domain-property guide prepared | Owner DNS verification, users, sitemap and URL Inspection pending | Owner-controlled blocker |
| Bing Webmaster Tools | Verification/import guide prepared | Owner verification, sitemap and reporting pending | Owner-controlled blocker |
| IndexNow | Public key, dry-run client, batching/private-path rejection and status handling implemented | Production submission of materially changed URLs pending | Owner-controlled blocker |
| Search dashboard | KPI/source specification implemented with empty states | Requires Search Console, Bing and consent-approved analytics data | External verification pending |
| Log analysis | Query/field requirements defined; Front Door/App Insights logs declared | Requires deployed telemetry and privacy review | External verification pending |
| AI citation benchmark | Report structure exists; no result invented | Manual repeatable Google/Bing/ChatGPT observations after indexing | External verification pending |
| Content refresh | Ownership and schedule documented | Operational calendar owner assignment pending | Complete at repository level only |
| Production crawler testing | Automated local artifact checks exist | Live fetch/render/log validation after DNS cutover | External verification pending |

## Crawler policy matrix

| Crawler | Public Corporate/NIT/Founder | Portal/API/private | Purpose/decision |
|---|---|---|---|
| Googlebot | Allow | Authentication/noindex; never rely on robots for security | Google Search and eligible AI search features |
| Bingbot | Allow | Authentication/noindex | Bing/Microsoft search |
| OAI-SearchBot | Allow | Authentication/noindex | ChatGPT Search discovery eligibility |
| GPTBot | Disallow | Disallow/protect | Model training is a separate owner decision |
| Google-Extended | Disallow | Disallow/protect | Separate model-use control; does not block ordinary Googlebot |
| Unknown/unverified bot | WAF/app policy and rate limits | Deny private access | No trust from user-agent text alone |

Before allowing a purported bot through tuned WAF controls, verify its current official documentation and IP/DNS mechanism. Never weaken portal or API authorisation for a crawler.

## Production verification procedure

1. Fetch `robots.txt`, all declared sitemaps and feeds from each final hostname.
2. Confirm portal/API/status headers and private-route authentication/noindex.
3. Inspect raw and rendered canonical HTML, one organisation page, one profile and one article.
4. Confirm WAF allows verified search crawlers to public routes and retains normal rate/managed-rule protection.
5. Inspect access logs without storing query/personal/confidential payloads.
6. Run Search Console and Bing URL inspection on representative URLs.
7. Submit only canonical, materially changed URLs through IndexNow.
8. Record indexing/citation observations as platform outcomes, never guarantees.

## Owner activation guides

Use `seo/owner-action-guide.md` for exact Search Console, Bing and IndexNow steps. Verification values belong in the platform/DNS process and must not be committed as secrets. The IndexNow verification key is public by protocol and must remain isolated from all credentials.

## Measurement

The dashboard specification is `seo/analytics-attribution-specification.md`. It separates Search Console, Bing, consented public analytics, application conversions and manually verified citations. Portal data, passwords, form bodies, uploaded files and board activity are excluded.
