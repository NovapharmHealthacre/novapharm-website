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
