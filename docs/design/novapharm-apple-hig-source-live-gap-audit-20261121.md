# NovaPharm Apple HIG — source-to-live gap audit

**Observed:** 21 November 2026  
**Scope:** Corporate public web and Products; protected Portal, Intelligence, Distribution/WMS; design system and native candidates; connected AWS, MongoDB Atlas, Floot, Microsoft SharePoint, GSC Wizard.  
**Release status:** Evidence and remediation register only. **Not** Apple endorsement, complete WCAG verification, a regulatory approval, or a production deployment instruction.

## Evidence and quality rules

- Base source of truth: `main` at inspection commit `d86e74fae3b121061e4e8eb0480d8d825bf31ec8`; public Pages branch `gh-pages` at `53d6106ddb0e17ef5d80577014b4daa4a41e7066`. These are different branches and neither implies source-to-live parity. Re-read exact heads before action.
- Apple source references read: official primary Markdown design principles, branding, color, typography, materials, accessibility and generative AI; the prior 172-topic register retains article-level review notes. This inspection did **not** independently retest all 172 original Apple URLs, all file attachments or every deployed route.
- Existing `docs/design/apple-hig-172-topic-acceptance-register.json`: 172 reviewed topic entries across six sections, all 172 `implementation: not_verified` at this checkpoint; 516 recorded web/iOS/Android applicability decisions; 28 all-platform N/A candidates in an unapproved review packet. Do **not** treat N/A candidates or reviewed guides as accepted implementation.
- `docs/design/apple-hig-runtime-source-scope-20261120.json`: 32 corporate page definitions, 19 Nutraxin products, 54 portal modules (48 visible / 6 dependency-hidden), 22 Intelligence workspaces (5 source-labeled read-only / 17 gated), 27 Next source page files including catch-all renderers. These are **source counts**, not 132 independently operational URLs.
- Source imports share the HIG color, layout, material, motion and RTL styles in the Next.js corporate and portal applications; design-system and accessibility packages and scoped GitHub CI exist. Test evidence must be matched to the exact deployed origin and revision, not inferred from imports.

## Subsequent production reconciliation — 21 November 2026

- Independent anonymous retrieval now finds a live B2B form on `https://novapharmhealthcare.com/contact/`, whereas the earlier 20 November capture showed the email-draft fallback. The earlier observation remains dated history, **not the current release state**.
- GitHub reports [#961](https://github.com/NovapharmHealthacre/novapharm-website/pull/961) merged into `gh-pages` on 20 Nov at 22:46:50 UTC, with **no recorded GitHub review submissions**, while its PR body still carries a DO NOT MERGE release-hold warning. This does not establish whether the owner separately approved the merge.
- Read-only AWS `GetApi`, `GetRoutes` and `GetStages` confirm the published Contact HTTP API `h4dc1e4u57` has execute endpoint enabled, `$default` auto-deployed stage and unauthenticated `POST /contact` routing; CORS permits the two designated public domains. No actual enquiry was submitted and no durable persistence/notifications/abuse protection was tested in this audit.
- Public homepage/Products navigation differs from Contact markup. Investigate desired template-family parity before editing the restored live site. Track independent release acceptance in [#955](https://github.com/NovapharmHealthacre/novapharm-website/issues/955); preserve owner `productionSignoff: not_granted` and [#984](https://github.com/NovapharmHealthacre/novapharm-website/issues/984) branch-protection blocker.

## Directly observed public pages

| Surface | Observation | Acceptance boundary |
| --- | --- | --- |
| `https://novapharmhealthcare.com/` | Public homepage serves NovaPharm editorial layout and current regulatory disclaimers. | Accessibility, actual source SHA, full route/device matrix and backend journeys not accepted. |
| `/products/` | Public overview links Nutraxin, ESCO, strategic portfolio and a unified 392-product search. | Catalogue link presence is not checkout/order proof. |
| `/products/nutraxin/` | Public collection presents 19 Nutraxin references and shopping entry. | Product rights, stock, purchase/payment, indexed coverage and end-to-end receipt unverified. |
| `/products/esco/` | Public catalogue presents 373 references across 12 ranges. | Per-model eligibility, exact prices, bag, confirmation, delivery and receipt unverified. |
| `/contact/` | **Updated 21 Nov:** public HTML now presents a secure B2B enquiry form, with client JS requiring HTTP 201, `persisted: true` and receipt UUID before success. PR #961 was merged into `gh-pages`. | AWS API route/stage existence is verified read-only, but no actual safe synthetic POST, durable inbox read-back, notification failure, full assistive-technology or independent release approval is evidenced. The original mail-draft observation was historical and is superseded. |
| `/technology/` | Live public research/editorial information, medicine search entry and invitations to protected Intelligence. | Demo visuals and official-source links are not validated protected analytics. |
| `https://portal.novapharmhealthcare.com/`, `https://intelligence.novapharmhealthcare.com/` | The independent public web retrieval used in this checkpoint did not resolve these origins. | **Inconclusive availability**, not evidence of outage or successful authentication. Require trusted browser, MFA/role test accounts and deployment receipt. |

## Connected-service observations (read-only)

| Service | Verified observation | Risk / next evidence |
| --- | --- | --- |
| GitHub | Both `main` and `gh-pages` report `protected: false` in branch metadata; existing P0 issue #984 records missing effective branch rules. At the original source inspection, 16 PRs were open. Subsequent GitHub read-back confirms Contact PR #961 merged, with zero recorded review submissions; #991 remains draft. Treat these as distinct dated observations. | P0 configure tested branch rules, exact-head status requirements, reviewed publishing actor and no-force-push; verify no unintended publisher breakage. |
| AWS (eu-north-1 and relevant global read APIs) | 20 Lambda functions, 42 CloudFormation stacks, two ECS clusters, 10 HTTP APIs, five Cognito user pools, nine S3 buckets, two Glue databases and two Athena workgroups. No CloudFront distributions or Route53 hosted zones returned under the connected account. | Resource presence does not establish real sessions, permitted regulated features, content validity, customer orders, or deployment of Pages. Do not infer any resources outside accessible scope are absent. |
| AWS ECS | Production-named Intelligence ECS cluster contains zero services. Staging portal ECS service is ACTIVE but desired/running/pending = 0/0/0. No load balancers returned under the connected eu-north-1 account. | No working ECS protected web runtime evidenced. Separate hosting arrangements have not been ruled out. Do not scale services or incur spend without approval. |
| MongoDB Atlas | Two AWS eu-north-1 clusters, production-labelled `npi-bootstrap` and `novapharm-staging`, are IDLE, not paused, and Free-tier. | Cluster health is not query correctness, least privilege, private networking, backups, workload readiness or integration proof. No data rows or secrets inspected. |
| Floot | Project `NovaPharm Discoverability Intelligence` exists but publish status is `published: false`; no custom domains attached. | It is not evidence of the public NovaPharm website or any production service. |
| GSC Wizard | Connected analytics call refused with `payment_required` (trial ended or no active subscription). | Google Search Console and indexing-performance measurements **not checked** here; do not claim current impressions, indexing or search position. |
| SharePoint | Engineering verification records accessible. 20 November evidence describes broad inherited Member write / Visitor read and unresolved Board-only effective access (issue #898). | Permission claims are from the dated record, not re-certified today; keep sensitive content out of this engineering folder until permissions are independently reviewed and corrected. |

## Apple-informed adaptation contract

1. **Distinctive NovaPharm identity:** light-first white and off-white, graphite type, semantically named neutrals, restrained institutional red. Preserve approved marks, product imagery and authoritative clinical/regulatory claims. Apple HIG is a design-quality reference, not a licence to copy Apple's logos, SF Symbols artwork or proprietary public-web fonts.
2. **Navigation and hierarchy:** simple universal navigation, predictable sticky/header behaviour, 12/8/4-column layouts where useful, logical responsive gutters, one visible main landmark and correct headings. Audit full menus, overlays, modal focus, RTL and 320px/390px/768px/1440px viewports.
3. **Typography:** legible system/font-license-safe roles, carefully controlled reading measure and line height, tabular numbers, truncation alternatives and zoom/reflow at 200% and 400%. No forced user zoom restrictions.
4. **Interaction:** real button states, focus-visible, keyboard and touch target sizing, loading/empty/error/status states, dismiss/undo recovery, accessible disclosure and search. Never fabricate a successful server action.
5. **Materials:** visual depth belongs primarily to navigation/controls; keep medicine, QA, stock and order tables/form surfaces legible and solid. Respect reduced transparency, forced colors and reduced motion.
6. **Privacy and regulated trust:** fail closed for sensitive or customer actions; role, MFA, tenant, rights, consent and billing gates must be proven server-side. Charts and generative Intelligence require provenance, uncertainty, transparent source/date and non-AI fallback wherever feasible.
7. **Device/accessibility acceptance:** Chromium + WebKit, keyboard, screen readers (real VoiceOver on Apple hardware and TalkBack for Android), high contrast, landscape, touch, slow loading, retry, PDF/print and representative user journeys. Automated axe success is not a WCAG 2.2 AA certificate.

Official reference examples:
- https://developer.apple.com/design/human-interface-guidelines/design-principles.md
- https://developer.apple.com/design/human-interface-guidelines/branding.md
- https://developer.apple.com/design/human-interface-guidelines/color.md
- https://developer.apple.com/design/human-interface-guidelines/typography.md
- https://developer.apple.com/design/human-interface-guidelines/materials.md
- https://developer.apple.com/design/human-interface-guidelines/accessibility.md
- https://developer.apple.com/design/human-interface-guidelines/generative-ai.md

## Release blockers in priority order

| Priority | Blocker and required acceptance | Repository tracker |
| --- | --- | --- |
| P0 | Protect `main` and `gh-pages`, verify policy enforcement and protected publisher still works. | #984 / #947 |
| P0 | Preserve recovered corporate home / products / Nutraxin / ESCO; compare exact deployed DOM/assets/source SHAs to approved release manifest and perform end-to-end browser smoke. | #955 |
| P0 | Independently validate the **already published** Contact form and backend (synthetic durable receipt, errors, privacy, anti-abuse, keyboard/AT, approved rollback); PR #961 merged despite an explicit release-hold description, so no signoff can be inferred. | #955 / #961 |
| P0 | Verify actual protected Portal/Intelligence/Distribution deployment and role/MFA/tenant journeys, not static route/module counts; maintain zero-new-spend and rights restrictions. | #955 / #689 / #809 |
| P1 | Obtain independently reviewed HIG applicable/not-applicable evidence, per-topic acceptance, real multi-device and accessible journeys, and documented rollback/test receipts. | #890 / #911 / #713 |
| P1 | Verify current public Search Console ownership, indexing and Merchant results via an authorized accessible data source; GSC Wizard subscription currently blocks connected measurements. | #929 |
| P1 | Review SharePoint effective permissions before restricted document sync; review Mongo Atlas indexes/capacity/private data and approved publisher rights without exposing secrets. | #898 / #835 / #667 |

## Strict closure policy

- Maintain the **172/172 reviewed; 0/172 independently accepted** figures until actual new linked deployment evidence and independent approvals change the register. Do not inflate the percentage by code-level passes, unreviewed N/A claims, synthetic screenshots or a published CI badge.
- Production promotions require exact-head tests and artifacts, deployed source identity, working user journeys, rollback point and authorized owner approval. Do not rebuild `gh-pages` from unrelated root static files or replace live Contact with a draft.
- No account credentials, patient data, restricted supplier documents or proprietary fonts are placed in this report. No AWS provisioning, Mongo writes, SharePoint permission mutation, payment, portal activation or live public deployment is part of this PR.

**This file itself is a source-only engineering audit. It does not fix the blocked items above or make 100% claims.**


## 21 November 2026: fresh owner-archive integrity inspection

The source inventory, complete 172-row Apple HIG CSV, ten-tab owner workbook, IMDF ZIP and three further owner archives were located in the owner's connected file library and processed **as original bytes**, without executing, installing or copying any Apple package assets into the site. This supplements the historical attachment register; it does not overwrite its earlier evidence boundaries.

| Owner artifact | SHA-256 of original bytes | Actual contents/validation | Use and limits |
| --- | --- | --- | --- |
| `Apple_HIG_Complete_Sectionwise_Index_2026-11-18.csv` | `77d4d437a42835b83c30ea4378cf65d70d9e8c814750246c1440b36f79abbbca` | 172 rows / 172 unique primary official URLs | Owner source index, not a production implementation receipt |
| `IMDF.zip` | `d40e5fa749a0d0ae013a77984e90531d8a4f44b429638e86b843847cae20cf64` | 10 members; ZIP CRC success; no path traversal | Historic indoor-map data-model examples only; no verified facility map or venue licence |
| `ComposingCustomLayoutsWithSwiftUI(1).zip` | `0fe4ce8ac081e1d7e9248022e2ffc59f94ccafe5ff8846a0964e419d8aa1fd35` | 104 members; ZIP CRC success; no path traversal | Native SwiftUI reference; not copied into a web runtime |
| `AnimatingViewsAndTransitions.zip` | `4335b52757b8ce3933c769cf14494873a4530914063cb1092c46b4d39a5c061f` | 181 members, 39 Swift files, three licence/readme subtrees; ZIP CRC success; no path traversal | Apple tutorial project has a licence text; this is not blanket permission for unrelated Apple branding/SDK assets |
| `apple-ios-27-ui-kit_assets_2026-10-27_v32(1).zip` | `df3518b0ee2cdf7e4facf984e88b5df5ec8e5a97b8787d73eb55c589a7019c28` | 151 members: 150 PNG and one SVG; CRC success; no path traversal; no standalone licence/readme within archive | Visual reference only pending relevant rights/terms; no web/Android redistribution |
| `apple-macos-27-ui-kit_assets_2026-10-28_v18.zip` | `abb9404f81f732a0ac58bd20d1ce600cb4a69061c33c61ead5b4070c016dcfb8` | 22 SVG members; CRC success; no path traversal; no standalone licence/readme within archive | Separate historical Apple design resource, not silently added to the 32-file November attachment baseline |

The original 10-tab workbook directly identifies 172 primary guidelines, 30 selected in-page anchors and five supplemental resources. The independent official Apple source-health workflow in [draft PR #996](https://github.com/NovapharmHealthacre/novapharm-website/pull/996), [GitHub Actions run 44830167681](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44830167681), passed all 210 original reference URL/heading checks. It explicitly handles the old Siri heading as documented source drift. A successful URL/CRC/hash check is **not** a current full-text legal review, site accessibility acceptance, native app signature, clinical data permission, or 172/172 production certificate.

A separate [Portal keyboard accessibility fix, draft PR #993](https://github.com/NovapharmHealthacre/novapharm-website/pull/993), has exact-head HIG/browser/security tests under evaluation. The corporate and protected public production branches remain unchanged by these audit findings.
