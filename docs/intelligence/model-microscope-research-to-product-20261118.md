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

### Artifact identity binding (November 2026 hardening)

An approved inspection record now requires **three distinct SHA-256 digests** — the source/provenance manifest, the visualization artifact and the exact neural model artifact. Each digest must be independently attested by the same trusted verifier and match before the strictly scoped research metadata is returned. A filename, mutable model version label or self-reported `verified` flag is not sufficient. These are SHA-256 *identifiers*, not a claim that actual signed files or model weights have been verified in production.

### Independently signed research evidence (source-only)

`src/core/ai/model-microscope-signed-evidence.mjs` introduces a deterministic **Ed25519** signed-receipt verifier that an approved private backend can use as the independent `verifyEvidence` callback. It binds tenant, actor, model/version/layer/feature, source dataset, evaluation, source/provenance digest, visualization digest, model artifact digest and grant references, plus distinct reviewer and rights approver. Receipts are short-lived (maximum five minutes), fail closed on signature tampering and are not returned to web or mobile clients. Tests generate ephemeral local signing keys and cover forged, stale, mis-scoped and self-approved receipts. **No live trust anchor, verified external issuer, production signing private key or real signed source has been provisioned.** A public-key signature alone does not create legal model or data rights.

### Executable synthetic neural-network reference

The isolated source module `src/core/ai/model-microscope-synthetic-reference.mjs` implements a first-party fixed 4×4-input, three-feature, two-circuit ReLU neural network. It calculates actual forward activations and analytic input gradients, then performs bounded projected gradient ascent to produce deterministic synthetic feature-maximization grids.

The dedicated tests verify reproducibility, finite-difference gradients, invalid-input rejection and permanent non-publishability. This reference is **not** a pharmaceutical model, trained dataset, OpenAI API, approved production model, live medical inference or rights admission. It is intentionally not connected to the protected customer-facing inspection service or mobile inference runtimes. It establishes a locally executable mathematical smoke test for model interpretability without creating false clinical claims.

### Cross-platform reference interaction

The existing protected web research view and the private iOS/Android Expo source preview can now run the **same first-party synthetic toy-network demonstration** on user initiation, displaying a bounded 4×4 grayscale feature-maximization grid and two synthetic activation values. Neither runtime sends data off-device, fetches protected records or claims production model introspection. The shared mathematical reference is not wired into the independent, rights-gated protected model-artifact reader. Actual pharmaceutical model inspection still requires a separately admitted model and server-backed release.

### Strict identity and UTC receipt parsing

The governed reader and Ed25519 verifier reject noncanonical UTC dates (including normalized impossible calendar dates), non-string identity fields and malformed scope values. Synthetic and proof tests exercise these failures without obtaining any infrastructure privileges. A valid test signature is not itself an authority to grant pharmaceutical rights or to publish interpretations.

### End-to-end signed synthetic evidence integration test

The offline integration harness `scripts/test-nova-model-microscope-end-to-end.mjs` hashes the *actual* first-party synthetic model module bytes and a canonical deterministic feature-maximization grid, constructs a provenance digest, signs an independent Ed25519 QA receipt using a freshly generated **ephemeral test key**, and calls the protected read-only inspection helper with a short-lived synthetic-tenant grant.

It asserts that changing model-source bytes, visualization pixels, dataset reference or actor identity denies the read and that signed approval IDs, raw weights and purported clinical results do not escape the allow-listed response. This demonstrates test-only trust chaining, **not production live artifact admission**: no real model rights, external data, public signing service, production key, authenticated user or cloud back end is provisioned by this test.

### Time-of-check/time-of-use protection

The inspection reader snapshots the tenant/actor/model/version/layer/feature/purpose scope before any asynchronous authorizer call. It now rechecks short-lived grant expiry using a trusted clock after artifact loading and after independent evidence verification, so a request that has timed out during those operations cannot return stale research metadata. An injectable test clock provides deterministic expiry-race coverage; production uses the current server clock by default. No grant revocation implementation or production authenticated service is created by this check.

### Asynchronous record-mutation boundary

Immediately after source-rights/PHI/schema preflight, the inspected artifact's approved metadata fields and SHA-256 identities are captured in a frozen, allow-listed snapshot **before** independently awaited verification. Both the signed-evidence comparison and final response use this snapshot so a mutable storage adapter cannot replace a checked hypothesis, dataset ref or digest while the verifier is running. Adversarial tests mutate the original loader record mid-verification and require the returned metadata to remain the approved snapshot. This does not substitute for an immutable production artifact store.

### Sanitized protected-backend adapter errors

All independently supplied authorization, artifact-loading and verification callbacks are invoked behind a fail-closed adapter boundary. Exceptions—including errors carrying internal database locations, tokens or private service details—are suppressed and converted into limited "Model inspection denied" errors. A failing injected clock is also sanitized. These are source-level contracts; real infrastructure still needs a separately authenticated service, controlled server-only logs and end-to-end auditability.

### Malformed signed-evidence object isolation

The signed-receipt verifier now catches exceptions caused by malformed input objects, hostile accessors, invalid key registries or crypto-provider errors at its public boundary and exposes only a uniform denial. Ephemeral-key regression tests cover throwing envelope, scope and key-map accessors. Real production still requires pinned reviewer keys, approved source rights and private-service audit events; the code does not provision those assets.

### Authorization timing and hostile input isolation

The protected inspection reader now evaluates grant expiry **after** the asynchronous authorizer finishes and **before** the first protected record lookup. Subsequent server-clock samples must be safe integer milliseconds and cannot regress. Its public boundary suppresses unexpected errors from hostile getters on request, grant, artifact or evidence objects while retaining explicit deny reasons for ordinary invalid inputs. Offline adversarial regression tests assert that expiry during authorization produces **zero artifact loads** and private exception text never crosses the reader boundary. This is a research-only source contract, not a deployed identity provider, key service or authorization grant.

### Immutable authorization grant checkpoint

After authorization returns, the inspector snapshots the validated short-lived expiry and grant identifier before any awaited protected artifact loader or independent verifier. An authorization adapter cannot extend its own approval window or replace a grant ID while other callbacks execute. Regression tests explicitly mutate both fields during asynchronous loading and assert expiry denial before the verifier; a separate case verifies that the independent evidence callback receives the original grant identity. This is a source-only isolation invariant, not proof of a live authorization service.

### One-time authorization field capture

To close a second confirmed authorization race, the inspector captures every identity, permission and expiration field exactly once from the authorizer's returned object **before** validating it. Subsequent grant checks and independent evidence bindings refer only to that immutable snapshot. This prevents a malicious or faulty getter from returning one expiry during validation and a longer expiry at evidence projection. A regression test uses a changing-accessor grant; it must be sampled exactly once and denied when the original expiry lapses. The source-only contract does not confer authorization from a deployed service.

### Immutable request capture before ID validation

The protected inspector now copies tenant, actor, model, version, layer, feature and requested purpose values **once**, freezes them, and validates that same snapshot before authorizing. This closes a confirmed case where changing request getters passed ID validation and then substituted an invalid feature identifier in the response. Regression tests cover both valid-then-invalid and invalid-then-valid getters, ensuring one read per field and no authorization or storage access for the initially invalid scope. This remains a source-only boundary requiring real protected session validation in production.
