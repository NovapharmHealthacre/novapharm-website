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


## 18 November 2026: Nine reviewed OpenAI source URLs, seven research methods

The user supplied ten URL occurrences: one immunology URL appeared twice. The deduplicated **nine** references and original URLs are frozen in `docs/intelligence/openai-science-methods-20261118.json`. Of these, **seven** are research examples and **two** are changing discovery indexes (OpenAI homepage and Science newsroom). Nothing is scraped, auto-subscribed, or executed from these websites. The Science newsroom's changing articles must be separately re-reviewed before their methods can be used. A visible reference is not a licence to copy full text into model context or train models.

| Original report | Valid transferable research pattern | Evidence/scope that must *not* be inferred |
| --- | --- | --- |
| [Unit distance counterexample](https://openai.com/index/model-disproves-discrete-geometry-conjecture/) | Explicit proof obligations and external expert verification | Not biological correctness, automatic theorem proving in NovaPharm or new drug efficacy |
| [Gluon preprint](https://openai.com/index/new-result-theoretical-physics/) | Domain assumptions, independent symbolic derivation, check simple known cases | Not peer-reviewed pharmaceutical prediction or transferable particle-physics model |
| [AI medicinal chemist](https://openai.com/index/ai-chemist-improves-reaction/) | Qualified-human-gated question → experimental proposal → recorded observations → bench replication | Not unrestricted autonomous wet-lab tools, generalized chemistry/manufacturing yield or clinical translation |
| [Cell-free protein optimization](https://openai.com/index/gpt-5-lowers-protein-synthesis-cost/) | Measured baseline, explicit cost denominators, held-out experimental validation, iterative learning | Reported 40% reduction in studied system is **not** a NovaPharm saving, guaranteed manufacturing outcome or generalized result across proteins |
| [T-cell immunology research](https://openai.com/index/gpt-5-immunology-mystery/) | Alternative mechanisms, disconfirming findings, specialist plausibility review | Not a validated therapy, individual patient diagnosis or proved treatment mechanism |
| [Rare disease reanalysis](https://openai.com/index/diagnose-rare-childhood-diseases/) | Expert-reviewed, evidence-linked candidate prioritisation and knowledge reanalysis | OpenAI model did not diagnose patients; study's 18 expert-confirmed cases out of 376 are not NovaPharm model performance or consent for using records |
| [Codex black-hole simulations](https://openai.com/index/using-codex-to-simulate-black-holes/) | Numerical regression testing, reproducible code, known-case comparisons and independent code review | Not acceptance of generated code without tests or valid drug/clinical simulations |
| [OpenAI homepage](https://openai.com/) | Dated external research discovery reference only | Not an API, model permission, continuous feed or research validation |
| [OpenAI Science news](https://openai.com/news/science/) | Manually curated science publication discovery | Not a connected automatically updating live data feed |

### What was implemented in code
- **Source registry:** Nine unique references, publication dates where applicable, source types, method IDs, original publication URLs, limitations, linked canonical workspaces, required verification, and machine-readable `false` values for independent replication, source AI-use approval and clinical/commercial use.
- **Controlled scientific planning:** `src/core/intelligence-science-methodology.mjs` accepts only recognized source IDs, exact canonical workspace slugs and bounded opaque subject identifiers, and rejects wrong-workspace references and free-text inputs. It does **not** issue model API calls, execute laboratory protocols, admit research data, certify results or activate clinical use.
- **Web and mobile:** Protected Science web screen and offline iOS/Android candidate display the same nine source references with a strict reported-finding vs. application-vs.-limitation separation; user-initiated original links open source websites (native: external browser only).
- **Platform-wide DNA:** Source-rights, human evaluation, independent reproducibility, retraction review, audit and no autonomous clinical/regulatory decisions remain shared immutable guardrails on all 22 canonical Intelligence workspace readiness contracts.
- **Verification:** Dedicated Node tests enforce nine unique URLs, seven research methods, two evolving discovery indexes, cross-platform UI references, workspace mappings, no false model/lab/customer promotion, and the separate 22-workspace readiness controls.

### Deployment and scientific acceptance boundaries
These are *reference and application design patterns*, not operational scientific APIs. No access has been obtained from OpenAI, Ginkgo Bioworks, Molecule.one, a health-care provider or a scientific data publisher on the basis of reading a research story. The studies are author/publisher reports; NovaPharm has not independently reproduced their findings. Onboard future public-domain/official life-sciences sources only with field-level rights, record-level provenance, non-patient test datasets and secure backend adapters. Clinical/patient/genomic work would need separate legal, privacy, ethics, regulatory, safety and specialist acceptance.

User-specified `https://openai.com` and `https://openai.com/news/science/` are changing web indexes rather than static research papers. The registry snapshot was reviewed 18 November 2026 and does not imply current future news accuracy. No background polling, autonomous chemistry, genomic diagnosis, open-ended simulation or patient-facing model use was enabled.


## 18 November 2026: Evidence lifecycle incorporated into Intelligence DNA

Source reference ingestion is intentionally **not** scientific claim acceptance. Every external research case now has an explicit validation track, publisher-verification flag, correction/retraction verification flag and primary-study inspection flag. All nine cases currently indicate **not independently assessed**, **retractions/corrections not checked**, **primary study evidence not inspected** and **no approved research dataset**. Published descriptions are education/research context only, not clinical, economic, regulatory, chemical or biological facts accepted by NovaPharm.

The eight immutable lifecycle prerequisites in `src/core/intelligence-science-evidence-dossier.mjs` are:

1. `source_identity`: exact source, publication, version, authors and timestamp
2. `legal_rights`: rights for reading, processing, quoting and AI use in the correct jurisdiction
3. `source_corrections`: corrections, errata, expression of concern, retractions and later revisions
4. `provenance`: immutable, attributable artifact lineage and valid source fingerprints
5. `independent_method_validation`: suitable replication, formal proof, calculation, reference-test or specialist methodology verification
6. `conflicts_and_uncertainty`: disconfirming evidence, alternatives, limits and uncertainty
7. `qualified_review`: scientific reviewer identity, independence, expertise and documented approval
8. `release_review`: separately accountable signoff for any specific internal/public/regulated use

The dossier is a **non-executing design contract**. It accepts only a known reference case, a matching canonical workspace, a `research:` plus 64-character hexadecimal fingerprint and up to 12 unique `evidence:` hexadecimal references. It rejects any free-text/patient-like input, invalid IDs or cross-workspace bypasses. Fingerprints are **not** signatures, immutable evidence, authorization, licenses, accepted results or promises of anonymity; they require independent trusted verification. All eight stages are always returned `not_independently_verified`. Client flags `approved` or `externalModelKeyPresent` cannot enable scientific conclusions, model calls, laboratory execution, clinical decisions or customer publication.

Tracks are `formal`, `experimental`, `clinical_research`, `computational` and `discovery`; homepage/news index entries remain discovery-only and cannot be treated as primary evidence. The cross-workspace readiness report now exposes only applicable reference IDs, method validation tracks, the eight required stages and `scientificDossierIndependentEvidenceAccepted:false` for all 22 modules. The executive release-readiness report records zero independently verified stages and no source-correction certification. The protected web and offline native UI label the external publisher reporting/unchecked corrections explicitly.

Mobile TypeScript validation lists the Science screen and both shared research catalogues explicitly. CI tests include invalid scopes, repeated evidence references, forged approval flags, unverifiable clinical claims and no-model/no-lab/no-release guarantees.

**Not a completed production workflow:** source review and verification tools, scientific audit infrastructure, model API licenses, research data ingestion, paid/cloud environments, native signing, end-to-end deployed user acceptance and independent regulated release remain unverified. The draft must not be merged to production merely because a test for a read-only preview passes.
