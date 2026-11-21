# NovaPharm — Apple HIG independent acceptance: all six owner-selected surfaces

**Scope confirmed:** 21 November 2026. **Document type:** reviewer and evidence-preparation packet; not a certification or production release. Existing constraints remain in force: **no additional paid AWS resources, no public customer activation, no unapproved medicines data or billing, owner production signoff not granted**.

## Follow-on engineering checkpoint — 21 November 2026

- GitHub read-back confirms **#900, #902, #993, #996 and #1000 merged** into `main`. Their engineering/test outcomes do **not** certify deployment or any Apple HIG topic.
- Draft PR **#991** previously passed all eight exact-head workflows at `cc4c1fce0d07396b74803b776a51d37208e92022` and preserved a generated ledger artifact. Subsequent source/evidence hardening commits require their **own new exact-head validation**; do not carry forward an earlier green check.
- Its generator now rejects discrepancies between every parsed source input and its exact hashed bytes (HIG register, source inventory and owner constraints). The report includes SHA-256 for all three input files, while the inventory's historical sourceSnapshotSha stays separately labelled.
- The workflow now requires a real generated ledger artifact (`if-no-files-found: error`), preventing an empty artifact handoff from appearing successful.
- Fresh read-only AWS ECS check in `eu-north-1`: Portal staging desired/running **0/0** and production-named Intelligence ECS cluster has no services. ECS inventory in the other 16 enabled regions is **SCP-denied**; blocked visibility is not proof those regions are empty.
- No independent GitHub review was recorded on #991 at this checkpoint; branch protections, authorized staging roles, actual physical-device receipts and owner signoff remain unresolved. **Accepted: 0/172**, including zero independently approved whole-topic N/A decisions.

## Exact scope and baselines

- Corporate public website, protected Portal, protected NovaPharm Intelligence, Distribution/WMS, **native Swift/SwiftUI iOS**, and **native Android** are all within the owner-selected target.
- Canonical HIG register: 172/172 source-guideline review entries recorded; 516/516 platform-level web/iOS/Android applicability assessments recorded; **0/172 independently production-accepted implementations** and **0 whole-topic N/A independently approved**. The source register additionally states that all 172 full-text reviews have **not** been independently reproduced, despite recorded source reviews.
- Machine generator: `scripts/build-hig-six-surface-acceptance.mjs`, 172 HIG topics × six surfaces = **1,032 preliminary review cells**. Each inherits the original platform *proposal* but has zero production acceptance credit. Web platform: 113 applicable / 59 proposed N/A, inherited independently by four web surfaces; iOS 133 / 39; Android 99 / 73. Total **684 proposed applicable** and **348 proposed not applicable** surface cells, subject to independent feature-level refinement. These are **not** 1,032 proven features, six sets of fully implemented guidelines, or 348 accepted exclusions. In particular, 28 whole-topic N/A candidates remain unsigned.
- Current source inventory: 32 corporate page definitions, 19 Nutraxin product entries, six article references; 54 Portal modules (48 navigation-visible, six dependency-gated); 22 Intelligence workspace definitions (five source-labeled read-only, 17 gated); 139 source-derived route candidates across the existing public/protected mapping. Inventory items do not prove deployed URLs or genuine permissions.
- **Native iOS correction:** `native/novapharm-intelligence-ios/project.yml` and its SwiftUI app/Swift Testing/XCTest sources are present, alongside the separate `native/novapharm-intelligence-apple/Package.swift` library. The SwiftUI app uses development bundle `com.example.NovaPharmNativePreview` and `CODE_SIGNING_ALLOWED=NO`. Recognise this existing native engineering work. Neither an unsigned Simulator app nor the SwiftPM library is a signed iPhone/iPad production release.
- Native Android `native/novapharm-intelligence-android/app/build.gradle.kts` builds `com.novapharm.intelligence.research` as an offline research/debug shell; Expo `native/novapharm-intelligence-mobile/app.json` remains a separate unsigned preview. Neither proves a signed customer-ready Android release.

## Release & validation evidence per surface

| Surface | Real source evidence | Required independent acceptance observations | Current release status |
| --- | --- | --- | --- |
| **Corporate website** | Next.js and public static source; existing read-only browser checks | Enumerate true public URLs; match public HTML/assets to approved deployed SHA; chromium/WebKit; 320px–400% zoom; keyboard/VoiceOver; privacy/legal, product rights, contact, checkout and site navigation | Bounded sample receipts only; live-source and complete route evidence pending |
| **Portal** | 54 source-declared modules, role routes, merged keyboard accessibility fix #993 (source-level) | Actual authenticated synthetic customer/employee/executive/admin accounts, MFA, tenant isolation, consent, expiry, errors and accessible journeys with screenshots | Not independently accepted; safe private staging unavailable at last AWS inventory |
| **Intelligence** | 22 candidate workspaces, five labeled existing read-only in source | Each permissioned real workspace, source provenance/rights, AI disclosure, safe empty/unavailable states, role scope, accessible charts and interaction | Gated/read-only source states cannot establish authenticated production |
| **Distribution/WMS** | WMS/QA/FEFO/pick-pack-dispatch/POD source concepts | Actual available role-bound stock/batch/quality transaction journeys, safe synthetic data, idempotency, audit logs, responsive and accessible workflows | No full end-to-end operational receipt |
| **Native iOS** | Real SwiftUI/XcodeGen app; native Swift Package; unsigned Simulator CI workflow | Approved real bundle ID, signed controlled device build, Xcode UI test, VoiceOver on physical iPhone/iPad, Dynamic Type, orientation, light/dark, keyboard, accessibility inspector, permissions, identity and release provenance | Native source exists; placeholder ID, signing disabled; no physical VoiceOver signoff |
| **Native Android** | Gradle research app, debug build/permissions CI, Expo preview | Approved package/release signing, physical device/APIs with TalkBack, font scaling, gesture/back/keyboard, dark mode, system permissions, authentication/data rights, actual artifact digest | Debug/research only; no signed release or physical TalkBack signoff |

Official device-validation basis:
- Apple HIG Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple Accessibility Testing: https://developer.apple.com/documentation/accessibility/performing-accessibility-testing-for-your-app
- Xcode Testing: https://developer.apple.com/documentation/xcode/testing
- Android accessibility testing: https://developer.android.com/guide/topics/ui/accessibility/testing

**Apple specifically recommends physical-device testing for VoiceOver**, since the simulator is not a substitute; Android likewise requires TalkBack/on-device evaluation beyond static analysis. No automatic axe, simulator or debug-build pass is substituted for these reviewer receipts.

## Read-only verified blockers (21 Nov 2026)

1. **Enforced GitHub release protection absent (P0).** GitHub branch read-back showed `main` protected=false and `gh-pages` protected=false. Repository owner/admin must install and *negatively test* rules prohibiting unreviewed direct publication and force-push while preserving the reviewed Pages release actor. See #984 and prior site rollback #955. No administrative protection change was performed.
2. **Private staging Portal cannot currently furnish live role evidence (P0).** AWS ECS read-only inventory succeeded in `eu-north-1` and found service `novapharm-staging-portal-private`, `desiredCount=0`, `runningCount=0`. Inventory operations in 16 other discovered enabled regions were denied by an AWS Organizations service-control policy. This is **partial visibility**, not proof those regions have zero resources. No environment was started, provisioned, or billed.
3. **Release authority and spend not approved (P0).** `config/intelligence/owner-production-constraints.json`: `productionSignoff=not_granted`, `monthlyCapGbp=0`; protected DNS, customer access, subscriptions, billing and paid provision remain disallowed. A reviewer cannot override owner authorization.
4. **Clinical/data rights (P0).** Independent rights/security confirmation for third-party NHS/medicine datasets, tenants, WMS orders and patients is absent; synthetic nonclinical acceptance only until authorised. No external supplier or patient data introduced into GitHub logs or screenshots.
5. **Independent human QA/Security release reviewer (P0).** Evidence must be reviewed by a separately authorised human who is not the PR author, via exact-head GitHub approval event. Topic-specific N/A decisions, accessibility receipts, role/security and relevant clinical/regulated rights each require review. The current 28 all-platform N/A candidates remain **unapproved**.
6. **Native app identity, signing and physical testing (P1).** Existing iOS SwiftUI and Android debug research source should be preserved, not mistaken for missing code. Owner-approved release bundle/package identities, controlled signed builds, compatible devices and external assistive-technology test receipts are still required.
7. **Complete source-to-live fidelity and change control (P1).** Record independently observed deployed SHA, source/artifact hash, browser/device version, timestamp, route/screen ID, redacted screenshots, tested journey, findings, reviewer identity and approved release/rollback. Do not count only `main`/PR SHA or a green workflow as deployed.
8. **Current full-article independent review (P1).** All 172 HIG register reviews are recorded, but not all full article texts were independently reproduced as of source metadata. Refresh changed Apple sections and obtain a distinct reviewer decision for the complete applicable guidance, not merely URL reachability.

## Current linked CI / draft PR evidence

- [#993 — Portal keyboard dismissal](https://github.com/NovapharmHealthacre/novapharm-website/pull/993): **14/14 exact-head workflows passed**, including CodeQL, Portal, HIG, production-readiness and Chromium/WebKit. Still draft, unmerged; no authenticated production credit.
- [#996 — Apple HIG 210-link source monitoring](https://github.com/NovapharmHealthacre/novapharm-website/pull/996): **6/6 workflows passed** on its latest head. Tests URL/anchor availability, not full content or runtime conformance; unmerged.
- [#1000 — public sitemap accessibility/provenance screening](https://github.com/NovapharmHealthacre/novapharm-website/pull/1000): read-only live-route audit succeeded, remaining exact-head browser acceptance not yet counted in this packet. SSR signals do not replace manual AT.
- [#991 — owner archive and source-to-live audit](https://github.com/NovapharmHealthacre/novapharm-website/pull/991): this evidence packet and reproducible six-surface ledger; pending independent review.

## Independent reviewer acceptance procedure (repeat for each applicable topic / product surface)

1. Confirm exact official article, scope and latest relevant changes; decide applicable / independently approved N/A, with source-based rationale and affected screens.
2. Record actual deployed route or installed signed build, observed artifact digest and SHA, exact branch/PR head and target environment; for protected routes, use pre-authorised synthetic test users with an approved tenant and MFA.
3. Execute relevant browser/device keyboard, real assistive-technology, layout/reflow, privacy, error/empty/loading and domain-specific transaction/data rights tests. Keep artifacts private and redacted; never check in real customer or patient data.
4. Register the **real test run and artifact**, screen/route, OS/browser and device versions, human tester, failure remediation, reviewer disposition and rollback reference. CI passed on an old head or a simulator-only screenshot is insufficient.
5. Obtain independent Quality/Security and, where necessary, clinical/data-rights approval for the **exact validated revision**. After all scopes accepted, obtain separate explicit owner release authorization.
6. A topic becomes fully accepted **only when every applicable platform/surface has the appropriate independent receipts, all N/A decisions are approved, and release/owner gates are met**. Never set 172/172 by editing the counter alone.

## Owner/admin actions needed

- Configure enforced `main` and `gh-pages` PR/ruleset protections and test without breaking Pages.
- Nominate a real authorised reviewer distinct from the GitHub PR author, plus clinical/data-rights reviewer where necessary.
- Authorise a truly available private staging environment (existing resources only, no additional charges unless separately approved), and arrange safe synthetic role/MFA access; resolve or formally constrain the SCP visibility issue.
- Approve distinct iOS bundle and Android package identities for **controlled test distributions**, then supply access to real iPhone/iPad and Android devices with VoiceOver/TalkBack testing.
- Decide release scope for 28 whole-topic N/A candidates and grant **separate final production approval only after evidence**, not in advance.

**Current defensible outcome: 172/172 source records; 516/516 platform assessment records; 1,032 generated six-surface *review targets*; 0/172 independently accepted product implementations.** All code and workflow changes in this PR are source-only. No application, site, protected API, GitHub Pages artifact, Native app store listing or AWS service was deployed.

## 21 November 2026 — exact live HTML byte-level publisher evidence

The source-only [PR #1008](https://github.com/NovapharmHealthacre/novapharm-website/pull/1008) adds a reproducible read-only HTTPS-versus-checked-out-\`gh-pages\` HTML digest verifier. It checks the union of 61 sitemap URLs, the 32 declared Corporate pages and one separately noindex research route, deduped to **65** pages. No forms, logins, medicines APIs, writes, customer/patient data or Pages publication are exercised.

The **latest exact-head run** ([GitHub Actions 44864615921](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/44864615921), audit commit \`e0ec938221e648203b809c876504a3941a1fa4bf\`, evidence timestamp \`2026-11-21T04:08:54.855Z\`) independently observed the checked-out Pages commit \`f15807c37a31ba70eece1405ed4889cf9d73581d\` and **65/65 exact fetched HTML byte matches**, **0 mismatches** and **0 basic route failures**. This is static HTML delivery parity with that publisher commit at the observation time; do **not** infer source-authoring provenance, dynamic transactions, production signoff or a full rendered accessibility pass.

The same artifact records **34/64 ordinary public routes without a visible full SHA** plus the separately noindex research route without one, for **35/65** missing markers overall. The three accessible registered Corporate routes \`/distribution/\`, \`/market-access/\` and \`/markets/\` remain absent from the 61-entry live sitemap. [Draft #1007](https://github.com/NovapharmHealthacre/novapharm-website/pull/1007) is a pending **one-file** \`gh-pages/sitemap.xml\` candidate to add only these three already-live routes; [draft #1003](https://github.com/NovapharmHealthacre/novapharm-website/pull/1003) independently verifies public builder parity. Neither is live or independently release-approved. Branch protection P0 [#984](https://github.com/NovapharmHealthacre/novapharm-website/issues/984) remains unresolved.

Exact-head engineering CI for [#1004](https://github.com/NovapharmHealthacre/novapharm-website/pull/1004) (native accessibility source) is **17/17 success** and [#1005](https://github.com/NovapharmHealthacre/novapharm-website/pull/1005) (corporate Playwright screenshot reliability) is **9/9 success**; both are open/ready for **independent review**, not merged or device accepted. Source checks [#993](https://github.com/NovapharmHealthacre/novapharm-website/pull/993), [#996](https://github.com/NovapharmHealthacre/novapharm-website/pull/996) and [#1000](https://github.com/NovapharmHealthacre/novapharm-website/pull/1000) are merged. No human reviewer receipt, tenant acceptance, signed device testing or final release authorization is introduced by this packet.

**Acceptance unchanged:** 172 Apple HIG source topics and 1,032 six-surface proposed evidence cells; **0/172 independently production-accepted topics**, 0 approved whole-topic N/A exclusions. Publisher file equivalence is not a substitute for separate keyboard/screen-reader/physical-device/rights and owner review.
