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

## Offline alignment and simulation research — 18 November 2026

Nova ML now includes **source-only** evaluation contracts inspired by reward-model overoptimisation, AI-written critiques, instruction following and OpenAI Five. The offline Node module scores only caller-supplied numeric/categorical claims and returns explicitly unverified research receipts. Protected Nova ML Studio may display the directions as planned research, but it does not call these evaluators, train an agent, generate critiques or handle live source records. Swift and Kotlin contain display-only negative-claim validators, not production model runtimes. No approved model, human preference dataset, real independent ground truth, inference endpoint or production rights have been granted. See `docs/intelligence/NOVA_AI_ALIGNMENT_RESEARCH_20261118.md`.
