# Nova ML: L0 hard-concrete sparse neural-network research — cross-platform adoption

**Review:** 18 November 2026. **Status:** source-only research candidate. **Production / customer access:** disabled. **Model weights:** none approved, bundled or deployed. **Mobile apps:** no signed iOS or Android application supplied by this change.

## Research inspected

- [OpenAI publication, 4 December 2017](https://openai.com/index/learning-sparse-neural-networks-through-l0-regularization/)
- [Louizos, Welling and Kingma, ICLR 2018 / arXiv:1712.01312](https://arxiv.org/abs/1712.01312), especially sections 2.1–2.4, equations 7–13 and structured/group sparsity.
- [Original authors' example code](https://github.com/AMLab-Amsterdam/L0_regularization), MIT-licensed but archived and unmaintained. NovaPharm implements the mathematical method independently and does not vendor its historical training dependencies.
- [Apple Core ML Tools, PyTorch conversion](https://apple.github.io/coremltools/docs-guides/source/convert-pytorch-workflow.html) and [Android LiteRT on-device guidance](https://developer.android.com/ai/custom). Both require separate deployment-specific verification.

### What is implemented

| Layer | New source | Scope, not a claim of live integration |
| --- | --- | --- |
| Private model-training research | `tooling/python/nova_l0_sparsity.py` | PyTorch `HardConcreteFeatureGates`, expected active-feature penalty, stochastic reparameterised training gates, deterministic frozen export. No file/network I/O or datasets. Training requires a separately governed offline research environment. |
| Web/shared numerical contract | `packages/medicines-intelligence/src/l0-sparsity.ts` | Typed gate equations, candidate compile, offline score and validation. Exported from the existing shared medicines package. **Not** imported into a public or authenticated API prediction route, and does not create a usable forecasting service. |
| Protected web model catalogue | `apps/portal/data/nova-ml-modules.ts` | Research-only L0 evaluation listed within existing Nova ML Studio and Core Runtime governance. Existing four submodules / 22 Intelligence workspaces and protected login are unchanged. |
| Apple | `native/novapharm-intelligence-apple/NovaL0ResearchMath.swift` | Hard-concrete numeric parity candidate, included in existing Swift Package and tests. Current Core ML runtime still requires a separately reviewed bundled `.mlmodelc`, matching identity, licence and schema. No app, weights or live inference. |
| Android | `native/novapharm-intelligence-android/` | Independent Kotlin reference math and offline test. **No** Android Gradle project, native application, LiteRT binary, app signing, installed release or live screen. |

## Algorithm (no OpenAI API or externally hosted endpoint)

Each learned weight or feature group has trainable `logAlpha`. A training-time stochastic gate samples a binary-concrete random variable, stretches it into `(gamma,zeta)` and clamps it to `[0,1]`. This permits exact zeros, differentiable gradients in the non-clamped region and SGD training. The differentiable complexity term is

```
L = task_loss + lambda * sum_j sigmoid(logAlpha[j] - temperature * ln(-gamma/zeta))
```

The expected active count is a probability sum, **not** a measurement of actual latency or memory savings. At inference the paper uses deterministic gates:

```
gate[j] = clip(sigmoid(logAlpha[j]) * (zeta-gamma) + gamma, 0, 1)
effectiveWeight[j] = trainedWeight[j] * gate[j]
```

Defaults here are temperature `2/3`, gamma `-0.1` and zeta `1.1`. Hard-concrete weights are not an interpretation/explanation guarantee. Separate permutation, ablation and domain-expert tests are necessary before describing important features.

## NovaPharm-specific use cases — priorities, not released features

1. **Pharmaceutical demand research:** evaluate whether source-governed, time-aligned demand factors can support a smaller alternative to the existing seasonal-naive/Holt candidate. Do not mix EPD, PCA, SCMD, stock, formulary and pricing measures without harmonised grain, units, publisher rights and cutoff lineage. Do not make customer-facing supply claims.
2. **Inventory and FEFO anomaly detection:** evaluate nonclinical operational anomaly features only when stock, lot, shelf-life and supplier contracts permit modelling; human QP/QA decisions stay authoritative.
3. **Source and terminology matching:** evaluate sparse feature selectors on independently adjudicated candidate pairs. A learned score must never override SNOMED, dm+d, regulator identifier, exact provenance, source rights or medicine admission checks.
4. **Device efficiency:** benchmark compact, non-sensitive task-specific models on representative Android and Apple hardware only after model approval; structured feature/channel pruning is more likely to yield acceleration than arbitrary unstructured zeros.

## Experiment acceptance before ANY model deployment

- **Rights and privacy:** signed source-specific commercial modelling, derivative-work, jurisdiction, retention and customer-display permissions; zero patient identifiable data by default. No training from user clicks, private uploads or medical records without separately authorised governance.
- **Methodology:** immutable eligible dataset and publication dates; temporal feature-cutoff checks; no training/validation/holdout duplication; data quality, missingness and cohort drift review; standardisation parameters fitted on train only and frozen with the model.
- **Comparators:** dense same-capacity model; existing seasonal-naive/Holt forecasters where appropriate; simple sparse/L1 model; reject L0 if performance, stability, cost or maintainability does not improve.
- **Metrics:** error MAE/WAPE/sMAPE and bias for forecasts, recall/precision/FPR for anomalies, subgroup performance, robustness, distribution shift, expected versus realised nonzero counts, CPU/memory/battery/latency on hardware, bundle size, startup time and runtime cost.
- **Validation:** train on approved historical releases, calibrate separately where needed, test on untouched chronological holdouts, assess zero-demand, structural breaks, sparse groups, missing features, shifts and data revocation. No uncalibrated confidence/probability UI.
- **Reproducibility:** fixed random seeds, dependency/SBOM register, versioned model and preprocessing schema, signed SHA-256 artifact and training provenance, independent numerical golden vectors, audit trail and rollback.
- **Security:** trusted server-side tenant/role and model entitlement validation, data-minimisation, bounded input schema, offline-only by default, anti-tamper and revoked-model rejection. **Never** trust a caller-supplied `productionApproved` flag as authorisation.
- **Independent release:** technical validation + Quality/Regulatory + Privacy/Security + model/source owner + product approval + exact-head CI + iOS/Android/WebKit/Chromium and real-device smoke receipts. No autonomous dispensing, clinical dosing, regulatory, availability, purchasing or stock-release decisions.

## Release and testing boundaries

- Run `npm run test --workspace=@novapharm/medicines-intelligence` and `npm run typecheck --workspace=@novapharm/medicines-intelligence` after installing pinned repository dependencies.
- With a reviewed PyTorch environment, run `python3 -m unittest discover -s tooling/python -p test_nova_l0_sparsity.py`. These tests use synthetic tensors only.
- With Xcode, run `swift test --package-path native/novapharm-intelligence-apple`.
- With a Kotlin compiler, run the offline command in `native/novapharm-intelligence-android/README.md`.
- Tests of mathematical identities and compileability **do not** establish medical model validity, accuracy, inference speed, hardware support, an App Store or Play Store build, production database access, model licence approval, or deployment.

The existing `docs/intelligence/forecast-release-acceptance.md` and medicine rights/evidence gates remain controlling. Existing data records, customer forecasting flags, production schemas, paid features, user entitlements and deployment settings must not be changed by this research branch.
