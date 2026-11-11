# NOVA Scientific Intelligence Programme

Status: architectural proposal and internal planning-code candidate. **Not AGI, not production-ready, not a clinical tool.**
Parent: #176. Existing release/security gates remain authoritative (#433 and #439).

## Mission and research contribution

Make medicine-market intelligence scientifically inspectable: a query should yield a resolved medicine identity, rights-accepted evidence, reproducible comparisons, uncertainty-aware hypotheses, and a traceable human decision process. The differentiator is *evidence-grounded scientific reasoning*, not the assertion that a general model is AGI. Independent reproducibility and measurable benefit matter more than a marketing claim or an award goal.

## System sequence

1. **Identity first.** Match product/presentation, code system, jurisdiction and valid-time. Explicitly record unresolved matches.
2. **Source admission.** License/rights, ingestion quality, acceptance receipt, source provenance, tenant authority, time and population/units comparability. Deny by default.
3. **Investigation plan.** Produce non-executable work steps and falsifiable competing hypotheses from the existing Investigation Passport. This PR introduces that contract, not autonomous execution.
4. **Read-only tool execution.** Later integrate with server-owned approved tools, current authority rechecks, purpose-bound source rights, durable preflight audit and bounded costs; no browser-supplied grants or unrestricted model tool use.
5. **Reasoning and verification.** Use model-generated explanations only over accepted evidence, bind citations to server-owned admission records, separate observed facts/derived metrics/model forecasts/commercial assumptions/recommendations, allow abstention and log contradictory evidence.
6. **Human decision.** Require review, named approval, versioned model/evidence context and rollback. No automatic prescriptions, release decisions, procurement commitments, payments or regulatory submissions.

## Research agenda

- **Cross-source medicine identity:** dated entity resolution with expert-annotated truth sets and explicit undecidable cases. Publish precision/recall and mismatch classes.
- **Evidence-grounded reasoning:** independently graded factual support, citation validity, contradictions discovered, false-positive opportunity claims and calibrated abstention.
- **Uncertainty and forecasts:** rolling-origin backtests, baseline comparisons, horizon-specific interval coverage and drift alarms; no forecast until accepted source history exists.
- **Supply and access impact:** prospective, ethics-reviewed studies with consenting partners to measure decision quality, analyst time saved, and eventually observed access or supply continuity outcomes. Separate association from causality.
- **Reproducibility:** versioned query, effective dates, source rights, accepted datasets, model build, independent review and replicable analysis without exposing licensed information.

## Launch sequence and release blockers

| Stage | Acceptance evidence | Current boundary |
| --- | --- | --- |
| Plan | Pure deterministic, testable, non-executing planning contract | Development candidate |
| Governed sources | One rights-accepted medicine with independent source reconciliation | Pending evidence acceptance |
| Secure execution | Real authenticated two-tenant negative tests, MFA, live rights revocation, audit | Pending (#176, #433) |
| Model | Approved EU endpoint/ZDR/data rights, grounded answer, redaction and abstention tests | Pending production sign-off |
| Forecast | Accepted historical records, backtests, interval coverage and reviewer sign-off | Pending |
| Customer release | Full security scan/risk disposition, rollback, real-domain smoke and human sign-off | Blocked by current release gates (#439) |

## Minimum evaluation suite before real customers

- 100% rejection for deliberate tenant-crossing, unlicensed sources, revoked grants and missing audit services in the security test suite.
- Zero uncited factual claims in an independently reviewed launch sample; track citation correctness and abstention as separate metrics.
- Compare entity resolution to a labelled expert set, reporting false merges separately from missed links.
- Document forecast quality against naive and seasonal baselines, with calibrated prediction interval coverage and confidence limitations.
- Record model, tool, time, source, jurisdiction and right-revision metadata without storing patient personal data or raw secret prompts.
- Human review and formal medical-device intended-purpose assessment before any clinical decision-support capability.

## Safe implementation boundary for this PR

The new planner accepts an existing investigation-passport.v1 object and generates a NOVA investigation-plan.v1 object. It calls **no model, database, external service or tool**, grants no authority, projects no confidential or patient data, and keeps every investigation step blocked. Only the initial UK (GB) market is supported. The builder can later be presented by an authorised route after independent access and rights validation. This code does not resolve any outstanding infrastructure, licensing, security or production evidence gates.
