# Nova ML alignment and multi-agent simulation research — 18 November 2026

**Status:** source-only, offline, synthetic research. **Production approved:** no. **Customer-visible:** no. No OpenAI proprietary weights, service integration, human preference labels, pharmaceutical rights, mobile app or deployed inference is included.

## Research reviewed and NovaPharm adaptation

| Paper | Verified methodology | NovaPharm research adaptation | Important non-equivalence |
| --- | --- | --- | --- |
| [Scaling laws for reward model overoptimization](https://openai.com/index/scaling-laws-for-reward-model-overoptimization/) / [Gao et al., arXiv:2210.10760](https://arxiv.org/abs/2210.10760) | A proxy reward can be Goodharted: more proxy optimization may worsen independent reward; best-of-n and RL show different scaling relationships. | Pure offline sweep comparison of ordered proxy and supposedly independent scores, with overoptimization warnings. | Current function does **not** fit the paper's scaling law, estimate KL effects, verify genuine reward independence or optimise models. |
| [AI-written critiques help humans notice flaws](https://openai.com/index/critiques/) / [Saunders et al., arXiv:2206.05802](https://arxiv.org/abs/2206.05802) | Critique-writing may help human assessors notice defects missed unaided; critique generation and flaw discrimination are distinct. | Compare suggested flaw IDs against separately adjudicated IDs; require blinded reviewer study before validating benefit. | This scorer does **not** write critiques, establish true flaws, verify evidence or prove independent adjudication. |
| [Aligning language models to follow instructions](https://openai.com/index/instruction-following/) / [Ouyang et al., arXiv:2203.02155](https://arxiv.org/abs/2203.02155) | Supervised demonstrations, human preference comparisons, reward modelling, PPO and real human evaluation improved instruction-following. | Enumerated requirement/violation conformance diagnostics with prohibited-action detection and review. | This is **not** RLHF, SFT, PPO, model fine-tuning, a permission engine or an instruction-hierarchy certification. |
| [Dota 2 with large scale deep reinforcement learning](https://openai.com/index/dota-2-with-large-scale-deep-reinforcement-learning/) / [Berner et al., arXiv:1912.06680](https://arxiv.org/abs/1912.06680) | Multi-agent self-play in a complex long-horizon partially observed environment with distributed reinforcement learning. | Offline synthetic multi-step operational scenarios for safe strategy evaluation, with unsafe-action reporting and discounted reward arithmetic. | No Dota environment, self-play, distributed RL, active agent, simulator validation, real stock action, procurement or regulated decision. |

The paper outcomes cannot be transferred directly into pharmaceutical effectiveness claims. Study implementations and outputs are never scientific validation without real approved datasets, isolated evaluation and independent human adjudication.

## Source modules and contracts

- `src/core/ai/nova-alignment-research.mjs`: zero-network deterministic research-only functions `assessRewardProxySweep`, `evaluateCritiqueAssistance`, `evaluateInstructionConformance`, `assessOfflineScenarioRollouts`. Inputs contain opaque identifiers, numerical metrics and categorical flags; no prompts, patient records, third-party data or external API.
- `scripts/test-nova-alignment-research.mjs`: arithmetic, negatives, overoptimization detection, incomplete critique coverage, forbidden-rule violations, simulated unsafe-action flags and non-release invariants.
- The four existing protected Nova ML workspaces remain four modules, and the 22 canonical Medicines Intelligence workspaces are unchanged. The catalogue shows **planned research** only.
- Native Apple and Android code contain read-only versioned research-receipt validators for future native app use; they are not phone applications, app signatures, native model runtimes or live endpoints.

All receipts are stamped `researchOnly:true`, `productionApproved:false`, `customerVisible:false`, `independentGroundTruthVerified:false`, `dataRightsVerified:false`, `humanAdjudicationRequired:true`. These fields are negative research disclaimers; a caller may not turn them into authenticated production authority. Every research evaluator accepts only a precisely bounded, typed schema and excludes free text and arbitrary extra fields.

## Pharmaceutical use cases under evaluation

- **NHS demand, stock availability and supply-chain planning:** check whether maximising a proxy forecast KPI worsens independent held-out operational outcomes. The original medicine rights/identity/evidence, horizon cutoff and calibration gates remain separate.
- **Supplier and source quality:** use critique suggestions to prompt qualified human reviewers to inspect missing records, mismatched versions and faulty traceability. A suggested critique does not confer qualification or reject a supplier.
- **NOVA research assistance:** benchmark whether source-cited summaries obey approved question scope, no patient data, abstention, tenant boundaries and no clinical decisions. Do not train from unchecked customer prompts.
- **Distribution/WMS planning:** compare simulated replenishment/FEFO outcomes only in synthetic or approved read-only sandboxes; no live picks, dispensing, supplier purchasing, batch release, inventory edits or autonomous operations.

## Further work required before model training or any release

1. Establish permitted data sources, provenance, residency, commercial/derivative-model rights, retention and strict no-PHI default. Do not use production medicine rights or source records through the research scorer.
2. Obtain independent gold/adjudication records and create a blind human-only vs human-plus-critique evaluation. Define baseline false positives and differential performance; do not reuse one model's preference score as truth.
3. Freeze model/version, evaluator version, reward-model proxy and independent outcome, chronological holdouts, cohort definitions, random seeds, falsification cases, worst-case tails and data drift.
4. For any future RL experiment, construct an independently validated sandbox environment that enforces irreversible-action prohibition, state/action constraints, rate/cost budgets, off-policy evaluation and explicit abort/fallback; never assume Dota-style self-play safely generalises to real pharmacies.
5. Benchmark against non-ML and existing rule-based/source-first baselines; measure calibration, abstention, quality, cost and device-specific runtime only after an approved model exists.
6. Require owner-approved rights, Quality/Regulatory and Clinical review if applicable, Security/Privacy, independent science review, tenancy and access tests, model licence and signed release manifest, rollback, real iOS/Android builds and exact production SHA receipt.

**Owner production restrictions:** `config/intelligence/owner-production-constraints.json` currently states zero incremental spend, `productionSignoff: not_granted`, no public customer activation, no paid cloud mutation, and no DNS/API cutover. This PR is strictly repository-only. A green workflow or GitHub merge would not prove a live protected Nova ML release. Existing Nova ML release issues #780 and #824 remain open.

## Reproducible tests

```sh
node --test scripts/test-nova-alignment-research.mjs
node --test scripts/test-nova-ml-apple-adaptation.mjs
swift test --package-path native/novapharm-intelligence-apple
```

SwiftPM requires macOS/Xcode for Apple SDKs. Kotlin tests require an installed versioned Kotlin compiler/JDK; a compiler job is not an Android Studio, physical-device or Play Store test.
