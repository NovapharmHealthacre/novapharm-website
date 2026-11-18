# NovaPharm Trusted Evidence System Card

**Version:** 1.0.0
**Status:** release candidate, not deployed
**Reviewed:** 22 July 2026

## Intended purpose

Search & Ask NovaPharm helps a visitor find and quote approved public NovaPharm pages. The protected gateway provides bounded, non-writing review prototypes for authorised employees, board users and administrators. Neither system provides medical advice, confirms product availability, predicts an authority decision or replaces qualified human judgement.

## Architecture

1. Conventional keyword retrieval is available without a model.
2. Optional semantic retrieval uses NovaPharm Evidence Vector v1 in a browser Web Worker after explicit activation.
3. Answers are extractive combinations of exact supporting passages with canonical source links.
4. Deterministic policy rules run before an answer.
5. The protected Node gateway defaults to provider `none`; its optional Ollama adapter accepts loopback HTTP only and is disabled in production.

## Data

The public build allowlist contains approved canonical company pages, six published Insights articles and approved leadership profiles. It excludes portal routes, users, customers, suppliers, submissions, private documents, uploads, credentials, supplier pricing, unpublished products and private business-plan material. The generated manifest records source hashes, corpus hash, dates, evidence status and capability boundaries.

## Outputs

Public outputs contain an extractive answer or abstention, source title, URL, heading, supporting passage, evidence status and capability boundary. Internal outputs are candidate findings with exact record citations, a human-review requirement and no production write permission.

## Known limitations

- Sparse lexical semantics may miss synonyms outside the registered vocabulary.
- Retrieval score is relevance, not truth, recency or regulatory validation.
- Pattern-based policy controls require ongoing adversarial review.
- A source can become outdated after generation of the static corpus.
- No model can access live stock, pricing, authorisation status or portal records through the public interface.
- No independent penetration test or legal AI assurance has been completed.

## Governance basis

Controls were informed by the [ICO guidance on AI and data protection](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/about-this-guidance/), the [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) and the [UK Government AI Playbook](https://www.gov.uk/government/publications/ai-playbook-for-the-uk-government/artificial-intelligence-playbook-for-the-uk-government-html). These references do not certify the implementation.

## Human accountability

Corporate Communications owns public source approval. Quality, Regulatory, Clinical, Privacy, Security and operational owners remain accountable for their respective decisions. AI may assist retrieval and drafting; it may not approve publication, qualification, release, treatment, safety, regulatory, financial or customer decisions.

## Research-only L0 sparsity boundary (18 November 2026)

The `nova-l0-hard-concrete-research-v0` entry is **source-only research**, not a component of public Search & Ask or an active protected prediction model. Pure PyTorch, TypeScript, Swift and Kotlin hard-concrete candidates exist for offline mathematical evaluation. They contain no approved trained weights, patient records, model permission, hosted prediction endpoint, Core ML/LiteRT deployment or release sign-off. L0 regularisation is neither automatic interpretability nor a promise of smaller executable size or lower latency. Source and device-specific benchmarking, clinical exclusions, temporal holdouts, rights and governance review are mandatory before any separate deployment proposal. See `docs/intelligence/L0_SPARSE_ML_CROSS_PLATFORM_20261118.md`.

## Deep-learning compute infrastructure boundary — November 2026 source extension

The Nova ML compute architecture is a **non-executing, review-only candidate** for the protected web experience and future signed iOS and Android clients. Its source-controlled workload proposal constraints are implemented in `src/ai/compute-admission.mjs`, `native/novapharm-intelligence-apple/NovaComputePlan.swift`, and `native/novapharm-intelligence-android/NovaComputePlan.kt`. These local checks are advisory. They confer **no** authorisation to run training, request GPU capacity, upload data, access patient records or write results.

The complete source-first architecture and unfulfilled cloud, data-rights, identity, budget, security, provenance and device-release gates are in [Deep-learning infrastructure adoption](architecture/deep-learning-infrastructure-20261118.md). The historical [OpenAI 2016 infrastructure article](https://openai.com/index/infrastructure-for-deep-learning/) informs experimental reproducibility and orchestration principles, not the deployment of obsolete Python 2.7/Theano or custom autoscaling tooling.

Current owner constraint remains `productionSignoff: "not_granted"`, `monthlyCapGbp: 0`, with only GitHub source/CI/nonproduction design authorised. The public retrieval system, protected governance views, model providers and actual training services must never be conflated. There is no approved dataset, provisioned ML cluster, signed iOS or Android app, live training run or evidence of authenticated production ML activation in this source change.

## Scholarly source traceability — additional 22-reference programme

The multimodal research basis now records 22 supplied citation positions, **21 unique publications**, seven planned evaluation dimensions and 12 synthetic string-based negative controls. See `docs/intelligence/multimodal-22-reference-engineering-matrix-20261118.md`. These tests do not execute images, train a model, measure actual robustness or grant data and tenant rights. Production inference remains disabled by design.

## Offline alignment and simulation research — 18 November 2026

Nova ML now includes **source-only** evaluation contracts inspired by reward-model overoptimisation, AI-written critiques, instruction following and OpenAI Five. The offline Node module scores only caller-supplied numeric/categorical claims and returns explicitly unverified research receipts. Protected Nova ML Studio may display the directions as planned research, but it does not call these evaluators, train an agent, generate critiques or handle live source records. Swift and Kotlin contain display-only negative-claim validators, not production model runtimes. No approved model, human preference dataset, real independent ground truth, inference endpoint or production rights have been granted. See `docs/intelligence/NOVA_AI_ALIGNMENT_RESEARCH_20261118.md`.

## Deep-learning compute infrastructure boundary — November 2026 source extension

The Nova ML compute architecture is a **non-executing, review-only candidate** for the protected web experience and future signed iOS and Android clients. Its source-controlled workload proposal constraints are implemented in `src/ai/compute-admission.mjs`, `native/novapharm-intelligence-apple/NovaComputePlan.swift`, and `native/novapharm-intelligence-android/NovaComputePlan.kt`. These local checks are advisory. They confer **no** authorisation to run training, request GPU capacity, upload data, access patient records or write results.

The complete source-first architecture and unfulfilled cloud, data-rights, identity, budget, security, provenance and device-release gates are in [Deep-learning infrastructure adoption](architecture/deep-learning-infrastructure-20261118.md). The historical [OpenAI 2016 infrastructure article](https://openai.com/index/infrastructure-for-deep-learning/) informs experimental reproducibility and orchestration principles, not the deployment of obsolete Python 2.7/Theano or custom autoscaling tooling.

Current owner constraint remains `productionSignoff: "not_granted"`, `monthlyCapGbp: 0`, with only GitHub source/CI/nonproduction design authorised. The public retrieval system, protected governance views, model providers and actual training services must never be conflated. There is no approved dataset, provisioned ML cluster, signed iOS or Android app, live training run or evidence of authenticated production ML activation in this source change.

## OpenAI Signals, scientific-work evidence, Whisper, large-model training and Triton — 18 November 2026

This candidate adds a source-first OpenAI research register to the **existing protected Nova ML web workspace** and non-executing advisory review policies in JavaScript, Swift and Kotlin. Its controlled source reference is [OpenAI Signals and technical research adoption](intelligence/openai-signals-whisper-triton-integration-20261118.md). The source register contains ten scientific/economic reports, two Signals data/methodology resources, and three neural-network/speech/GPU engineering references.

The only permitted current usage is **non-clinical evidence reading and review of publicly aggregated statistics**. Signals v3 public CSV datasets are described under CC BY 4.0 and are **not downloaded or ingested** by this source change. The JavaScript validator allowlists three aggregate-only schemas, rejects raw message/prompt or patient fields, and explicitly distinguishes per-capita ranks from demand or business performance. No OpenAI Enterprise account usage, personal messages, API credentials, vendor metrics, medicine-level inferences or clinical conclusions are accessible.

Whisper is a historical speech-recognition technology reference, **not an active recorder, transcription model or API integration**. GPU parallel training and Triton are design candidates only: no cluster, training code, kernel compilation, managed spend or service deployment. All client-side evaluations return `executionEnabled: false`. Real permitted work would require a trusted authenticated backend, model rights, data privacy review, reproducible evaluation, native app signing and owner production sign-off.

**Avoid use-maturity confusion:** source-level CI and a protected research explanation do not establish a deployed Intelligence production image, a signed iOS/Android application, consent for audio, or the validity of any pharmaceutical or regulatory conclusion.

**Additional local data-review implementation:** `src/ai/intelligence-openai-signals-csv.mjs` validates aggregate-only headers and bounded CSV rows; `scripts/data/review-openai-signals-csv.mjs` produces a local SHA-256/record-count dry-run receipt. It intentionally never stores or approves data. Local checks are not an authoritative dataset source or production data-ingestion service.
