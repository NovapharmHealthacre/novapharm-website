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
2. Expo/React Native's same source-only private preview introduces an **Inspect** tab on both iOS and Android. It renders the same five-stage lifecycle from `apps/portal/data/nova-ml-modules.ts` as the web UI. The stages are **Model identity**, **Feature observations**, **Circuit hypotheses**, **Failure analysis** and **Governed review**. Each remains explicitly non-operational; no invented neuron images are shown.
3. `src/core/ai/model-microscope.mjs` offers a read-only backend helper. It requires an independently trusted tenant+actor+model+version+layer+feature+purpose authorizer before looking up a model artifact, a protected record loader, and a separately trusted evidence verifier. The verifier must bind the model, dataset, evaluation, rights grant, original authorization grant, manifest digest, no-patient status and reviewer separation. Grants expire within five minutes. The response is an explicit allow-list and always carries `canPublish:false` and `inferenceEnabled:false`. This is not a deployed API.
4. Negative tests and a standalone CI workflow cover denial, tenant/feature mismatch, expiry, provenance failure and sensitive-field non-disclosure.

## What remains before real use

- Specify the first owned or licensed model and its permitted introspection interface. Hosted black-box LLM APIs generally **do not** expose neuron weights, circuits or internal activations.
- Approve datasets, evaluation protocols, image/source licensing, model redistribution and privacy impact; prevent protected source content in inspector records.
- Build offline feature-extraction/activation/attribution services in a private compute environment, independently validate methods and link evaluation snapshots.
- Add signed manifests, retention and deletion, file/media scanning, image export policy, role-scoped endpoints, telemetry and an audit trail.
- Test model/domain shift, spurious correlations, saliency instability, abuse/PII extraction, accessibility and mobile device compatibility.
- Require browser auth, mobile MFA/PKCE, tenant-bound rights, independent security/Quality reviews, CI, production gates and rollback; approve and sign real iOS/Android builds.

**No integration with an OpenAI Microscope API is claimed. No production web route, Android package or iOS binary is deployed by this PR.**

## Security and interpretability acceptance matrix

| Attack or failure | Implemented source-only defence | Still required to demonstrate production safety |
| --- | --- | --- |
| Cross-tenant/model feature read | Full tenant + actor + version + feature binding before record load | Real Cognito MFA, actor identity & tenant attestation, two-tenant integration testing |
| Replaying or extending a permission | Strict UTC expiry and maximum five-minute future grant | Server-controlled clock and revocation, signed short-lived grants |
| Self-approved model evidence | Independent evidence-verifier callback and separation-of-duties assertion | Independent service, actual proof of license, immutable manifest signatures |
| Malicious/private input content | Rights-reviewed non-patient fields and restrictive output projection | Formal DPIA, data redaction checks, no-patient source audits |
| Fake explanations or causal claims | `hypothesis_only`, `canPublish:false`, hard decision-prohibition flags | Negative controls, reviewer adjudication, faithful attribution benchmarking |
| Legacy model visualization tooling | No Lucid runtime dependency; no OpenAI model-internals API calls | Evaluated modern technique for the chosen licensed model and its architecture |
| iOS and Android source-only preview | Same Expo screen + shared five-stage catalogue; no network or credentials | Signed builds, PKCE/MFA, device QA, App Store/Play Store review |
| Public or anonymous access to web inspector | Inherits protected SSR session and board module scope | Exact deployed protected host, no-store anonymous denial, verified rollout receipt |

The independent verifier is an **interface contract**, not a deployed signature-verification service or evidence of actual licensed datasets. No model artifact has been admitted by this PR. Production readiness cannot be calculated from source-code completion alone.

## Read-only response schema

A strict, non-publishable projection is published for internal engineering at `docs/intelligence/model-microscope-inspection-v1.schema.json`. It lists exactly the metadata allowed to cross a future protected server boundary and excludes grants, image bytes, neurons/weights, input documents, patient information and raw tensors. CI compares the implementation's actual output to the same field inventory. A JSON schema is not evidence that the upstream artifact contains no personal data; that requires independent quality and privacy verification.

## Exact inspectable-model inventory check

The current registry was reviewed against `docs/ai-model-register.json` and `src/core/ai/model-registry.mjs`:

| Existing NovaPharm item | What it actually is | Microscope neuron-inspection availability |
| --- | --- | --- |
| `novapharm-evidence-vector-v1` | Repository-owned deterministic sparse lexical retrieval, no neural weights | **Not applicable**; there are no hidden neural units to inspect |
| `internal-provider-none` / `none` | Disabled production model provider | **Unavailable** |
| `ollama-loopback` | Local development adapter, no model approved or bundled | **Unavailable** until a specific inspectable model, licence and tooling are independently approved |
| `openai-zdr` | Approval-gated external AI adapter, not operational | **Unavailable**; a hosted inference API does not grant internal layer/neuron access |

**Admitted inspectable model artifacts in this implementation: zero.** Do not use the existing sparse *lexical* retrieval model as evidence that an artificial neural network feature inspector exists. Future model IDs must be separately versioned, rights-reviewed and explicitly supported by the actual architecture-specific introspection runner; this PR contains no such runner.
