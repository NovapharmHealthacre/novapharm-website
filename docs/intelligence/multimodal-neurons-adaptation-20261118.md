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
