# NovaPharm Healthcare × Apple ecosystem: evidence-bounded website and design-system audit

**Audit date:** 7 November 2026  
**Scope:** https://novapharmhealthcare.com; https://www.apple.com and 15 Apple Developer / documentation / design URLs supplied by the owner (the Sample Code URL was listed twice).  
**Implementation branch:** `audit/apple-web-accessibility-20261107`  
**Repository:** `NovapharmHealthacre/novapharm-website`  
**Assurance classification:** source-backed and public indexed-page review; **not** an independent live browser or production operations certification.

## 1. Methods and limits

1. Reviewed available public search/browser captures of NovaPharm home, About, Services, Regulatory, Products, Partner and Contact pages plus the portal entry; those search captures were marked as crawled approximately three months earlier. They are **not** reliable evidence of today's deployed content or endpoint availability.
2. Reviewed current GitHub `main` at `fde52dbd504e4f5e03941e39b08b40afbb46d717`: Next.js corporate layout, site header, public page builder, public stylesheet stack, generated-bundle source, frontend interactions, visual contracts and release workflow. Historic `gh-pages` was `af8b615017921e914c483e67b5a5e48f7d0557bd`, not equal to current `main`. That branch difference **does not by itself establish which artifact is live**. The missing exact-main release verification remains an independent gate.
3. Reviewed the public Apple.com homepage, Apple Developer landing page, Design and Design Resources; the Apple Documentation Library, Sample Code Library and HIG entry points require JavaScript in the retrieved text view. Used their separately indexed official HIG Design Principles, Motion, Accessibility and Apple's UI Design Dos and Don'ts as limited supporting sources. No Apple source code, internal analytics, Figma asset licenses, proprietary design tokens or Apple runtime internals were available.
4. Did **not** claim direct screenshots, HTTP uptime, accessibility-tree scans, Web Vitals, actual live form deliveries, authentication success, deployment provenance or security penetration testing from the indexed pages alone. These need test artifacts and operator evidence.
5. The reference is Apple's quality of hierarchy, functionality and platform accessibility, **not** its exact appearance or ownership. NovaPharm's own brand, distinct visual assets and regulated operating status are retained.

## 1A. Independent visual/browser evidence (6 November 2026)

An existing GitHub Actions forensic run contains **20 real browser/viewport/page combinations** (Chromium + WebKit; desktop 1440×900 and mobile 390×844) covering Home, Products, Contact, Trust Centre and Privacy. Its retained screenshot and machine-readable bundle was recovered and inspected for this audit: [run 42242268484](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42242268484). A separate crawl recorded **23/23 sampled public routes HTTP 200**: [run 42240933719](https://github.com/NovapharmHealthacre/novapharm-website/actions/runs/42240933719). These are dated observations, **not current-November-7 live re-tests**.

- **Desktop visual:** large editorial hero with tablet/medical-pack imagery, high-contrast black/white/red hierarchy, restrained primary CTA pair, low-density three-column sourcing lanes, a batch-evidence image section and a distinct corporate footer. This confirms substantial Apple-like clarity is already present and should not be destroyed by a generic theme replacement.
- **Mobile visual:** original one-column composition, readable hero text, defined CTA blocks, 390px card stacking and no captured document-level horizontal overflow. Consent presentation still occupies meaningful space over early content; check usable viewport, reading order, button targets and preference persistence rather than weakening cookie/privacy handling.
- **Contact visual:** eight clear business-enquiry routing cards and an honest email-only fallback. Do **not** imply submissions are accepted by the website or that opening an email equals receipt.
- **Automated accessibility finding in the original capture:** small topic numbers previously computed to contrast **4.31:1** (foreground `#70747a` over `#f5f5f7`), below 4.5:1 for ordinary text in several engine/viewport combinations. The subsequent separate hotfix #94 was reported as merged with exact-head browser evidence; require fresh-current rendered checks before reclassifying that issue as a new failure.
- **Runtime observations at that time:** managed portal HTTP 503, managed API health HTTP 404 and public managed contact submission not enabled. These are not remedied by design CSS.
- **Content/semantics follow-up:** the browser extraction of the homepage `h1` yielded an empty text value in the old screenshot JSON, although a large visible hero headline was rendered and the public static builder contains a textual `h1`. Verify the *actual published runtime* accessible heading name; do not assume a source fix is reflected in a different deployed build.
- **Legal/privacy follow-up:** the old privacy capture mentioned Azure among potential processors while current infrastructure planning targets AWS; an accountable legal review should align the published processor wording with reality before future personal-data intake.

## 2. Current NovaPharm architecture: observed strengths

- Public corporate page generation and Next.js managed corporate application are distinct products. Public artifact uses the `scripts/build-site.mjs` pipeline; managed app uses `apps/corporate`. A shared brand alone is not equivalent to production feature parity.
- Public corporate source already defines a 56px global navigation and 52px local-navigation model, system-native font stack, responsive sections, real product presentation and evidence-led regulatory narrative (`assets/css/corporate-product-discipline.css`, `scripts/apply-corporate-product-discipline.mjs`).
- Existing visual contract checks include 19 verified Nutraxin catalogue references, a 7-stage regulatory roadmap, responsive viewports, reduced motion, forced colours, publicly truthful contact fallback and protections against false wholesale-authorisation claims.
- Mobile menu already uses an accessible button with `aria-expanded`, `aria-controls`, Escape dismissal, outside-click dismissal, and responsive collapse (`assets/js/novapharm.js`). Do not rewrite as an untested animation-only menu.
- Static Pages contact state is intentionally fail-closed and must not handle customer data or credentials. Managed contact, AWS Entra identity, durable receipt and SES email remain separately gated.
- Source branch `main` has post-merge dependency audit, CodeQL, supply chain and public-browser evidence, but those checks are not proof of a live cloud application or a freshly published custom domain.

## 3. Findings and disposition

| Priority | Observation | Evidence | Release acceptance |
|---|---|---|---|
| **P0** | Corporate release exact-SHA parity between GitHub source, publishing workflow and live custom domain unproven | `main` SHA differs from `gh-pages`; `.github/workflows/pages-live-publish.yml` expects exact live verification | Confirm actual Pages build type/authority; secure merge control; deploy and verify HTML, CSS, content hash/commit and rollback |
| **P0** | Managed customer enquiry/portal not certified operational in production | Public-only portal locks credentials; public contact output must not collect | Independently prove AWS runtime, Entra MFA, authorized session/role, API, Atlas and SES persistent receipt + inbox; consent/privacy; restore/recovery |
| **P1** | Unscoped translucent focus ring risks low visual indication on white content | `assets/css/apple-pharma-public.css` prior rule `rgba(180,35,46,.36)` | Use solid keyboard-focus outline, run keyboard/contrast/axe browser checks |
| **P1** | Visual surfaces should honor user-selected reduced transparency and increased contrast | Existing corporate CSS has forced colors and reduced motion but lacks those explicit media preferences | Opaque navigation and more legible system-preference variants without changing normal identity |
| **P1** | Public and managed corporate design tokens/rules need explicit consistency checks | Public `--npd-system` differs from legacy Next global Arial/Georgia, though other Next styles override it | Capture both output screenshots at 320/390/768/1440px; reconcile actual computed styles, not just source declarations |
| **P1** | Navigation should prioritize the meaningful corporate journey | Public global nav: Company, Capabilities, Oncology, Products, Insights, Contact, Secure Portal | Measure keyboard order, mobile menu, link naming, last-mile contact path; keep portal separate and securely delegated |
| **P1** | Product claims must remain qualified and provenance visible | Source checks for 19 catalogue references, no false supply commencement | Audit source licences, trademark permissions, SKU images, date, supplier and regulatory truth; no invented approvals |
| **P2** | Content should be more task-oriented, not mere Apple-like styling | Apple.com uses one campaign proposition and short high-signal actions | Preserve NovaPharm proposition with modular pages, metadata, evidence rails and appropriate primary CTA |
| **P2** | Apple native design tools are not web dependencies | SwiftUI, TestFlight, Xcode, SF Symbols and Icon Composer are platform-specific tools | Separate iOS/macOS roadmap; do not ship unlicensed Apple UI assets, fonts, logos or Apple sample code into website |

## 4. Requested Apple URLs: translation decisions

| Apple reference | What was reviewed | NovaPharm decision |
|---|---|---|
| https://www.apple.com | Campaign hierarchy, product imagery and paired CTAs | **Web:** use concise hero, deliberate imagery, consistent product-specific CTAs; no imitation of Apple's marketing assets |
| https://developer.apple.com | Information architecture across technologies, documentation, design and updates | **Web:** disciplined sectional navigation, task-based help and visible source provenance |
| https://developer.apple.com/documentation/ | Documentation library shell (requires JS in text view) | **Future docs:** versioned technical/help reference and source links; not a website runtime dependency |
| https://developer.apple.com/documentation/samplecode/ | Sample Code Library shell (requires JS in text view) | **Future SDK:** consented, security-reviewed, owned sample workflows; no wholesale copying |
| https://developer.apple.com/swift/ | Swift language introduction | **Native only:** relevant to a separate iOS/macOS client; not used as website frontend |
| https://developer.apple.com/swiftui/ | Declarative multi-device native UI | **Native only:** design principles translate to consistent web components; SwiftUI itself does not render the HTML website |
| https://developer.apple.com/swift-playground/ | Swift learning and prototyping | **Native learning:** not part of corporate public website deployment |
| https://developer.apple.com/testflight/ | Pre-publication native beta feedback | **iOS QA later:** TestFlight cannot replace web CI/browser acceptance |
| https://developer.apple.com/xcode/ | Native app development toolchain | **iOS/macOS:** use for separately owned native applications |
| https://developer.apple.com/xcode-cloud/ | Native CI and tester delivery | **Native CI later:** current website remains on GitHub Actions and its authorized deployment |
| https://developer.apple.com/icon-composer/ | Native layered icon production | **Native branding later:** keep original NovaPharm icon/favicons; do not use Apple app branding |
| https://developer.apple.com/sf-symbols/ | Platform SF Symbols library | **Not for arbitrary web reuse:** create or use appropriately licensed, accessible website icons |
| https://developer.apple.com/design/ | HIG, resources, design pathways | **Web:** adopt clarity, hierarchy, craft, predictable interaction and accessibility |
| https://developer.apple.com/design/resources/ | Official UI kits, icon templates and platform resources | **Reference only:** evaluate permitted native design templates, not import copyrighted Apple UI assets into public website |
| https://developer.apple.com/design/human-interface-guidelines/ | JS-required HIG entry; official indexed Design Principles / Motion / Accessibility | **Web:** responsive layouts, visible focus, reduced motion, transparent states and high-contrast modes |

## 5. Actual changes in this branch (Phase 1)

1. `assets/css/apple-pharma-public.css` changes the global translucent focus style to a solid blue high-contrast outline on keyboard-focusable controls. No fonts, trademarks, assets or app routing changed.
2. `assets/css/corporate-product-discipline.css` adds `prefers-reduced-transparency: reduce` for opaque, unblurred corporate nav surfaces, plus `prefers-contrast: more` for stronger text/dividers and readable legal-footer text. Default styles are unchanged.
3. `scripts/test-visual-contracts.mjs` adds assertions that prevent regression of keyboard focus and these accessibility media preferences.
4. All changes are review-branch only until exact-head CI, public artifact checks and controlled owner-approved live publication pass.

## 6. Required acceptance (fail closed)

- **Source and security:** `npm ci --ignore-scripts`, `npm audit --omit=dev --audit-level=high`, full `npm run check`, CodeQL, dependency-review, no leaked config or secrets.
- **Web design:** Chromium, WebKit and if feasible Firefox, 320/360/390/768/1024/1440px; 200%/400% zoom; no accidental horizontal scroll; image aspect and crop; keyboard-only navigation, focus visibility and return; accessible mobile menu; 44px-equivalent target review where applicable.
- **Accessibility:** WCAG 2.2 AA manual + automated checks, `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`, forced colors, readable labels, no color-only state, color contrast, screen-reader announcements.
- **Regulated truth:** no false MHRA/GDP, licensing, availability, clinical or wholesale claims; source-date register current; no patient-identifiable data on public contact.
- **Production:** exact source SHA → generated Pages artifact → deploy → custom-domain verification, HTTPS and canonical URL policy; rollback test; GitHub `main` governance and approval. Do not merge a failing candidate or confuse synthetic tests with production.
- **AWS managed services:** independent real account MFA/Entra, least privilege, staging/production separation, Atlas private/fixed egress, SES sender identity and DKIM, durable accepted-receipt and failure behavior, observability, backup/recovery and approved costs.

## 7. Recommended release sequence

1. Complete and review this bounded web accessibility PR; require green exact-head checks and owner visual acceptance.
2. Reconcile other open design changes (#95/#98) with evidence, not blind mergers or stale lockfiles.
3. Establish a verifiable corporate Pages release pipeline and branch/ruleset protections before changing live presentation.
4. Prove the AWS managed workflows and trusted identity separately; only then enable contact submission and secure user accounts.
5. Plan native iOS/Android UI work independently: approved NovaPharm icons, platform design system, Xcode/SwiftUI/TestFlight for Apple application builds when relevant.

## 8. Primary references

- Apple homepage: https://www.apple.com/
- Apple Developer: https://developer.apple.com/
- Apple Design: https://developer.apple.com/design/
- Apple HIG entry: https://developer.apple.com/design/human-interface-guidelines/
- Apple HIG Design Principles: https://developer.apple.com/design/human-interface-guidelines/design-principles/
- Apple HIG Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Apple HIG Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple UI Design Dos and Don'ts: https://developer.apple.com/design/tips/
- Apple Design Resources: https://developer.apple.com/design/resources/
- NovaPharm public source and CI: https://github.com/NovapharmHealthacre/novapharm-website
- AWS/contact production gates: https://github.com/NovapharmHealthacre/novapharm-website/issues/55
