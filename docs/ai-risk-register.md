# Trusted AI Risk Register

**Status:** implemented controls and residual-risk record
**Reviewed:** 22 July 2026
**Owners:** Technology, Information Security, Privacy, Quality and Corporate Communications

| Risk | Applies to | Implemented control | Residual risk | Required owner |
|---|---|---|---|---|
| Unsupported public answer | Public ask mode | Approved corpus only; deterministic policy before retrieval; exact passage citations; fixed abstention | A cited page may itself become outdated | Content owner and review-date governance |
| Medical or safety content | Public assistant | Deterministic refusal and controlled official routes; no generation | Novel wording may evade a simple pattern | Periodic red-team expansion; prominent public boundary |
| Prompt injection | Public and internal | Instructions are evaluated before retrieval; output is rendered with `textContent`; records cannot change policy | Obfuscated attacks may require new patterns | Information Security |
| Private-data leakage | Public assistant | Private routes and records absent from build allowlist; no external inference; no query logging | Public source may contain content published in error | Publication review and source register |
| Cross-role or cross-customer access | Internal gateway | Authenticated server route, required scopes, registered source classes, no customer use case | Future data adapters could weaken isolation | Security test on every adapter |
| Autonomous decision | Internal gateway | `productionWriteAllowed: false`; no write tools; provider `none`; human-review labels | A user could over-rely on a draft | Training, visible status and accountable owner |
| Model or licence drift | Semantic search | First-party deterministic model, revision and checksum | Future third-party model may add restrictions | Licence gate and immutable version |
| Browser storage surprise | Optional semantic search | Explicit activation, disclosed total size, cancellable download and clear-cache control | Browser eviction and storage behaviour vary | Cross-browser tests and privacy notice |
| Performance regression | Public website | AI controller dynamically imported; model/index fetched only after action; worker execution | Search activation downloads about 1.14 MB uncompressed | Budget monitoring and conventional fallback |
| Accessibility failure | Search dialog and navigator | Native modal dialog, labelled controls, status region, keyboard controls, no simulated typing | Browser and assistive-technology variation | Manual keyboard and screen-reader acceptance |
| False forecasting or traceability claim | Public content | Roadmap-only language and claims scanner | Marketing copy may regress later | Automated claim gate and evidence owner |
| Ollama exposure | Internal development | Loopback HTTP host allowlist and production rejection | Local machine compromise remains possible | Local developer security and model review |
| CLIP product-image false match | Nova Device Intelligence private research | Source-only, disabled by default; candidate ranks without confidence, identity, strength, clinical or regulatory assertions; manual source check | Lookalike packs and near-identical strengths can be dangerously confused | Quality and clinical-risk reviewer before any pilot |
| Image-rights expiration or revocation | Offline visual catalogue | Expiry/revocation metadata, per-asset SHA-256, checksum-bound index, runtime exclusion of expired images | Rights record still needs independent legal attestation and operator-triggered index rebuild on external revocation | Legal, Privacy and source rights owner |
| Cross-platform authentication and redirect risk | Web/iOS/Android CLIP clients | Exact protected BFF path; board scope; CSRF; no-redirect native clients; secure origin; bounded payloads; no direct weights or model hosts | Signed app session, physical-device validation and tenant proof not yet present | Identity and Information Security |
| Pretrained image model compromise | Private Python research service | Local-only model path, SHA-256, loopback token and default-off flag; no remote downloads | Pinned model files and third-party ML dependencies must be independently reviewed; no approved artifact yet | ML platform owner and supply-chain security |
| False mechanistic-circuit explanation | NOVA sparse-circuit research and model governance (added 18 November 2026) | Existing provider/model registries explicitly deny verified neural-circuit access; shared exact-schema research artifact inspector rejects forged approvals and malformed graphs; protected web and native views label results unverified and non-clinical | Well-formed metadata, pruning results or ablation deltas are not independent causal verification; over-reliance on a future experiment remains possible | AI research lead, independent evaluator, Security, Quality and Regulatory before any release |

## Stop conditions

Disable the affected capability if testing identifies a medical recommendation, unsupported regulatory or availability claim, private-source retrieval, role bypass, executable output, citation mismatch, public model prefetch, secret disclosure or critical accessibility barrier.

## Deep-learning compute admission risks — November 2026

These are **source-stage mitigations only**, not evidence that production cloud enforcement exists. See [infrastructure architecture](architecture/deep-learning-infrastructure-20261118.md).

| Risk | Source mitigation now | Production release gate | Owner |
| --- | --- | --- | --- |
| Unexpected GPU/CPU spend or runaway training | Review-only proposal defaults to zero budget, bounded resource counts/duration and no execution path | Trusted server-side spend ceilings, quota enforcement, hard runtime termination, billing alarms and owner approval | Technology and Finance |
| Patient or commercially sensitive training data | Proposal requires declared nonpersonal approved class; no data uploading or reading occurs | Rights evidence, classification at ingestion, DPIA where required, least-privileged storage, encryption and retention review | Privacy, Quality and Security |
| Cross-border transfer through region failover | Candidate checks explicit region allowlist; no workload orchestration or fallback exists | Contractual residency approval and per-country transfer review; otherwise region overflow must fail closed | Privacy and Regulatory |
| Model provenance or reproducibility failure | Candidate requires immutable SHA-256-shaped dataset/model references | Verified content digest, container SBOM, independent holdout, versioned lineage, reproducible training and signed artefacts | ML lead and Quality |
| Web/iOS/Android policy drift | Three source-only adapters, automated deny tests and platform release boundaries | Same signed backend decisions and cross-platform conformance tests; client validation can never authorize compute | Platform Engineering |
| Unsafe promotion into pharmaceutical decisions | Review-only local verdict and no job runner | Explicit risk classification, qualified human sign-off, rollback and product-specific regulatory review | Quality, Clinical and Regulatory |

**Stop condition:** deny a release if training can be initiated from the public site or a mobile client, if a client-selected budget/region can bypass a trusted backend, if model/data rights are missing, or if source-only tests are misrepresented as production activation.

## Multimodal candidate addendum — 18 November 2026 (PR #821)

**Scope:** research-only, deterministic, offline name/strength/dose-form/manufacturer/product-code comparison for non-sensitive user-supplied text on protected web and Expo iOS/Android candidate. This is **not** CLIP inference, OCR, patient-document processing, approved AI/ML model deployment, or production data admission.

| Risk | Current candidate mitigation | Remaining production gate |
|---|---|---|
| Typographic overlays and adversarial text | Explicit vision-versus-image-text mismatch signal, no automatic identity approval | Licensed image/packaging test set, typographic red-team benchmark and expert review |
| Similar name with different strength/form/manufacturer | Independent exact critical-attribute comparisons; differences require review | Authority-verified identifiers and dated national medicine terminology |
| Input truncation, invisible controls, bidi spoofing | Reject oversized, non-string and suspicious-format candidate fields | Independent threat analysis for scripts, OCR and filenames |
| False certainty or model overreach | Always unverified, non-publishable and human-review-required; no inference provider | Validated calibrated abstention, labelled holdout and clinical intended-purpose review |
| Tenant rights or private media leakage | No media capture, network or persistence in the research component; client flags never grant authority | Server-owned source/tenant/purpose rights, privacy assessment and revocation smoke |
| Cross-platform drift | Shared ESM contract plus web/mobile parity tests and all 22 readiness workspaces | Exact-head CI, real iOS/Android device and protected web release acceptance |

**Release authority:** CI passing the research contract alone is not permission to publish, ingest licensed records, train, activate models or deploy customer functions. See issue #825.

## Multimodal research extension — 18 November 2026 (PR #821)

The protected web and source-only Expo iOS/Android candidates add an offline, dependency-free **deterministic review helper**, not a neural model. It accepts only manually supplied, explicitly confirmed non-sensitive candidate strings and returns an unverified comparison status. It never reads images, invokes a model, retains source data, grants rights, validates medicine identity, publishes records or makes a clinical/commercial/regulatory decision. It examines name, product code, strength, dosage form and manufacturer discrepancies without equating similarity with truth.

Exactly 22 canonical Intelligence workspace-readiness reports also carry a non-executable multimodal research policy, with model inference off, source/tenant permission unspecified, customer release false and human oversight mandatory. These new candidate components do not alter the existing live public evidence-search implementation or assert that CLIP has been deployed.

**Additional model-specific limitations:** typographic overlays, language/domain shifts, closely related packaging, counterfeit/lookalike products and domain-dependent visual activations invalidate any naive use of image-text similarity as identity. Model licensing, dataset governance, external benchmark, adversarial tests and physical-device acceptance are tracked in #825. This extension remains development-only even if the research tests pass.

## L0 sparse-model research addendum — 18 November 2026

This research is intentionally **not** an approved model or deployable inference route. The central model/use-case/SBOM registers identify its status and source. Time-dependent pharmaceutical feature selection must pass source-rights, leakage-safe holdouts, subgroup, drift and safety checks before any model proposal. Exact-zero weights alone do not establish interpretability, lower resource use or clinical validity.

**Additional risk — false sparse-model assurance:** Exact-zero gating and synthetic numerical acceptance do not prove model accuracy, explainability, calibrated uncertainty, lower latency, lawful source use, or production eligibility. The research remains source-only and must be reviewed by Model Risk, Quality, Security and data owners.

## Stop conditions

Disable the affected capability if testing identifies a medical recommendation, unsupported regulatory or availability claim, private-source retrieval, role bypass, executable output, citation mismatch, public model prefetch, secret disclosure or critical accessibility barrier.

## Deep-learning compute admission risks — November 2026

These are **source-stage mitigations only**, not evidence that production cloud enforcement exists. See [infrastructure architecture](architecture/deep-learning-infrastructure-20261118.md).

| Risk | Source mitigation now | Production release gate | Owner |
| --- | --- | --- | --- |
| Unexpected GPU/CPU spend or runaway training | Review-only proposal defaults to zero budget, bounded resource counts/duration and no execution path | Trusted server-side spend ceilings, quota enforcement, hard runtime termination, billing alarms and owner approval | Technology and Finance |
| Patient or commercially sensitive training data | Proposal requires declared nonpersonal approved class; no data uploading or reading occurs | Rights evidence, classification at ingestion, DPIA where required, least-privileged storage, encryption and retention review | Privacy, Quality and Security |
| Cross-border transfer through region failover | Candidate checks explicit region allowlist; no workload orchestration or fallback exists | Contractual residency approval and per-country transfer review; otherwise region overflow must fail closed | Privacy and Regulatory |
| Model provenance or reproducibility failure | Candidate requires immutable SHA-256-shaped dataset/model references | Verified content digest, container SBOM, independent holdout, versioned lineage, reproducible training and signed artefacts | ML lead and Quality |
| Web/iOS/Android policy drift | Three source-only adapters, automated deny tests and platform release boundaries | Same signed backend decisions and cross-platform conformance tests; client validation can never authorize compute | Platform Engineering |
| Unsafe promotion into pharmaceutical decisions | Review-only local verdict and no job runner | Explicit risk classification, qualified human sign-off, rollback and product-specific regulatory review | Quality, Clinical and Regulatory |

**Stop condition:** deny a release if training can be initiated from the public site or a mobile client, if a client-selected budget/region can bypass a trusted backend, if model/data rights are missing, or if source-only tests are misrepresented as production activation.

## Multimodal candidate addendum — 18 November 2026 (PR #821)

**Scope:** research-only, deterministic, offline name/strength/dose-form/manufacturer/product-code comparison for non-sensitive user-supplied text on protected web and Expo iOS/Android candidate. This is **not** CLIP inference, OCR, patient-document processing, approved AI/ML model deployment, or production data admission.

| Risk | Current candidate mitigation | Remaining production gate |
|---|---|---|
| Typographic overlays and adversarial text | Explicit vision-versus-image-text mismatch signal, no automatic identity approval | Licensed image/packaging test set, typographic red-team benchmark and expert review |
| Similar name with different strength/form/manufacturer | Independent exact critical-attribute comparisons; differences require review | Authority-verified identifiers and dated national medicine terminology |
| Input truncation, invisible controls, bidi spoofing | Reject oversized, non-string and suspicious-format candidate fields | Independent threat analysis for scripts, OCR and filenames |
| False certainty or model overreach | Always unverified, non-publishable and human-review-required; no inference provider | Validated calibrated abstention, labelled holdout and clinical intended-purpose review |
| Tenant rights or private media leakage | No media capture, network or persistence in the research component; client flags never grant authority | Server-owned source/tenant/purpose rights, privacy assessment and revocation smoke |
| Cross-platform drift | Shared ESM contract plus web/mobile parity tests and all 22 readiness workspaces | Exact-head CI, real iOS/Android device and protected web release acceptance |

**Release authority:** CI passing the research contract alone is not permission to publish, ingest licensed records, train, activate models or deploy customer functions. See issue #825.

## Multimodal research extension — 18 November 2026 (PR #821)

The protected web and source-only Expo iOS/Android candidates add an offline, dependency-free **deterministic review helper**, not a neural model. It accepts only manually supplied, explicitly confirmed non-sensitive candidate strings and returns an unverified comparison status. It never reads images, invokes a model, retains source data, grants rights, validates medicine identity, publishes records or makes a clinical/commercial/regulatory decision. It examines name, product code, strength, dosage form and manufacturer discrepancies without equating similarity with truth.

Exactly 22 canonical Intelligence workspace-readiness reports also carry a non-executable multimodal research policy, with model inference off, source/tenant permission unspecified, customer release false and human oversight mandatory. These new candidate components do not alter the existing live public evidence-search implementation or assert that CLIP has been deployed.

**Additional model-specific limitations:** typographic overlays, language/domain shifts, closely related packaging, counterfeit/lookalike products and domain-dependent visual activations invalidate any naive use of image-text similarity as identity. Model licensing, dataset governance, external benchmark, adversarial tests and physical-device acceptance are tracked in #825. This extension remains development-only even if the research tests pass.

## Research alignment hazards — 18 November 2026

- **Reward proxy Goodhart risk:** optimising a reported preference or forecast score can worsen independent outcomes; research detects candidate deterioration but cannot independently establish true outcome validity.
- **Critique authority confusion:** fluent critiques may be false or omit material flaws; assistant criticism must be tied to independent qualified reviewers and exact source evidence, never taken as automatic approval.
- **Instruction and prompt-injection hierarchy:** caller-supplied checklist compliance cannot waive authenticated scope, source licences, patient restrictions or security policy. Source documents are data, not instructions.
- **Simulation-to-reality transfer:** a synthetic safe policy is not a safe operational controller. No distributed self-play, unauthorised exploration, warehouse actuation or commercial/clinical decision is permitted.

Every component in this stage is research-only, with customer and production activation disabled. Model Risk, Quality, Regulatory, Privacy and Security must independently establish rights, valid holdout outcomes, reward robustness, subgroup stability, controls and a tested rollback before any new runtime or training programme. See `docs/intelligence/NOVA_AI_ALIGNMENT_RESEARCH_20261118.md`.

## Deep-learning compute admission risks — November 2026

These are **source-stage mitigations only**, not evidence that production cloud enforcement exists. See [infrastructure architecture](architecture/deep-learning-infrastructure-20261118.md).

| Risk | Source mitigation now | Production release gate | Owner |
| --- | --- | --- | --- |
| Unexpected GPU/CPU spend or runaway training | Review-only proposal defaults to zero budget, bounded resource counts/duration and no execution path | Trusted server-side spend ceilings, quota enforcement, hard runtime termination, billing alarms and owner approval | Technology and Finance |
| Patient or commercially sensitive training data | Proposal requires declared nonpersonal approved class; no data uploading or reading occurs | Rights evidence, classification at ingestion, DPIA where required, least-privileged storage, encryption and retention review | Privacy, Quality and Security |
| Cross-border transfer through region failover | Candidate checks explicit region allowlist; no workload orchestration or fallback exists | Contractual residency approval and per-country transfer review; otherwise region overflow must fail closed | Privacy and Regulatory |
| Model provenance or reproducibility failure | Candidate requires immutable SHA-256-shaped dataset/model references | Verified content digest, container SBOM, independent holdout, versioned lineage, reproducible training and signed artefacts | ML lead and Quality |
| Web/iOS/Android policy drift | Three source-only adapters, automated deny tests and platform release boundaries | Same signed backend decisions and cross-platform conformance tests; client validation can never authorize compute | Platform Engineering |
| Unsafe promotion into pharmaceutical decisions | Review-only local verdict and no job runner | Explicit risk classification, qualified human sign-off, rollback and product-specific regulatory review | Quality, Clinical and Regulatory |

**Stop condition:** deny a release if training can be initiated from the public site or a mobile client, if a client-selected budget/region can bypass a trusted backend, if model/data rights are missing, or if source-only tests are misrepresented as production activation.
