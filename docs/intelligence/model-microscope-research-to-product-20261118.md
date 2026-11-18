# Nova Model Microscope — interpretability research integration

**18 November 2026 · source-only candidate · no production availability**

## Evidence reviewed

- OpenAI, [Microscope](https://openai.com/index/microscope/), 14 April 2020.
- Distill, [Feature Visualization](https://distill.pub/2017/feature-visualization/), 7 November 2017.
- Distill, [Zoom In: An Introduction to Circuits](https://distill.pub/2020/circuits/zoom-in/), 10 March 2020.
- [tensorflow/lucid](https://github.com/tensorflow/lucid), archived April 2024 and explicitly research-only / TensorFlow 1.x.
- The original public `microscope.openai.com` browser could not be verified as currently operational. No production API, license or model access is inferred.

Microscope is **neural-network interpretability**, not laboratory microscopy, regulatory data, medicine safety validation, an OpenAI inference endpoint or permission to download other organisations' model internals. The OpenAI article describes neuron/channel visualization, dataset examples, circuit exploration, immutable linkability and accessible shared analysis of several studied vision networks. These are design patterns, **not reusable live pharma data**.

## Product mapping

| OpenAI idea | NovaPharm research feature | Backend/accuracy boundary |
| --- | --- | --- |
| Model/layer/neuron index | Authenticated registry of approved model IDs, versions, layers, features | Only introspect our own or explicitly licensed accessible models |
| Feature visualization | Provenance-fingerprinted offline rendered candidate visualizations | No user-submitted PHI, no external hotlink or unreviewed generated image |
| Stimulus examples | Rights-cleared non-patient evaluation examples | Never expose raw licensed input or representative examples by default |
| Circuit tracing | Reviewed feature-to-feature relationship hypotheses | Correlation/visual salience is not causal proof |
| Per-neuron URLs | Stable tenant-scoped inspection references | No public deep-link disclosure of protected artifacts |
| Research collaboration | Reviewer, method, model version, hypothesis and falsification notes | Immutable audit, no auto-approval |
| Model comparison | Versions, evaluation cohorts, shifts, failure modes | Versioned reproducible evaluation, representative negative controls |
| Limits of interpretation | Model card, uncertainty and rejected explanations | Does not certify clinical, price, procurement or regulatory decisions |

## Actual source changes in this candidate

1. Existing **protected** board Intelligence route adds **Nova Model Microscope** alongside the Nova ML modules. Its default screen is an explicit empty state; it makes no model call. The canonical 22 pharmaceutical workspaces are unchanged.
2. Expo/React Native's same source-only private preview introduces an **Inspect** tab on both iOS and Android. It displays the cross-platform research and release boundaries, not invented neuron images.
3. `src/core/ai/model-microscope.mjs` offers a read-only backend helper. It demands an independently trusted tenant+actor+model+version+layer+feature+purpose authorizer before looking up a model artifact, then enforces rights, review, provenance and explicit no-patient requirements. The response is a strict allow-list and always carries `canPublish:false` and `inferenceEnabled:false`. This is not a deployed API.
4. Negative tests and a standalone CI workflow cover denial, tenant/feature mismatch, expiry, provenance failure and sensitive-field non-disclosure.

## What remains before real use

- Specify the first owned or licensed model and its permitted introspection interface. Hosted black-box LLM APIs generally **do not** expose neuron weights, circuits or internal activations.
- Approve datasets, evaluation protocols, image/source licensing, model redistribution and privacy impact; prevent protected source content in inspector records.
- Build offline feature-extraction/activation/attribution services in a private compute environment, independently validate methods and link evaluation snapshots.
- Add signed manifests, retention and deletion, file/media scanning, image export policy, role-scoped endpoints, telemetry and an audit trail.
- Test model/domain shift, spurious correlations, saliency instability, abuse/PII extraction, accessibility and mobile device compatibility.
- Require browser auth, mobile MFA/PKCE, tenant-bound rights, independent security/Quality reviews, CI, production gates and rollback; approve and sign real iOS/Android builds.

**No integration with an OpenAI Microscope API is claimed. No production web route, Android package or iOS binary is deployed by this PR.**
