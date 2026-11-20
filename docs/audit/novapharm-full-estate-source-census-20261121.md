# NovaPharm — full website, Portal, Intelligence, WMS and app source census

**Evidence date:** 21 November 2026. **Status:** Exact-head source inventory; no production release and no independent HIG certification.

The owner requested a source-to-live audit of **every page, module, product, workspace and app**, followed by implementation work that preserves the restored public release. The authoritative project register includes **12 app directories and five native project directories**. The new read-only generator `scripts/audit-entire-novapharm-application-estate.mjs` records each relevant source item in `artifacts/estate-audit/novapharm-full-source-census.json` and fails on missing/duplicate catalogues, unsuitable role classifications or unexpected release assumptions.

## Coverage of source records

| Record family | Expected entries | Verification boundary |
| --- | ---: | --- |
| App projects (Next.js UI and API/service packages) | 12 | Filesystem existence, not functioning production processes |
| Corporate registered pages | 32 | Page kind and route; *not* 32 confirmed live URLs |
| Canonical corporate news/insight articles | 6 | Imported source and metadata, not search-engine inclusion |
| Nutraxin consumer SKU records | 19 | Exact SKU/slug and approved source price pairing, not warehouse stock |
| ESCO catalogue references | 373 | 12 ranges, item identity and conservative unverified-stock flags; not 373 separate public product pages |
| Portal declared modules | 54 | Unique route, role mapping, visibility, protected release classification |
| Intelligence workspace definitions | 22 | Five source-labeled existing-read-only and 17 gated, not authorised live availability |
| WMS 16-workspace operating blueprint | 16 | Twelve map to registered employee routes; four remain integration-gated, none are 3PL-approved |\n| Native project directories | 5 | SwiftUI, SwiftPM, Android debug, Expo and StoreKit candidates, not signed production releases |
| **Total overlapping source records** | **539** | **Not a count of independently deployed features** |

Additional source assertions: 54 Portal modules split as customer 18, employee 13, executive/board 18 and admin 5; 48 navigation-visible and six dependency-hidden; five modules have controlled repository write implementation explicitly **not released**. WMS routes are part of protected employee/executive and Distribution workflows, not a verified separately deployed warehouse service. Marketplace aggregates **19 Nutraxin + 373 ESCO = 392 candidates**; the product list does not prove unified checkout, authorised saleability or actual stock.

## Source-to-live public route observations (separate audit)

The most recent verified read-only public-site workflow [run 44832437027](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44832437027) observed **62** URLs (61 indexable sitemap routes + the explicitly noindex research route); reported **0 URL failures**. All 61 indexable routes passed its limited server-rendered language/viewport/H1/skip-target checks, and all 19 Nutraxin product pages had a GTIN13/structured-data/visible-answer signal. It also showed missing HTML deployment-SHA metadata on **34/61** sampled indexable pages and **two distinct** observed SHAs on pages that do identify their publisher (26 corporate editorial pages on one SHA, ESCO on another). This split can be intentional in a multi-publisher deployment: investigate the actual release lineage rather than presume rollback.

A current **draft** [PR #1000](https://github.com/NovapharmHealthacre/novapharm-website/pull/1000) adds a read-only live-site route contract, including:
- All 19 Nutraxin product routes and critical public pages must remain in the final live sitemap.
- ESCO and Marketplace are generated **after** the original SEO pass; source sitemap absence is valid *before generation*, final live absence fails.
- Research, bag, protected Portal/employee/admin routes must never become indexable.
- Group live source-SHA drift by publishing family and distinguish missing metadata from source mismatch.

## Prioritised implementation and acceptance backlog

1. **P0 release integrity:** GitHub reports `main` and `gh-pages` unprotected, despite application and publisher safety tests; install rulesets with review/exact-head gates, preserve the reviewed publisher, test direct-push denial and forward-only deployment. #984 / #955.
2. **P0 protected environment:** current AWS read-only inventory identified private Portal ECS desired/running 0/0 in eu-north-1; 16 other enabled regions denied ECS list by organisation SCP. Obtain authorised existing-resource runtime and synthetic role/MFA test accounts before claiming live Portal/Intelligence/WMS acceptance. Keep additional infrastructure cost 0 GBP unless separately approved.
3. **P0 Contact/public operations:** live Contact audit still reported an email draft, not a verified secure enquiry endpoint. Do not overwrite the restored website with a static/public-only artifact when AWS-backed contact is activated; maintain held release #961 and actual run/signed release proof.
4. **P1 HIG accessibility:** source/CI checks are not a production WCAG certificate. Execute every applicable route and real user journey in Chromium/WebKit, keyboard, zoom, 320px reflow, status announcements, screen readers and appropriate device testing. Official sources: https://developer.apple.com/design/human-interface-guidelines/accessibility and https://www.w3.org/TR/WCAG22/.
5. **P1 Catalogues:** 19 Nutraxin source records and 373 ESCO supplier references must be reconciled to the real published listing and checkout/order-request access. Never infer SKU stock, price rights, clinical claims or ordering authority solely from a JSON row.
6. **P1 Native products:** the genuine SwiftUI iOS app is unsigned with a placeholder bundle identifier; the Android app is an offline debug research candidate. Require signed controlled device builds, real VoiceOver/TalkBack checks, approved identity/entitlement boundaries, then owner release signoff.

The new CI workflow checks **every source row**, publishes an inspectable JSON with source SHA-256 hashes, and deliberately leaves live-route, physical accessibility, reviewer and owner acceptance receipts as null. It neither changes production code nor publishes a new application.

**Completion boundary:** 172/172 Apple source reviews and 516/516 web/iOS/Android applicability assessments are registered, but **0/172 HIG topics** have independent full production acceptance. Source census completeness is not product or independent verification completion.

## Additional WMS blueprint coverage (21 November)

The standalone 16-workspace WMS navigation map is included in the executable census. Twelve workspaces point to existing employee routes; four intentionally have no module link (Waves & execution, Yard & delivery, AI planning studio, Labour & automation). The design controls are a review blueprint, not 16 activated WMS services, approved inventory, signed POD or physical warehouse stock. Full operational acceptance requires authorized 3PL reconciliation and role-bound receipts.
