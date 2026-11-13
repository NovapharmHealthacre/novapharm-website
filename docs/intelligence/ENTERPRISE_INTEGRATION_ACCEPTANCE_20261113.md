# Enterprise integration acceptance: operations, security, research and NOVA

**Status:** proposed integration and verification contract; **not a production acceptance**  
**Baseline:** 2026-11-13 GitHub main `ec828468e03f24413ef798609b9ac4961e01c6b7`, read-only AWS eu-north-1, MongoDB Atlas project inventory  
**Owner:** NovaPharm Intelligence; independent Security, Regulatory, Data Steward and Product approvers required.  
**Parent:** #176; upstream release/security gates #433, #439, #451, #497, #517 and open PRs.  

This document sets one integration contract for four **distinct** tracks: (1) Foundry-like operations, (2) Prisma-like defensive controls, (3) Bloomberg-like pharma analytics, and (4) evidence-grounded NOVA. Names indicate **design inspiration only**. No Palantir Foundry, Palo Alto Prisma Cloud, Bloomberg Terminal/API or artificial general intelligence is claimed to be licensed, connected, tested or deployed.

## Verified read-only baseline (2026-11-13)

- AWS eu-north-1: `novapharm-intelligence-private-terminal-candidate` image Lambda reports Active, last update Successful; this is **not** authenticated end-to-end user acceptance.
- ECS `novapharm-intelligence-production` reports Active **with zero running tasks and zero active services**; no ECS production serving capability is inferred.
- ECR `novapharm/intelligence/production` exists and scans on push. **2026-11-13 follow-up:** active Intelligence Lambda digest `sha256:2fb771965c697b0121957a3e7bb7c71312b19c2cd9e127e4236e8bbdcd4b49a9` has ECR basic image scan status `COMPLETE`, with **zero reported findings** at that digest. This supersedes the previously reported vulnerable *deployed* digest but does NOT establish full image reachability, runtime or independent security acceptance. #439 remains open pending exact ECS candidate, staging-negative tests and owner review.
- MongoDB Atlas `NovaPharm Intelligence Production` project has `npi-bootstrap` FREE cluster, IDLE in AWS `EU_NORTH_1`. **Read-only counts taken 2026-11-13:** `npi_source_registry` = 4; `npi_source_rights`, `npi_medicine_identity`, `npi_medicine_evidence`, `npi_evidence_manifests`, `npi_ingestion_runs`, `npi_audit_events` = **0 each**. The 4 registry records are not data-rights approvals or admitted medicine facts. Do not infer a working medicine journey. FREE means do not assert production-scale resilience, capacity or SLA without tested architecture.
- CloudTrail `novapharm-staging-audit` is logging management events and write-only S3 object events on the Intelligence evidence bucket. Confirm coverage of all relevant accounts, regions, workloads, data reads and exports separately.
- AWS Security Hub `DescribeHub` and GuardDuty `ListDetectors` were **explicitly denied by an organization service-control policy**. Treat as **unknown coverage**, never as an enabled control.
- Existing #176 and #451 explicitly leave end-to-end evidence, rights, NOVA and launch gates incomplete. Do not substitute documentation or an unmerged PR for live deployment evidence.

## Shared contract and fail-closed admission rules

`source_id`, `source_version`, `source_rights_decision_id`, `ingestion_manifest_digest`, `canonical_medicine_id`, `valid_from`, `valid_to`, `tenant_id`, `purpose`, `entitlement_id`, `evidence_ids[]`, `transformation_version`, `policy_version`, `trace_id` and `issued_at` must be carried across protected requests or resolved by a trusted server. All identifiers are typed and independently validated; never accept client-supplied tenant or entitlement as authority.

Data goes through **quarantine -> rights review -> identity evaluation -> approved transformation -> atomic private admission -> indexed read model -> governed API -> NOVA / analytics UI**. A failed, absent, revoked or out-of-window decision blocks read, embedding, model egress, export, API delivery and customer exposure. Preserve source granularity: prescribing is not dispensing, purchasing, sales or stock.

Security controls: independently verified Cognito/Entra issuer, audience, nonce, fresh MFA, organization+tenant role checks and purpose restrictions; resource-level allowlists; TLS, KMS, least privilege, separate commerce and Intelligence writers, no public administrative routes, bounded query budgets, audit with integrity guarantees, retention/deletion policy and explicit revocation. No external email, procurement, regulated filing, paid service activation, payment charge or customer-data mutation by NOVA.

An answer must return: evidence manifest and document citations, source date/region/units, transformation/model version, missingness/conflicts, uncertainty or abstention. Evidence isn't a claim of legal rights or regulatory approval.

## Track A — Foundry-like governed data operations

**Build:** time-aware medicine ontology (VTM/VMP/AMP/VMPP/AMPP, SNOMED, dm+d; other geographies only after lawful rights); versioned transformations; replayable ingestion; strict identity mapping evaluation and unresolved queue; lineage from output to approved source; row/field/tenant entitlements; operator failure, freshness, quality and exception views.

**Pass criteria:** (1) independent gold-label dataset and mapping precision/recall/confusion report; (2) replay of a frozen source reproduces output digests; (3) rights revocation makes all protected retrieval and embedding routes deny; (4) wrong tenant/purpose or revoked subject denies even with guessed IDs; (5) drilldown from displayed metric to immutable manifest, source rights and code/version; (6) backups restored in isolation.

**Vendor connection:** optional, behind a separately approved Palantir procurement/licensing, security, DPA, export and networking review. Do not implement an unauthorized Foundry endpoint.

## Track B — Palo Alto-level cloud defense

**Build:** AWS-native current-state security first, with documented optional Prisma Cloud evaluation. Confirm image scanning by *deployed digest*, supported runtime and CVE disposition; scoped IAM and negative tests; complete CloudTrail and S3 data event coverage; security telemetry alerts, incident playbooks, cost ceilings, rollback tests and independent penetration testing. Use approved CSPM/CWPP only if deployment and data processing are licensed.

**Pass criteria:** (1) #439 HIGH findings remediated on the exact running digest or recorded exception approved by accountable security owner with reachability evidence and expiry; (2) least-privilege, cross-tenant, anonymous, expired token, revoked MFA, commerce-to-evidence write-denial tests pass; (3) detection canary demonstrably alerts, assigns owner and records closure; (4) CloudTrail, detector and central findings inventory documented; (5) backup/restore, rotation and rollback exercised; (6) no SCP bypass attempt. Security Hub and GuardDuty inspection currently blocked by org policy, so coverage is **unverified** until organization administrator provides approved evidence.

## Track C — Bloomberg-like research terminal

**Build:** official lawful datasets with recorded source rights; pharma-specific entity, event, exchange, currency, medicine, manufacturer, drug approval and jurisdiction mapping; immutable historical series; market clocks/freshness; entitlement-aware watchlists; alerts with reproducible filters and date/units; differentiation between actual observations, estimates and scenarios. No fictional live ticks, subscriptions or stock alerts.

**Pass criteria:** (1) test fixtures against source totals and corporate actions when applicable; (2) visible as-of time, delay and currency; (3) alerts idempotent, scoped by tenant and link to evidence; (4) each metric's observed/derived/synthetic/forecast status is explicit; (5) unlicensed Bloomberg data is inaccessible; (6) vendor-native API integration only after contract, authorization, entitlements and enterprise network review.

## Track D — NOVA governed pharmaceutical research agent

**Build:** tool use constrained to approved, read-only schemas and bounded deterministic retrieval; planner and executor isolated; citations linked to admitted source versions; conflict checking; medical safety disclaimers; rate, cost and context limits; human review for consequential decisions. Do not label this AGI.

**Pass criteria:** (1) expert-authored benchmark with accepted/rejected, stale, contradictory and insufficient source cases; (2) zero cross-tenant or unlicensed-content exposures in negative authorization suite; (3) verifiable citation precision and false-assertion, abstention, calibration scores with predeclared thresholds; (4) prompt-injection and exfiltration adversarial red-team; (5) auditable model/version and approved data egress controls; (6) reproducible head-to-head against retrieval-only baseline; (7) owner review before any production decision.

## Cross-track release checklist (all mandatory)

- [ ] Approved architecture authority maps AWS, Atlas, identity, DNS, API origins, retention, tenancy, billing, secrets and rollback; resolves older Azure ADR.
- [ ] Legal/RP/data-steward source and AI use rights reviewed for each corpus and each output market; unreleased NHSBSA evidence stays quarantined.
- [ ] Exact deployed digest, staging health, MFA enrollment and login, evidence readback, cross-tenant deny and source-revocation tests pass.
- [ ] #439 deployment CVE findings closed with evidence; Security Hub/GuardDuty organization-level visibility explicitly established or compensating controls approved.
- [ ] Canonical identity + accepted real source journey meets #176 G1–G5; no synthetic business observations claimed as real.
- [ ] Foundry-like ontology lineage, replay and permissions end-to-end tests pass.
- [ ] Bloomberg-like licensed/public source adapter, historical data, watchlist and alert acceptance tests pass.
- [ ] NOVA evaluator and model governance independently signed off; no claim of real AGI.
- [ ] All required current-head CI, code/security scans, private browser acceptance, accessibility, load, restore and rollback evidence linked.
- [ ] Product, Regulatory, Security and data-rights owners approve a release record and observed customer staging journey; production promotion is a separate change.

## Evidence recording template

For each gate, record `gate_id`, `owner`, `artifact_url`, `git_sha`, `aws_resource_id`, `image_digest`, `test_run_id`, `timestamp_utc`, `environment`, `source_rights_decision_id`, `negative_test_result`, `rollback_artifact`, `independent_reviewer`, `decision` and `expiry`. Never put secrets, credentials, raw patient data or proprietary licensed data into GitHub evidence.

## Decision boundary

This document is **a concrete engineering/release acceptance artifact**, not proof of vendor integrations or 100% completion. Build, review and test in isolated stages, and keep the existing working production resources unchanged until current-head acceptance and explicit change authority.
