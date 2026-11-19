# NovaPharm Intelligence — 22-workspace implementation and release baseline
**Inspection date:** 14 November 2026  
**Scope:** private Intelligence production data store, repository workspaces, six shared capabilities.  
**Authority:** issues #176, #497, #517, #454. **Not a production-launch approval.**

## Verified distinction
The canonical Portal catalogue in `apps/portal/data/intelligence-workspaces.ts` defines **22 navigation workspaces**, of which **5** are repository read-only foundations and **17** are dependency-gated. A visible route, discovery card, research draft or static UI does not prove a live customer-facing module.

Direct connected MongoDB Atlas read on 2026-11-14:
- Project: `NovaPharm Intelligence Production`, cluster: `npi-bootstrap`, database: `novapharm_intelligence_production`.
- `npi_source_registry=4`: NHSBSA EPD, ONS Population, openFDA and ClinicalTrials.gov.
- `npi_source_rights=0`, `npi_medicine_identity=0`, `npi_medicine_evidence=0`, `npi_ingestion_runs=0`, `npi_evidence_manifests=0`, `npi_audit_events=0`.
- Each source is marked pending a rights review, and all four have `accepted_observations=0` and `customer_publish_approved=false`. Metadata-only source records are not rights grants.
- These counts are a point-in-time inspection, not continuously verified or independently signed release receipts.

Historical local-private-cloud validation evidence (including 18,374,449 June 2026 EPD rows in the *local* isolated database) is **not** production Atlas admission or accepted commercial source rights. No local copy is automatically deployable.

## One platform, six shared capabilities
Each workspace must share the same underlying versioned identity, source rights, tenant ownership, audit and revocation controls. The six capability evidence contracts are:
1. Medicine Knowledge Graph — dated molecule/product/presentation mappings and unresolved matches.
2. Data Operations & Governance — publisher rights, hash, provenance, exact ingestion reconciliation, freshness and revocation.
3. Supply & Tender Intelligence — verified stock/shortage, eligibility, tender source, award and price provenance.
4. Biotech & Capital Intelligence — as-of trial, asset, company, event and finance evidence.
5. Research Evaluation — expert benchmarks, citations, contradictions, abstention, model and agent safety.
6. Enterprise Operations — real MFA-backed isolated tenants, secure APIs, reporting, monitoring, incident response and restore.

`src/core/intelligence-22-workspace-readiness.mjs` explicitly maps the 22 canonical routes to these six capability contracts. `assessIntelligence22Workspaces` accepts only a source-evidence-count snapshot plus a separate six-capability candidate report. It returns missing checks and repository implementation states. It **always** reports `productionLive=false`, `customerReleaseApproved=false`, and `productionAccepted=false` for each module; independent runtime attestation must occur outside this read-only assessment.

## Execution order
**P0, shared runtime:** finish the separately controlled Cognito MFA pilot; verify two real distinct isolated identities and denial/revocation without enabling customer subscriptions or medicine access. Close the AWS/Atlas vs historical Azure/SQLite data-authority split and use a single canonical private service.

**P0, one accepted medicine:** start with Apixaban, in this order:
1. Independently document publisher and embedded-terminology rights, exact permitted use, geography, AI/redistribution scope, expiry/revocation, and legally required attribution. No entitlement is inferred from public discovery.
2. Independently verify the exact immutable source object, timestamp, size, full SHA-256 and low-cost ingestion/resource preflight before any bulk download.
3. Accept the dated canonical medicine identity with explicit ambiguous/rejected matches.
4. Run bounded, fully reconciled non-sample source ingestion into quarantined staging; record run ID, source rights and manifest.
5. Promote only after a separate authorised audit transaction, revocation checks and accepted production proof.
6. Demonstrate six private read-only workflows for the same medicine and period: **Search, Overview, Identity, Evidence, Observed Market, Geography**. Evidence remains gated until real rights-approved citations exist. No fake market, supplier, stock or trial outcomes.
7. Test reproducible source-identity query, tenant isolation, no unapproved downloads or AI egress, source revocation, stale evidence, no-match/partial data and rollback.

**P1, after shared pilot:** implement and accept Market Structure, Forecasts, Signals, Medicine Tape, Supply, Regulatory, Pricing & Reimbursement, Tenders, Portfolio, Biotech, Capital, Decision Workspace, Watchlists, Alerts, Reports and Private Commercial. Each must use the *same* canonical identity and evidence/tenant layer, rather than separate ungoverned datasets.

**Cross-cutting release gates:** independent source-rights review; managed database authority; authenticated two-tenant smoke; exact-head CI and Chromium/WebKit tests; performance/security, reconciliation, full provenance, dated negative tests, backup/restore, private owner acceptance and exact immutable deployed SHA. Do not enable billing, customer access or medicine-data publication merely because a check passes in GitHub.

## Contract verification
Run:
```sh
node --test scripts/test-intelligence-22-workspace-readiness.mjs scripts/test-intelligence-unified-capability-evidence.mjs
```
The CI workflow `Intelligence 22 workspace evidence contracts` enforces a one-to-one map to the canonical 22 workspace routes, exactly six first-medicine pilot routes, no implicit source admission from metadata, all missing-gate states and failure-to-promote behavior even with full candidate receipts.

## Non-goals
No bulk unapproved ingestion, paid infrastructure, outbound licence/supplier/customer email, customer invoices, live payment activation, regulatory filing, autonomous bidding, AI use of unlicensed third-party terminology, invented acceptance percentages or claim that any of the 22 modules is live simply because a route exists.
