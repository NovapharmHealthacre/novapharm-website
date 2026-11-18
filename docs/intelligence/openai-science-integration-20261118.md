# NovaPharm Intelligence — scientific research experience derived from OpenAI Science
**Reviewed:** 18 November 2026. **Scope:** protected Intelligence web portal + isolated Expo iOS/Android candidate. **Release:** draft source code only, not live models, research data or production apps.

## Source assessment
- OpenAI Science is a capabilities and research overview, not a directly callable API or rights licence: https://openai.com/science/
- The six capabilities map into NovaPharm’s existing Evidence, Biotech Intelligence, Reports, Decision Workspace, Medicine Search and scientific R&D journeys: literature, reproducible data/code, scientific modelling, external research-tool connections, hypotheses/experiments and research operations.
- The associated medicinal-chemistry work had human scientist steering, actual lab experiments and separate validation. The research should not be presented as a general-purpose automatically reproducing drug-synthesis engine: https://openai.com/index/ai-chemist-improves-reaction/
- GPT-Rosalind is available only under OpenAI’s trusted-access/eligibility and separately approved API access; this repository has no proof of eligibility, access, credentials or an approved model deployment: https://openai.com/index/introducing-gpt-rosalind/ and https://help.openai.com/en/articles/20001193-gpt-rosalind-for-life-sciences-research
- Developer API interfaces and restrictions must be independently reviewed, including Responses API, function calling, retrieval and server-side tool boundaries: https://developers.openai.com/api/docs
- The Science page, GPT-Rosalind and the Life Sciences plugin are distinct products/surfaces. A ChatGPT plugin cannot be presumed to execute within an unauthenticated public web/mobile app, and external OpenAI research findings do not confer copyright, model access or clinical validity.

## November 2026 source-rights correction: GPT-Rosalind-6 Research
Official access policy (verified 18 November 2026): https://help.openai.com/en/articles/20001193-gpt-rosalind-for-life-sciences-research ; system card: https://deploymentsafety.openai.com/gpt-rosalind-6 .

- GPT-6 Rosalind Research is a restricted trusted-access tier. The API model identifier **`gpt-6-rosalind`** is usable only in an explicitly approved OpenAI API organisation with separate Research-tier permission. A Discovery-tier or general OpenAI model approval does not confer Research access.
- **Critical boundary:** OpenAI limits GPT-Rosalind API access to approved **internal** research tools/workflows/applications. Its API is **not available for customer-facing products or external commercial applications** at this time. NovaPharm must never proxy the restricted model through its customer portal, public web/API, or externally distributed mobile app. Publishing UI for learning about research is a different operation from allowing model access.
- Approved researchers may use allowed first-party ChatGPT Work/Codex deployments subject to the agreement and current access controls. Rosalind Workbench, a plugin, ChatGPT models, Codex and the separately approved API are distinct product surfaces; none is enabled merely because another exists.
- `gpt-6-rosalind` is **catalogue/reference metadata only** in this branch. No backend invocation, vendor key, institution application, acceptance, laboratory action or mobile model release is implied.
- OpenAI does not currently provide this restricted model through Amazon Bedrock; existing AWS infrastructure cannot establish eligibility. Data-handling, residency, retention, BAA and ZDR need agreement-specific verification; `store:false` is not a zero-retention certification.
- The specialist biological research model has elevated biosecurity safeguards. Any future internal implementation requires genuine researcher identity, least-privilege, qualified scientific review, abuse prevention, evaluations, incident response, user training and explicit model/tool scopes. Do not expose actionable wet-lab protocols, patient data or controlled confidential research through this preview.

## Cross-workspace engineering DNA
The scientific research catalogue is shared by the protected web experience and the isolated iOS/Android native candidate; each of the six workflows declares links to existing canonical workspaces, with no additional canonical workspace falsely counted as the 23rd. The web links preserve the existing SSR portal session gate; the mobile links open offline prerequisites only.

The source-only `scienceGovernanceForWorkspace(slug)` applies invariant controls to **all 22** canonical Intelligence workspace slugs, including provenance, retraction/contradiction review, reproducibility, scientist oversight and prohibition on automatic clinical decisions. This is an auditable design contract, **not runtime enforcement of authenticated sessions**. Production deployment must enforce the same invariants at each trusted server operation (with actual source manifests and independent auth), never by trusting values sent by web/mobile clients.

The `assessRosalindResearchBoundary()` function always reports `modelCallAuthorised:false`, even if a caller passes purported approval flags. For the customer/external portal, this restriction is mandatory and cannot be lifted by a successful test. A future approved *separate internal* service needs independent regulatory/legal review and a distinct trusted execution boundary, rather than changing UI metadata.

## Repository implementation in this draft
1. `docs/intelligence/science-research-capabilities-20261118.json`: six common workflow definitions and exact release-gate states, consumable by web and native mobile without provider keys.
2. `src/core/intelligence-science-research-contract.mjs`: deterministic, bounded planning-only source-reference contract. Rejects malformed identifiers, arbitrary strings and duplicate references; denies model activation/production promotion.
3. Protected portal deep link `/portal/executive-platform/medicines-intelligence/science-lab/`: server-session and board-role protection inherited from existing portal route. No new public API is exposed. Surface is a research workflow catalogue, not a powered-up GPT-Rosalind workspace.
4. Expo iOS/Android candidate: Science tab reading the same catalogue, no network, no secrets, no patient data.
5. Unit tests and exact-head CI guard the status and routing contracts.

## Architecture needed for actual model and scientific data
Client (web/iOS/Android) -> existing Cognito MFA / protected tenant session -> server ABAC and source-purpose/AI-use rights checker -> immutable approved evidence index -> policy/redaction gate -> server-only Responses API adapter -> model output quarantine -> exact citations and counter-evidence review -> qualified scientist's approval -> separately controlled publication/export.

Before network calls: verify account eligibility and terms for the selected model, approved regional processing/retention, source AI-use and commercial rights, tenancy, API spend ceiling and alerts, data minimisation, content controls and existing NOVA provider configuration. Never put `OPENAI_API_KEY` or provider credentials in a web bundle or app; never treat `store:false` as a legal or contractual zero-retention guarantee.

## Research workflows mapped to NovaPharm
| Science workflow | NovaPharm existing modules | Initial use case | Blocked until |
| --- | --- | --- | --- |
| Literature & evidence | Evidence, Medicine Search, Biotech | PubMed/Europe PMC/ClinicalTrials discovery with source citations | Publisher/API rights, full text restrictions, provenance |
| Data analysis & code | Observed Market, Reports, Nova ML | Reproducible NHSBSA and research dataset investigations | Accepted full data, source rights, sampling/QA and audit |
| Scientific modelling | Biotech, Nova ML | Investigate candidate molecule/protein models and assumptions | Scientific validation, tool licences, expert review |
| Research tools | Global 101-source programme | Rights-aware source adapters and notebooks | Exact publisher contracts, source/purpose grants, secure backend |
| Hypotheses & experiments | Decision Workspace, Biotech | Hypothesis register and proposed validation tests | Qualified investigator approval, lab safety/ethics and reproducibility |
| Research operations | Reports, Decision Workspace | Evidence-led studies and research briefs | Document licensing, reviewer and release controls |

## Not evidence of production
The 101 national/global source entries are metadata candidates, not 101 connected APIs. Existing draft PRs #807, #812, #813 and #814 are stacked and require reconciliation. This follow-on branch deliberately builds on #814 without merging or activating the chain. No chemical synthesis procedure, individualized medical advice, clinical recommendation, model-inferred factual claim, patient record, external source call, or commercial market prediction is created. No cloud resources or paid APIs are provisioned.

## Acceptance checklist before sign-off
- Separate eligibility + contract review for model and relevant country data; signed source-rights/AI-use approvals.
- Evidence identifier crosswalk, completeness and source-snapshot QA; retractions, publication date and disagreements.
- Strong server-side tenant isolation, MFA, request quotas, no raw prompt log, audit and revocation.
- Real model output safety/evidence evaluation, abstention and unsupported-citation tests, protected red-team.
- Web browser and native device accessibility, Android TalkBack/iOS VoiceOver, keyboard/focus, RTL, small screens.
- Exact-head CI, protected API and staging smoke tests, verified app signing, store review and public deployment separately.
