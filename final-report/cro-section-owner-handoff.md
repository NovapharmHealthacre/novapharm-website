# CRO Section Owner Handoff

Candidate date: 18 July 2026

Status: candidate ready for owner review; not merged or deployed

## What is ready

The branch adds a complete public `Clinical Research & CRO Support` route and integrates it across the existing website. The proposition is deliberately narrower than a full-service CRO: NovaPharm leads programme framing, UK pathway coordination, responsibility mapping and evidence governance, while specialist delivery and sponsor-retained duties remain explicit.

The experience includes:

- a decision-led pharmaceutical hero and immediate scope boundary;
- four target sponsor audiences and six programme fractures;
- three transparent responsibility lanes;
- an eight-stage Clinical Development Navigator;
- eight evidence-controlled service modules;
- a six-route Sponsor Decision Framework, including an explicit no-fit route;
- a four-step engagement pathway and five quality principles;
- technology, therapeutic-focus and development-continuity boundaries;
- verified portraits for Vishal Chakravarty and Dr Girish Shantilal Achliya;
- related Insights, six FAQs and seven official sources;
- responsive local media, no-JavaScript usability and contextual contact routing.

The final page contains 1,478 visible words. That is 25.9% fewer than the previous candidate while retaining every required decision pathway, responsibility boundary and evidence disclosure. Its rendered desktop height reduced from 16,787 px to 12,823 px; the 320 px WebKit height reduced from 33,362 px to 25,797 px.

## Evidence index

- Benchmark: `research/cro-digital-benchmark-2026.md`
- Category scorecard: `research/cro-category-leader-scorecard.md`
- Capability claims: `docs/cro-capability-evidence-register.md`
- Media provenance: `docs/cro-media-provenance.json`
- Red team: `audit/cro-red-team-report.md`
- Blind comparison: `audit/cro-blind-comparison.md`
- Public claims: `audit/cro-public-claims-report.md`
- Browser: `audit/cro-browser-report.md`
- Accessibility: `audit/cro-accessibility-report.md`
- Performance: `audit/cro-performance-report.md`
- SEO/GEO: `audit/cro-seo-report.md`
- Integration: `audit/cro-integration-report.md`
- CI diagnosis: `audit/cro-final-ci-diagnosis.md`
- Owner review manifest: `audit/evidence/cro-owner-review/manifest.json`
- Before/after comparison: `audit/evidence/cro-owner-review/before-after-comparison.jpg`
- Media contact sheet: `audit/evidence/cro-owner-review/media-contact-sheet.jpg`

## Owner review path

1. Review the `/cro/` hero and **Scope stated plainly** boundary.
2. Confirm the three delivery lanes match the intended commercial model.
3. Test the Clinical Development Navigator and all six Sponsor Decision Framework routes, including the conventional-CRO no-fit route.
4. Review the conceptual scientific media, approved leadership portraits and captions for possible misinterpretation.
5. Follow the CRO CTA to Contact and confirm the enquiry language.
6. Inspect Home, Services, Regulatory, Partners and Technology for the new contextual links.
7. Approve or reject the public label **Clinical Research & CRO Support**.

## Required before commercial use

- Confirm an internal capability owner and engagement-qualification process.
- Obtain UK legal and insurance review for paid clinical-research coordination.
- Approve the public page and visual assets.
- Do not add named partners, clients, metrics, trial history, testimonials or logos without evidence and written permission.

## Final repository validation

| Gate | Actual result |
| --- | --- |
| Lockfile install | `npm ci --ignore-scripts` completed; 266 packages audited, 0 vulnerabilities. |
| Node 24 readiness | `npm run check` passed on Node 24.14.0. |
| Public build and validation | 35 public pages, 6 Insights articles, 5 leadership entities and 2,306 local links passed. |
| CRO contracts and claims | Passed structural, evidence-boundary, schema, contact-routing and public-claims tests. |
| Application integration | Contact, account, all portal roles, password change, sessions, customer isolation, Entra mapping, uploads and backup/restore passed synthetic tests. |
| Focused CRO browser acceptance | 170 Chromium/WebKit rendered cases and 168 Axe scans across 12 viewports plus no-JavaScript states; 0 issues. |
| Complete route-matrix acceptance | A local rehearsal of the six isolated Chromium/WebKit shards completed 2,280 page inspections, 2,280 Axe scans and 348 curated screenshots with 0 issues. The GitHub aggregate gate independently requires the same coverage, exact final-head identity, clean checkouts and successful synthetic-runtime cleanup. |
| Lighthouse | Three mobile and three desktop runs scored 100/100/100/100; median mobile LCP 1.504 s and desktop LCP 0.404 s. |
| Dependency audit | `npm audit --omit=dev --audit-level=high` found 0 vulnerabilities. |
| Current-tree secret scan | Repository scanner passed 862 repository files; repository-only Gitleaks scanned the exact committed tree (59.67 MB) with 0 findings. Ignored dependencies, Git objects and external caches were excluded. |
| Reachable-history secret scan | Gitleaks scanned the complete reachable history through the candidate revision with 0 findings; the exact remote head is scanned again by the pull-request workflow. |
| Clean-checkout reproduction | Fresh detached worktree, Node 24 lockfile install and full `npm run check` passed; regeneration produced no diff and the CSS bundle hash remained identical. |

These are repository and local-runtime results. Exact final-head GitHub workflow results are added to Pull Request 11 after the candidate commit is pushed.

## Release boundary

This handoff does not merge, deploy or change production. The review branch is intended for a draft pull request. Production must remain unchanged until the owner separately approves merge and deployment.
