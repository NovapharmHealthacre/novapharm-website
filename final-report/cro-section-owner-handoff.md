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
- an eight-step operating model and eight quality principles;
- technology, therapeutic-focus and market-continuity boundaries;
- related Insights, ten FAQs and seven official sources;
- responsive local media, no-JavaScript usability and contextual contact routing.

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

## Owner review path

1. Review the `/cro/` hero and **Scope stated plainly** boundary.
2. Confirm the three delivery lanes match the intended commercial model.
3. Test the Clinical Development Navigator and all six Sponsor Decision Framework routes.
4. Review therapeutic focus wording and image captions for possible misinterpretation.
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
| Node 24 readiness | `npm run check` passed on Node 24.18.0. |
| Public build and validation | 35 public pages, 6 Insights articles, 5 leadership entities and 2,300 local links passed. |
| CRO contracts and claims | Passed structural, evidence-boundary, schema, contact-routing and public-claims tests. |
| Application integration | Contact, account, all portal roles, password change, sessions, customer isolation, Entra mapping, uploads and backup/restore passed synthetic tests. |
| Browser acceptance | 170 Chromium/WebKit cases and 168 Axe scans; 0 issues. |
| Lighthouse | Mobile and desktop 100/100/100/100; median mobile LCP 1.503 s; desktop LCP 0.404 s. |
| Dependency audit | `npm audit --omit=dev --audit-level=high` found 0 vulnerabilities. |
| Current-tree secret scan | Repository scanner passed 821 files; Gitleaks scanned 3.50 GB with 0 findings. |
| Reachable-history secret scan | Gitleaks scanned all 50 reachable commits with 0 findings. |
| Clean-checkout reproduction | Fresh detached worktree, Node 24 lockfile install and full `npm run check` passed; regeneration produced no diff and the CSS bundle hash remained identical. |

These are repository and local-runtime results. GitHub workflow results are added to the pull request after the final head is pushed.

## Release boundary

This handoff does not merge, deploy or change production. The review branch is intended for a draft pull request. Production must remain unchanged until the owner separately approves merge and deployment.
