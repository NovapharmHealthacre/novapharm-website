# Vendor-neutral, no-new-budget production plan — 14 November 2026

## Decision and boundaries

NovaPharm owner decision: **No enterprise vendor accounts; implement vendor-neutral capabilities first. No approved monthly AWS/Atlas infrastructure budget.**

Current release state: **PRIVATE ENGINEERING AND TESTING ONLY. Not customer production acceptance, purchase authority, source-rights approval, or permission to activate new AWS/Atlas services.**

The accompanying owner constraints JSON, static validation module and GitHub CI workflow block changes to the repository's agreed default-off flags. They are *not* an IAM, financial, legal or runtime permission system; direct cloud modifications and payments need independent real-world controls.

## Capability plan

| Workstream | Vendor-neutral plan | Production proof required |
|---|---|---|
| Foundry-like operations | Existing governed medicine graph, Atlas read adapter, deterministic source lineage and operator dashboard | First real rights-approved medicine, mapping replay, per-record evidence and cross-tenant denial |
| Prisma-like security | AWS IAM, CloudTrail, existing CloudWatch alerts, ECR scans, vulnerability remediation and incident response | Deployed immutable digest, negative tenant/security tests, alert drill, restore, independent security approval |
| Bloomberg-like research | Observed time-series from lawful public pharmaceutical data, source/units/geography/date labelling, watchlists and alerts | Reproducible actual observations, rights acceptance, idempotent alert and tenant scoped evidence |
| NOVA | Read-only, evidence-grounded model/tool boundary with expert tests and mandatory abstention | Citation accuracy, conflicting/stale evidence, tool safety, data egress and independent evaluator signoff |

Native Palantir, Palo Alto Prisma Cloud and Bloomberg connections are **optional future integrations**. The system must not claim they are connected.

## Work authorised now: no new paid or customer-facing activation

1. Finish checks and review on GitHub PR #591 (Foundry scope compatibility, dormant without vendor accounts) and PR #595 (the four source-backed internal views).
2. Continue current-repository tests, source mapping and evidence provenance, session and role authorization tests, and read-only existing infrastructure inspection.
3. Develop a cutover design under issue #601 for the unified portal, preserving existing Nutraxin staging traffic and requiring a durable private session/backend, separate login callbacks and a reversible domain mapping.
4. Prepare independent dataset/terminology rights decisions for NHSBSA, BNF, SNOMED CT, dm+d, ClinicalTrials.gov, openFDA and ONS before any real ingestion or external model egress. Issue #454 is the first Apixaban gate.
5. Produce a **cost estimate only** from existing service inventory and published price lists. Separate one-time, fixed monthly and usage-variable spend. Include backups, secure runtime, logging, security monitoring, data retention and taxes. Do not invent or assume a budget.
6. Keep customer signups, commerce, subscriptions, external email, billing, real medicine-data admission, native vendor requests and DNS cutover default OFF.

## Release phases

**R0 — Source and tests (permitted):** exact-commit static CI, negative permissions, source rights design, evidence view contracts, existing private runtime safety checks. Passing tests do not prove a real paid or data release.

**R1 — Cost and security owner approval (blocked):** owner approves a *specific* monthly cost cap after seeing itemised AWS/Atlas operating costs, plus security, identity, backup and rollback requirements. No new billable resource before this approval.

**R2 — First real Medicine Terminal pilot (blocked on source rights):** one authentic, approved Apixaban identity and observation with source digest, provenance and governed internal reference; prove two-tenant access/revocation, audit, replay and negative tests. Metadata-only and synthetic fixtures do not qualify.

**R3 — Unified portal production cutover (blocked):** dedicated protected ingress and backed-up transactional backend for customer, employee, board and administrator workspaces, independently validated Cognito/Entra MFA and callback/cookie domains. Preserve Nutraxin commerce via an explicit route and tested rollback. Never map the current portal hostname directly to the Intelligence IAM catch-all.

**R4 — Paid customer launch (separate approval, blocked):** customer/commercial and regulated product rights, owner-approved pricing, VAT/legal, identity entitlements, tested order/payment/refund and source governance, security, incident response and independent release signoff.

## Who needs to act

Engineering can proceed with R0 without a new vendor or budget decision. The owner does **not** need to purchase Palantir, Palo Alto or Bloomberg accounts for the vendor-neutral pilot.

Owner action needed later: approve a documented monthly AWS/Atlas cap after cost review; name independent regulatory/rights and security reviewers; approve a reversible unified portal cutover when accepted. Neither a GitHub PR nor this plan substitutes for those decisions.

## Release blockers and record

- Issue #601 — production portal domain currently routes to Nutraxin staging; unified customer workspace misroute
- Issue #454 — first real Apixaban medicine data and terminology rights review
- Issue #497 — six real read-only pilot workflows
- Issue #517 — integrated identity, evidence and enterprise governance
- Issue #439 — deployed image and runtime security acceptance
- Issue #176 — 22-module Medicines Terminal completion
- Issue #55 — managed AWS production cutover and rollback
- Issue #433 — separate customer subscriptions/payment launch

**No claim of 100% production acceptance until independently verified runtime + source/legal + security + cost + owner evidence exists.**
