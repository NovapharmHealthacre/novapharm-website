# Final Human Visual Dossier

Status: repository candidate accepted; managed staging and production review pending

Review date: 7 August 2026

Candidate: Draft PR 16 on `codex/unified-digital-estate-foundation`

## Evidence boundary

This dossier records genuine screenshots from local production standalone applications. Chromium and Playwright WebKit rendered the real application code with reduced motion. Portal evidence used isolated synthetic users and records. It does not prove Azure, Front Door, WAF, Entra, SharePoint, email, production data, production network performance or live-domain acceptance.

The compact retained dossier contains 62 WebP screenshots and original Playwright PNG hashes in `audit/evidence/final-visual-lock/selected-screenshot-manifest.json`. The image conversion reduced 103,060,939 source bytes to 17,663,204 review bytes without changing dimensions. Product before-and-after records are retained under `audit/evidence/final-visual-lock/products/`.

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
| Corporate trust route | High | The required canonical Trust Centre did not exist | Added a substantive Trust Centre, metadata, footer route, schema coverage and browser coverage | Managed-service assurance remains pending live evidence |
| Status scenarios | Medium | Maintenance and incident visual states lacked deterministic acceptance coverage | Added normal, activation, maintenance and incident fixtures, screenshots and tests | Live incident integration remains pending |
| Portal visual states | Medium | Several asserted interaction states lacked named retained captures | Added 18 interaction screenshots and 18 Axe scans across both engines | Live Entra and production session expiry remain pending |
| Founder mobile capture | Low | One in-app screenshot encoding attempt was invalid | Discarded it and retained a valid independent Playwright Chromium capture | No application defect |
| Public mobile LCP | Medium | Lab LCP was 2.60-2.68 seconds against a 2.5-second target | Transfer, CLS and blocking work remain controlled; scores are 97 | Recheck on accepted staging and use field data before claiming target attainment |

No critical or unresolved high visual finding remains. The mobile LCP observation is a transparent performance follow-up, not a hidden pass.

## Acceptance decision

The repository candidate is visually accepted for review. It is not production accepted. The same release must be deployed to managed staging and repeated through human, browser, accessibility, security and performance review before merge or production cutover.
