# Final Human Visual Dossier

Status: current continuation candidate under final clean-checkout acceptance; managed staging and production review pending

Review date: 13 August 2026

Candidate: `codex/post-pr53-apple-parity`, based on `f5a8d814016f2a82e89e8d44f0036892bbdeb9be`

## Evidence boundary

This dossier records genuine screenshots from local production standalone applications. Chromium and Playwright WebKit rendered the real application code with reduced motion. Portal evidence used isolated synthetic users and records. It does not prove Azure, Front Door, WAF, Entra, SharePoint, email, production data, production network performance or live-domain acceptance.

The compact retained dossier contains 62 WebP screenshots and original Playwright PNG hashes in `audit/evidence/final-visual-lock/selected-screenshot-manifest.json`. The image conversion reduced 103,060,939 source bytes to 17,663,204 review bytes without changing dimensions. Product before-and-after records are retained under `audit/evidence/final-visual-lock/products/`. The 13 August continuation adds seven lossless PNG frames for official-brand and Portal authentication review, with hashes and measured geometry under `audit/evidence/final-visual-lock/official-brand/` and `audit/evidence/final-visual-lock/portal-authentication/`.

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

No critical or unresolved high visual finding remains. The mobile LCP observation is a transparent performance follow-up, not a hidden pass.

## Acceptance decision

The prior repository candidate was visually accepted for review. The current continuation remains pending a clean-checkout rerun of the complete canonical and Chromium/WebKit acceptance suites after the identity and Portal corrections. It is not production accepted. The same accepted release must be deployed to managed staging and repeated through human, browser, accessibility, security and performance review before merge or production cutover.
