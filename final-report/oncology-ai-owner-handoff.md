# Oncology and Trusted AI Owner Handoff

- Candidate date: 22 July 2026
- Company candidate: `feature/oncology-ai-platform`, stacked on `feature/cro-services`
- Existing CRO review: [Pull Request 11](https://github.com/NovapharmHealthacre/novapharm-website/pull/11)
- Oncology and trusted AI review: [Pull Request 12](https://github.com/NovapharmHealthacre/novapharm-website/pull/12)
- Release state: draft candidate; not merged or deployed
- Production state: unchanged

## What This Candidate Adds

The company candidate adds an evidence-led public Oncology experience, a cited public search and answer layer, and a protected internal AI gateway. The public work is deliberately bounded: it does not claim current oncology products, stock, WDA(H) status, PLPI approvals, NHS supply, owned regulated infrastructure or patient services.

The Oncology page contains 2,537 visible words across 13 sections. It appears in the primary navigation after Clinical Research and before Technology. Its principal decision architecture includes six continuity axes, four formulation pathways, three sourcing routes, six readiness dimensions, five condition-control stages and a seven-stage development-to-access pathway.

## Business-Plan Evidence Control

The owner-supplied 59-page business plan was reviewed privately and represented by SHA-256 `6ab32585f9028a770a78c8963d1bece6ae22a3ee56e5ea651d8e99c20a30da88`. The plan itself is not copied into the public repository.

- Public evidence narrative: `docs/business-plan-public-evidence-register.md`
- Machine-readable claim register: `docs/business-plan-claim-register.json`
- Website gap analysis: `audit/business-plan-website-gap-analysis.md`
- Public content evidence register: `docs/public-content-evidence-register.json`

Excluded from publication are unverified authorisations, product approvals or availability, NHS supply or contracts, named Polar Speed or Marken activity, commercial partnerships, revenue and forecast figures, claimed AI or blockchain outcomes, patents, private supplier or product economics, immigration material and unverified leadership biography.

## Oncology Evidence

- Public route: `/oncology/`
- Source register: `research/oncology-source-register.json`
- Category benchmark: `research/oncology-digital-benchmark-2026.md`
- Category scorecard: `research/oncology-category-leader-scorecard.md`
- Public claims report: `audit/oncology-public-claims-report.md`
- Red-team review: `audit/oncology-ai-red-team-report.md`
- Structured data: `WebPage`, `BreadcrumbList`, `Service` and visible-content-matched `FAQPage`, linked to the canonical NovaPharm organisation entity

The seven principal evidence sources are MHRA clinical-trial and wholesale guidance, HRA Combined Review, NICE technology-appraisal guidance, NHS England's National Disease Registration Service, Cancer Research UK statistics and MHRA GDP/GMP guidance. Category and operations benchmarks are recorded separately and do not substantiate NovaPharm capability claims.

## Media Inventory And Provenance

Three commercially permitted Pexels source photographs support controlled oncology, formulation and quality contexts. Their nine AVIF, WebP and JPEG derivatives, creator pages, hashes, route limits, alt text and non-ownership disclosures are recorded in `docs/oncology-media-provenance.json` and the central asset register.

The Product Portfolio uses a separate unbranded, generated evidence scene so the oncology vial photograph remains within its two-route policy. No image claims to show a NovaPharm product, employee, laboratory, manufacturing site or distribution facility.

## Public AI Architecture

The public layer is retrieval, not an unrestricted chatbot. Thirty approved canonical sources are split into 361 governed passages and indexed by **NovaPharm Evidence Vector v1**, a repository-controlled 384-dimensional sparse lexical-semantic implementation. It has no neural weights, external inference endpoint, WASM or WebGPU dependency.

- Model register: `docs/ai-model-register.json`
- Model licence: NovaPharm-owned software; no third-party model licence applies
- Model metadata: 3,259 bytes
- Optional index, embeddings and metadata: 1,148,511 uncompressed bytes
- Initial model/index transfer: 0 bytes
- Initial AI entry script: 993 bytes
- Local hosting: all public retrieval assets are first-party and execute in a browser worker
- Privacy: queries remain in the active browser tab and are not sent to an inference provider
- Persistence: off by default; storage-denied mode remains tab-only and says so
- Citations: answers expose exact approved source passages and canonical source links
- Abstention: unsupported questions return the controlled statement that approved public evidence cannot verify the requested claim

Medical, dosage, patient, safety, live stock, private, financial, legal-personal and regulatory-status requests are refused before retrieval. Conventional navigation and the no-JavaScript `/search/` directory remain available when AI is unavailable.

## Internal AI Boundary

The secured Node runtime contains a role-gated, CSRF-protected, rate-limited internal gateway for six bounded evidence-review use cases. It is read-only, source-class aware and audit-event capable. The production provider is `none`.

An Ollama loopback adapter exists only for approved local development. It is disabled in production, permits only `127.0.0.1`, bundles no model and requires separate owner, model-licence, privacy and security approval. Forecasting, traceability analytics, stockout prediction, supplier scoring, pharmacovigilance and other higher-risk concepts remain planned, prohibited or not implemented as recorded in `docs/ai-use-case-register.json`.

## Actual Repository Validation

| Gate | Actual result |
| --- | --- |
| Node runtime | Node 24.14.0 used locally. |
| Full repository check | `npm run check` passed, including deterministic build, 37 public pages, 6 Insights articles, 5 leadership profiles, 2,715 local links, forms, portals, role isolation, backup and restore tests. |
| Oncology | 2,537 words, 13 sections, source and schema tests passed; prohibited-claims scan returned zero findings. |
| Public AI | 180-question benchmark passed: 95.6% expected-source recall, zero prohibited answers and 100% unknown-question abstention. |
| Prompt injection | Twelve focused attacks passed with zero source-bypass, system-override or exfiltration successes. |
| Performance unit gate | Initial model/index transfer is zero; the deterministic Node gate enforces p95 below 50 ms and prints the observed timing in every run. |
| Current-tree secret scan | Repository scanner passed during `npm run check`; exact-head CI repeats the scan. |
| Dependency audit | Local `npm audit --omit=dev --audit-level=high` could not reach the npm registry because DNS was unavailable. It is not reported as passed; CI must supply the exact-head result. |
| Chromium and WebKit | Exact 12-viewport, JavaScript on/off, reduced-motion, AI-state and Axe workflow is configured. Native browser launch is restricted in this workspace, so rendered evidence remains pending exact-head CI. |
| Lighthouse | No new exact-head oncology/AI median is claimed until the GitHub browser workflow completes. |

## Pull Requests And Release State

| Workstream | Base | Head | Status |
| --- | --- | --- | --- |
| Existing CRO refinement | `main` at `b43dade65e85dfc37e8d30c7989668260f255199` | `feature/cro-services` at `9b4edef895bcfddcd415a0fce43ee5c4e2ca47b3` | [PR 11](https://github.com/NovapharmHealthacre/novapharm-website/pull/11), open, draft and mergeable |
| Company Oncology and trusted AI | `feature/cro-services` at `9b4edef895bcfddcd415a0fce43ee5c4e2ca47b3` | `feature/oncology-ai-platform` | [PR 12](https://github.com/NovapharmHealthacre/novapharm-website/pull/12), open and draft |
| Personal semantic AI | Personal-site `main` | `feature/semantic-ai-experience` | Separate repository and separate draft PR; not represented by this company candidate |

The two implementation commits published before this handoff update are:

1. `312304a5005e70cd05225bb95350a54a81379899` — Add evidence-led oncology and trusted AI experience.
2. `b43ac8bfb054dbdeba93dad10aafc8ac0632810a` — Add oncology AI evidence and exact-head release gates.

The documentation update containing this live PR reference is the current PR head and is identified by PR 12 metadata. Exact-head workflow conclusions, browser totals, Axe totals and Lighthouse medians are appended only after GitHub has generated that evidence. No check is described as passed before it runs against the final head.

## Owner Review Path

1. Review Oncology in the top navigation and its first-viewport non-operational boundary.
2. Check the continuity model, formulation navigator, sourcing routes, readiness matrix and development pathway.
3. Try cited public questions, unknown questions, medical requests, storage denial and AI-unavailable states.
4. Review Responsible AI and the conventional no-JavaScript search directory.
5. Confirm the three representative scientific photographs and their non-ownership captions.
6. Inspect the owner screenshot pack and before/after comparison produced by exact-head CI.
7. Review the internal AI maturity register before approving any provider or real data.

## Owner Decisions Still Required

- Whether PR 11 may later be merged.
- Whether Oncology should remain a top-level navigation item.
- Whether any named oncology categories may be published after evidence review.
- Whether premium photography should be purchased; this candidate uses registered commercial-use assets already available under the Pexels licence.
- Whether local Ollama development should be activated and which separately reviewed model may be used.
- Whether experimental WebLLM should remain disabled.
- Whether privacy-reviewed aggregate AI query measurement may be introduced.
- Whether draft Oncology Insights briefs may enter editorial review and publication.
- Whether UK legal, regulatory and insurance reviewers approve oncology or CRO commercial engagement.

This handoff does not merge, deploy, alter DNS or change production. The candidate remains draft until the exact final head passes every required GitHub workflow and the owner separately approves the next action.
