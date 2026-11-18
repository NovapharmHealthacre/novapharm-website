# NovaPharm Intelligence — sparse-circuit interpretability research integration

**Date:** 18 November 2026  
**Status:** governed code and read-only UI candidates in draft PR #816; not merged, not deployed, not customer-facing, not clinical  
**Scope:** shared NovaPharm Intelligence web/service artifact validation and iOS/Android read-only adapter candidates

## Research reviewed

- OpenAI, *Understanding neural networks through sparse circuits* (13 November 2025): https://openai.com/index/understanding-neural-networks-through-sparse-circuits/
- Gao et al., *Weight-sparse transformers have interpretable circuits*, arXiv:2511.13653 (17 November 2025): https://arxiv.org/abs/2511.13653
- Full paper HTML: https://arxiv.org/html/2511.13653v1
- OpenAI reference implementation, released under Apache-2.0: https://github.com/openai/circuit_sparsity

The paper trains GPT-2-like transformer models with predominantly zero weights, isolates narrow task circuits with structured pruning and mean ablation, and explores bridged sparse-to-dense representations. Weight sparsity trades model capability for interpretability. The paper reports roughly 16-fold smaller circuits than capacity-matched dense baselines in its evaluated tasks; its sparse models can require 100–1000x more compute than comparably capable dense models. Research on code-completion microtasks is **not** evidence of safety or utility in clinical or pharmaceutical decision making.

The open-source Streamlit visualizer, PyTorch inference and model checkpoints are *reference research assets*, **not an API** and not an approved production ML backend. The research code and its model/checkpoint rights, training assets, dependency security, compute and data-export implications require separate review before any incorporation. This change does not vendor OpenAI code, download checkpoints or send any NovaPharm data to external systems.

## Technical feasibility

1. **Inspect weights and activations**: only possible for a locally controlled/open-weight model whose internals and rights are available. The present browser **NovaPharm Evidence Vector** is deterministic lexical retrieval without neural weights. A hosted black-box model/API cannot automatically provide mechanistic circuit access.
2. **Sparse training and pruning**: requires an offline experiment and benchmark specific to a narrow, non-clinical task. Training is not initiated by this PR.
3. **Mean-ablation / necessity and sufficiency**: experimental design and independent replication are required. A submitted JSON summary, even if well formed, cannot certify causal faithfulness or necessity/sufficiency.
4. **Dense-model bridges**: exploratory research only, not a drop-in plug-in for arbitrary OpenAI models.
5. **Application integration**: develop a server-owned, authenticated, read-only candidate summary after independent rights and model evaluations, with a separately gated research UI on web, iOS and Android. No client-side claim can authorise publication or model execution.

## Implementation delivered in this candidate

| Layer | File | Boundary |
|---|---|---|
| Shared web/Node | `src/core/intelligence-sparse-circuit-assurance.mjs` | Deterministic shape checks for bounded mechanistic circuit candidates. No inference, data access, uploads or approvals. |
| Regression | `scripts/test-intelligence-sparse-circuit-assurance.mjs` | Negative cases for unknown fields, payloads, malformed weights, duplicates, invalid metrics and forged release flags. |
| iOS | `native/novapharm-intelligence-apple/NovaSparseCircuitReader.swift` and `NovaSparseCircuitResearchView.swift` | Public Swift package decoder and accessible read-only SwiftUI presentation; no network or permissions. No signed app. |
| Android | `native/novapharm-intelligence-android/app/` | Offline Gradle Android application prototype, native research view, exact-schema parser and denial unit tests; no live service, device proof or production signing. |
| Web UI | `apps/portal/components/nova-ml-workspaces.tsx` and `apps/portal/data/nova-ml-modules.ts` | Methodology, rights, claims and approval boundaries presented inside the existing protected Nova ML workspace. No user data collection, model inference or new anonymous route. |
| CI | `.github/workflows/intelligence-sparse-circuit-assurance.yml`, `.github/workflows/nova-sparse-circuit-android.yml` and existing Apple macOS CI | Node contract/parity tests; Android debug build and unit tests; macOS Swift package compilation. All remain independent of production release and real-device proof. |

Circuit graph validation also rejects duplicate edges, unknown nodes, cycles and isolated nodes; this is purely structural and cannot establish a causal circuit.

The shared output deliberately forces `mechanisticExplanationVerified=false`, `productionEligible=false` and `clinicalUsePermitted=false`. This is a metadata and structure validator only; it does not verify experiment results, digitally attest provenance, secure a transport or certify a model.

## Where it could add value in NovaPharm Intelligence

- **Research Evaluation:** research-only experiments, sparsity/circuit comparison, ablation deltas, investigator notes and independent replication references.
- **AI model governance:** model version, weights hash, evaluation dataset hash, bounded graph metadata, and explicit unsupported-model state.
- **Medicines Terminal / Knowledge Graph:** do not confuse a model-internal circuit with a medicine-identity/evidence/provenance graph. Preserve the existing legal source-admission and tenant barriers.
- **Supply, Forecasts and Regulatory:** eventual model-behaviour diagnostics could complement independent forecast calibration, source citations and human validation, but must not replace them.
- **Web + mobile clients:** one structured, rights-approved server response and platform-specific read-only presentations; no trusted security logic in the UI.

## Production gates (all outstanding)

Source rights and model rights are independent release prerequisites: no schema validation, app build or successful ablation can grant either right. All experiments must remain within documented licences, tenant boundaries and human-reviewed purposes.



1. Identify a specific non-clinical research task, an appropriately licensed inspectable model, evaluation set, and independent benchmark, with no identifiable patient, supplier or customer data.
2. Approve rights for model weights, code, derived features and datasets, plus software bill of materials, dependency scan and regional transfer restrictions.
3. Execute real pruning/mean-ablation research, compare unablated/pruned/ablated losses on independently held-out data and publish a reproducibility receipt with model/dataset/code hashes and a signed server-side attestation.
4. Add a secured, rate-limited, tenant-authorised service route with audited writes, rejection paths, no client-supplied entitlements and no browsing of private raw tokens/weights.
5. Implement web UI, real Swift iOS app view and Android Studio app view with a persistent “Unverified research” label, accessible graph fallback and no medical recommendations.
6. Verify Swift package on Xcode/macOS, the Android Gradle prototype build and parser tests, real iOS and Android signed app integration, on-device behaviour, React/web regression, Chromium/WebKit and WCAG accessibility, data minimisation, performance and independent negative tests.
7. Perform owner/Quality/Regulatory/Security reviews and maintain existing production release gates; confirm exact deployed immutable SHA separately. Do **not** enable customers, billing, clinical use or production data merely because repository tests pass.

**No production completion percentage is justified by this proposal.** A GitHub PR, passing Node tests or a Swift/Kotlin source file does not equal an installed mobile application or live website service.
