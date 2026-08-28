# Final Human Visual Dossier

Status: corporate continuation has passed working-tree visual acceptance; immutable-SHA, managed staging and production review pending

Review dates: 13 August 2026 estate baseline; 22 August 2026 corporate product-discipline continuation; 28 August 2026 exact-final working-tree review

Candidate: `codex/corporate-product-discipline-rebuild`, based on live/main SHA `23310988e8fc484375aa10176aa1c1edbf5371a8`; immutable candidate SHA not yet assigned

## Evidence boundary

This dossier records genuine screenshots from local production standalone applications. Chromium and Playwright WebKit rendered the real application code with reduced motion. Portal evidence used isolated synthetic users and records. It does not prove Azure, Front Door, WAF, Entra, SharePoint, email, production data, production network performance or live-domain acceptance.

The compact retained dossier contains 62 WebP screenshots and original Playwright PNG hashes in `audit/evidence/final-visual-lock/selected-screenshot-manifest.json`. The image conversion reduced 103,060,939 source bytes to 17,663,204 review bytes without changing dimensions. Product before-and-after records are retained under `audit/evidence/final-visual-lock/products/`. The 13 August continuation adds seven lossless PNG frames for official-brand and Portal authentication review, with hashes and measured geometry under `audit/evidence/final-visual-lock/official-brand/` and `audit/evidence/final-visual-lock/portal-authentication/`.

The 22 August corporate continuation added 20 retained WebP Products before/after screenshots at 390, 768, 1366x768, 1440 and 1920 pixels across Chromium and WebKit. The 28 August exact-final run supersedes its smaller temporary matrix: 820 Corporate screenshots, 164 Corporate Axe runs, two high-density checks, two scriptless checks and 12 temporary PDFs comprising 39 visually inspected pages. Temporary PNG/PDF laboratory output remains deliberately uncommitted; the deterministic capture and validation scripts are the release evidence mechanism.

## Rendered matrix

| Application | Routes or scenarios | Chromium and WebKit screenshots | Axe runs | Serious or critical Axe findings |
|---|---:|---:|---:|---:|
| Corporate | 39 routes, including 404 and Trust Centre | 780 | 156 | 0 |
| NIT | 13 routes | 260 | 52 | 0 |
| Founder | 21 routes | 420 | 84 | 0 |
| Portal | 50 page states across four access areas | 1,000 | 200 | 0 |
| Portal interaction states | Search, empty, loading, read-only, access denied, password error, hidden route, logout and expiry | 18 | 18 | 0 |
| Status | Normal, activation pending, maintenance and incident | 32 | 16 | 0 |
| Total | Full estate plus targeted interaction states | 2,510 | 526 | 0 |

### Corporate continuation matrix

| Scope | Screenshots | Axe runs | Additional geometry checks | Result |
|---|---:|---:|---:|---|
| Eight representative routes at 390, 768 and 1440 pixels in Chromium | 24 | 24 | 13 homepage widths | Pass |
| Eight representative routes at 390, 768 and 1440 pixels in WebKit | 24 | 24 | 13 homepage widths | Pass |
| Products before/after at five owner-required viewports in both engines | 20 retained WebP | Not applicable | Full-page order/overflow checks | Pass |
| Twelve print routes (22 August historical run) | 12 PDFs / 36 rendered pages | Not applicable | Blank-page, sticky-UI and semantic checks | Pass; superseded by the 39-page exact-final run below |

### 28 August exact-final matrices

| Scope | Routes/modules | Viewports | Screenshots | Axe runs | Result |
|---|---:|---:|---:|---:|---|
| Corporate standalone | 40 canonical routes plus governed 404 | 10 across Chromium and WebKit | 820 | 164 | Pass; zero serious/critical findings and zero unresolved browser defects |
| Secure Portal / Medicines Intelligence | 54 governed modules; 48 visible and 6 dependency-blocked | 13 across Chromium and WebKit | 1,360 | 230 | Pass with isolated synthetic data; zero serious/critical findings |
| Corporate print | 12 routes | A4, rendered back to PNG | 12 PDFs / 39 pages | Not applicable | Pass; every page human-reviewed after final CSS |

The Corporate matrix passed at `2026-08-28T15:06:51.669Z` after the last Products and Oncology composition corrections. The Portal matrix passed at `2026-08-28T05:21:04.022Z`. Both are working-tree evidence, not immutable-SHA, Azure-hosted or production evidence.

Every full public and portal matrix used 1280x800, 1366x768, 1440x900, 1920x1080, 1024x1366, 768x1024, 390x844, 430x932, 375x667 and 320x568 viewports. Status normal used all ten; its three exceptional scenarios used 1440x900 and 390x844 in both engines.

A separate interactive in-app browser review added a 414-pixel mobile checkpoint for Corporate, NIT and Founder. It exercised navigation, cookie rejection, the corporate motion control, Products order, image loading, console output and horizontal overflow. Automated craft preflights add two Chromium/WebKit scriptless-navigation runs to each public property and two Corporate high-density product-media runs. An isolated WebKit 320x568 rerun also completed 89 pages, 89 Axe scans and 16 screenshots with zero reported issues after a prior full-run harness timeout. The timeout was not reproducible and is classified as a harness interruption, not a product defect.

The 13 August in-app browser review inspected the official corporate identity at 1440x900 and 390x844, and Portal authentication at 1440x900, 1280x800, 1024x768 and 390x844. The rendered corporate page used the approved wordmark, `#E3120B` theme colour, approved favicon and Apple touch icon without horizontal overflow. The Portal rendered four equal access choices at 1024 pixels and above, one deliberate column at 390 pixels, no card overflow and no browser console warning. Viewport captures were used because the in-app browser's full-page capture retained a prior responsive canvas after a viewport transition; DOM geometry and viewport captures agreed.

## Human review

Corporate review covered the homepage, About, Company, Governance, Services, Regulatory, CRO, Oncology, Products, Nutraxin, Partners, Technology, AI governance, all five leadership profiles, six Insights articles, Contact, account application, investor information, careers, Trust Centre, legal pages and 404. The accepted direction has institutional hierarchy, restrained red, readable editorial typography, truthful capability labels, consistent portraits and a balanced desktop/mobile grid.

NIT review covered the homepage, About, Expertise, Sectors, Approach, Insights, all three technical articles, Contact, legal routes and 404. Its darker technical identity remains distinct from the corporate estate without losing NovaPharm provenance.

Founder review covered the homepage, Thinking, five-publication model, ten essays, Media, About, Ventures, Facts, Gallery, Contact, mobile navigation, 404 and Ask Vishal's Work. The editorial treatment is restrained and publication-led. The evidence dialogue returned a source-linked extractive response without a console error.

Portal review covered login, password change, every visible customer, employee, executive and administrator module, authorised search, no-result search, loading, read-only classification, wrong-scope rejection, hidden-module 404, logout and simulated expiry. Screens show synthetic data labels and informational-only classifications; unavailable write workflows are not presented as operational.

Status review covered normal, activation-pending, planned-maintenance and incident presentations. It exposes sanitised availability only and remains non-indexable.

## Finding register

| Area | Severity | Observation | Correction | Residual |
|---|---|---|---|---|
| Corporate Services at 320 px | High | One service composition could exceed the narrow viewport | Grid children, headings and links were allowed to shrink and wrap; Chromium and WebKit reruns passed | None |
| Leadership evidence | High | Prior derivatives did not all match the owner-supplied authoritative portraits | Vishal, Prabhakar and Dr Girish derivatives were rebuilt with metadata removed and provenance hashes updated | Portrait rights remain owner-attested |
| Products hierarchy | High | Food Supplement Portfolio Review appeared after other portfolio content | The section now appears exactly once as the first substantive portfolio block; ten before and ten after captures prove order and balance | Catalogue availability and claims remain explicitly bounded |
| Products contextual links and source density | Medium | The two links were visually dense and below the 44-pixel interaction target; the owner-supplied 700-pixel product master needed an honest high-density display budget | Stacked the links below 430 pixels, applied a 44-pixel target and capped the product image at 350 CSS pixels; Chromium and WebKit preflights enforce both contracts at 2x density | None |
| Scriptless public navigation | Medium | NIT and Founder mobile navigation depended on hydration even though primary public navigation should progressively enhance | Added nonce-compatible pre-hydration state and scriptless CSS navigation; Corporate, NIT and Founder now pass Chromium and WebKit no-JavaScript checkpoints | None |
| Corporate trust route | High | The required canonical Trust Centre did not exist | Added a substantive Trust Centre, metadata, footer route, schema coverage and browser coverage | Managed-service assurance remains pending live evidence |
| Status scenarios | Medium | Maintenance and incident visual states lacked deterministic acceptance coverage | Added normal, activation, maintenance and incident fixtures, screenshots and tests | Live incident integration remains pending |
| Portal visual states | Medium | Several asserted interaction states lacked named retained captures | Added 18 interaction screenshots and 18 Axe scans across both engines | Live Entra and production session expiry remain pending |
| Portal authentication role layout | High | The 680-pixel panel forced four desktop role choices into 127-pixel tracks; the Administrator heading overflowed in six Chromium and six WebKit desktop/tablet checks | Added an explicit `login-panel-authentication` contract with a 900-pixel maximum, preserving four 182-pixel tracks from 1024 pixels upward and the deliberate single-column mobile layout | None; full exact-candidate Chromium/WebKit rerun remains part of the release gate |
| Official identity assets | High | The repository carried only a limited logo pair and could not prove parity with the owner's complete identity package | Preserved and checksum-verified all 93 approved files, deployed 17 exact web derivatives, adopted the official `#E3120B` token, and updated favicons, PWA icons, social cards, manifests and structured logo metadata | Identity provenance is owner-approved; legal trademark administration remains owner-controlled |
| Founder mobile capture | Low | One in-app screenshot encoding attempt was invalid | Discarded it and retained a valid independent Playwright Chromium capture | No application defect |
| Public mobile LCP | Medium | Three-run median lab LCP was 2.61-2.91 seconds against a 2.5-second target | Transfer, CLS and blocking work remain controlled; scores are 95-97 | Recheck on accepted staging and use field data before claiming target attainment |
| Corporate mobile resource priority | High | The rebuilt homepage preloaded a JPEG that the AVIF-capable browser did not paint, delaying discovery of the actual LCP image | The preload now matches the painted AVIF; mobile median improved 83 to 89 and transfer fell 552 KiB to 403 KiB | Throttled local LCP is 3.3 seconds; staging and field evidence remain pending |
| Corporate 320 px identity | High | The inherited brand minimum width overflowed the compact header | Removed the conflicting minimum and retained a 176-pixel governed logo width; both engines report a 320-pixel document width | None |
| Corporate local navigation | Medium | Long family labels clipped in the narrow horizontal strip | Local navigation now wraps as an authored multi-line row with full labels and compliant touch targets | None |
| Corporate page identity | Medium | Chrome replacement overwrote page-specific `data-page`, disabling Leadership crop rules | Preserved page identity and introduced separate `data-family` and `data-route` attributes | None |
| Public conversion routes | High | Static Contact and Open Account states were truthful but ended without a usable action | Added verified, non-confidential corporate `mailto:` fallbacks while preserving the no-storage/no-success boundary | Managed persistence and delivery remain production pending |
| Corporate print | Medium | Skip-link chrome, isolated pack imagery, fragmented headings/service panels and screen-footer padding weakened PDFs | Added a 12-route PDF harness and corrected all print defects; 39 rendered pages passed and were human-reviewed | Exact-SHA rerun remains required |
| Products compact layout | High | Product-category context collapsed at 320 pixels, leaving visually empty framed surfaces | Replaced collapsed disclosure treatment with concise static context and tightened the category composition | None; complete Chromium/WebKit rerun passed |
| Oncology principle grid | High | Four principles inherited a three-column grid, producing a large phantom grey cell | Re-authored the grid as two balanced columns with a single-column mobile transformation | None; complete Chromium/WebKit rerun passed |

No critical or unresolved high visual finding remains. The mobile LCP observation is a transparent performance follow-up, not a hidden pass.

## Acceptance decision

The corporate continuation is visually accepted at working-tree level with no unresolved critical/high visual defect and no known material medium defect on the audited routes. The complete governed Node 24 root acceptance, Corporate Chromium/WebKit matrix, Corporate print/PDF suite, focused Lighthouse medians, Portal full matrix and security/supply-chain gates all pass on the final working tree. It is not yet an immutable exact-SHA or production acceptance. A committed candidate must repeat the release-critical checks from a clean checkout and pass exact-head GitHub checks before any public release. Managed workflows require their separate staging and production evidence.
