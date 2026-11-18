# NovaPharm Intelligence — Multimodal Neurons Research Adaptation

**Status:** Code candidate only; not a model deployment, mobile release, data admission, pharmaceutical identity assurance, or approval to publish. **Date:** 18 November 2026.

## Research provenance

- Goh et al., *Multimodal Neurons in Artificial Neural Networks*, Distill (4 March 2021): https://distill.pub/2021/multimodal-neurons/
- OpenAI summary: https://openai.com/index/multimodal-neurons/
- CLIP original model card: https://github.com/openai/CLIP/blob/main/model-card.md

The paper examines CLIP RN50x4 interpretable feature activations, dataset examples, neuron composition, missing localized concepts, typographic adversarial attacks, biased associations and over-generalization. It is **not** an API, native application integration guide, or validated drug-packaging classifier. The CLIP model card explicitly excludes unvalidated deployed use, and the published paper demonstrates failures that are material to medicines.

## What the code implements now

1. A *pure offline deterministic* conflict gate (`src/core/intelligence-multimodal-evidence-review.mjs`), callable without a network, camera, OCR tool, neural model or user account.
2. Side-by-side, manually entered unverified visual and image-text medicine-name candidates, optional exact product identifier comparison, provenance reference and country. Conflicts produce a visible **review** signal, never a claim of an attack or a verified identity.
3. The same contract can be consumed by protected Nova ML web planning and the source-only Expo iOS/Android research preview. These are planning/review surfaces and cannot access restricted source data.
4. Automated negative tests for blocked purpose, contradictory candidates, insufficient provenance, leading-zero identifier preservation and zero promotion to customer/clinical/regulatory decisions.

**All results remain `canPublish:false`, `identityVerified:false`, `sourceRightsVerified:false`, `decisionReady:false` and `clinicalUseAllowed:false`.** Client booleans must never be considered backend rights or privacy approvals. Local inputs are not retained, uploaded, logged or echoed by the shared module.

## Scientific and enterprise roadmap (not implemented)

- Secure image acquisition with explicit consent, file-type/size limits, no PHI and on-device preprocessing where justified.
- Qualified medicine-image OCR and visual candidate models only after task-specific licence, data rights, versioning, dataset bias audits and device/server evaluation.
- Text-vs-image disagreement benchmarking using real approved packaging variations; overprinted text adversarial red-team corpus; multilanguage and jurisdiction-specific testing.
- Feature attribution or concept-probing in an isolated model-evaluation environment. No inference about "neurons" is obtained merely by comparing OCR text strings.
- Back-end-only protected source verification: exact product identifiers, codes, formulation, strength, dose form, manufacturer, jurisdiction, valid-time, batch when appropriate, and immutable evidence manifests.
- Evidence-licensed retrieval, tenant security, revocation, model monitoring, calibrated abstention, independent quality and regulatory review.
- Human approval; no autonomous prescribing, dispensing, release, pharmacovigilance conclusion, purchase or regulatory filing.

## Release acceptance

Require exact commit CI (web typecheck, Expo TS/bundle preflight, Node tests), device accessibility and security acceptance, licensed evidence, official identity reconciliation benchmark, privacy assessment, documented threat/typographic attacks, genuine two-tenant denial/revocation tests and signed owner acceptance. This commit does **not** change cloud services, source rights, product availability, or publication state.

## Shared 22-workspace "DNA" boundary

The non-executable `src/core/intelligence-multimodal-workspace-policy.mjs` enumerates exactly the 22 canonical Intelligence workspace slugs and declares a research-purpose boundary for every one. `src/core/intelligence-22-workspace-readiness.mjs` now returns the corresponding `multimodalResearchPolicy` per workspace. This is a **shared readiness contract**, NOT 22 deployed multimodal applications. Every policy has `modelInferenceEnabled:false`, `productionAccepted:false`, `customerAccessible:false`, `canPublish:false` and `decisionReady:false`, with independent source-rights and tenant-authority requirements.

To prevent future regression, the dedicated CI must:
- Verify exact parity with the canonical 22 workspace slugs and reject unknown or prototype-polluted slugs.
- Run the existing 22-workspace readiness acceptance tests in addition to the multimodal conflict and mobile/portal wiring tests.
- Refuse silent truncation (above 240 characters), invisible/bidirectional format marks and non-string model labels.
- Preserve leading zeroes, punctuation and case of jurisdiction-specific product identifiers instead of treating semantic closeness as identical registration identity.
- Recheck code, mobile bundle and protected portal lint/build gates at the exact final commit.

This review candidate deliberately **does not** install CLIP weights or publish inferred image matches. Real OCR/model evaluation needs a labelled, licensed holdout and counterfactual packaging overlays (e.g. printed distractor words), independently reviewed per country, language, strength, dose form, manufacturer and image modality. Track class-wise false identity merges, abstention, calibrations and model drift; never convert a visual score into a clinical confidence or regulated product status.

**Status reporting:** a green source contract does not prove a model, hosted API, native build, external data rights, regulated validation or live customer rollout.

## Quantitative evaluation reporting (non-authoritative source candidate)

The new `src/core/intelligence-multimodal-benchmark-metadata.mjs` accepts only anonymous IDs, two ground-truth categories (`match`, `non_match`), one of nine fixed perturbation conditions, ISO-style two-letter country labels and model output classes (`match`, `non_match`, `abstain`). It rejects free text, extra fields, malformed labels and missing/duplicate predictions. It computes false matches with two explicit denominators, decision coverage, abstention and correct decisions, broken down by country and perturbation class, with `null` when a denominator is zero. It explicitly lists every unmeasured planned attack condition (nine fixed scenario classes); an apparently perfect benchmark over a small clean sample does not hide missing adversarial tests. No original label, image, prompt or case ID is returned. **The input ground truth is caller supplied and unverified; these are research bookkeeping metrics, not model performance acceptance**. Independent blind adjudication, source rights, licensed image holdout and sign-off remain required in #825. There is no model call or production switch.

## Extended bibliography (22 entries supplied, 21 unique studies)

The comprehensive paper-by-paper research-control mapping is in [multimodal-22-reference-engineering-matrix-20261118.md](./multimodal-22-reference-engineering-matrix-20261118.md). Items 15 and 22 repeat Crawford & Paglen (2019), so they produce **one** dataset-governance requirement, not two separate algorithms.

The source registry `src/core/intelligence-multimodal-research-basis.mjs` contains 21 individual publication pointers and seven research dimensions. Every one of the 22 canonical Intelligence workspace-policy reports now includes this research-basis contract. The protected web panel and the source-only Expo iOS/Android review surface the same provenance counts. `src/core/intelligence-multimodal-threat-evaluation.mjs` provides 12 **synthetic string-based** regression probes mapped back to all 21 distinct references. The probes check that deterministic conflict and refusal logic fails closed, not that any real image model is robust.

**Do not infer 100% production integration from source-code mapping or mock tests.** Model weights, authorised actual images, secure ingestion, independent clinical/regulatory evaluation, live inference endpoints and signed iOS/Android app releases remain absent and require issue #825 acceptance.

## Regulatory-source candidate separation

The global evidence source candidate factory (`src/core/intelligence-global-canonical-candidates.mjs`) now refuses unknown extra fields on regulator product identity rows, including AI-derived name/confidence/identity booleans, rather than stripping those fields while preserving an apparently authoritative national medicine record. Explicitly approved upstream row fields remain `localId`, `label`, and optional `provenanceDomain`; existing FDA, Health Canada and CIMA normalisers use this shape. The output remains `canonicalProductId:null`, `mappingDecision:"unresolved"`, and `commercialReleaseApproved:false` with separate source-rights and product reconciliation.

The regression is in `scripts/test-intelligence-global-canonical-candidates.mjs` and is now part of the dedicated multimodal research CI. **This is not a model integration or publication permission.** It ensures future image and text representations cannot quietly become official-source medicine facts through this specific candidate adapter. Authoritative clinical admission remains a separate regulated operation.

## Incomplete paired identity evidence

The shared comparison gate now reports `incomplete_critical_attribute_pair` and returns `insufficient_evidence` when exactly one of the reference/observed product code, strength, dose form or manufacturer is supplied. All four pairs being omitted is still a visibly unverified, human-review-only research case; paired fields do not constitute verified identity. This requirement is regression-tested in `scripts/test-intelligence-multimodal-evidence-review.mjs` and applies identically to the web and Expo iOS/Android review clients.
