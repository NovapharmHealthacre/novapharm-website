# Oncology and Trusted AI Red-Team Report

- Review date: 22 July 2026
- Candidate branch: `feature/oncology-ai-platform`
- Scope: public Oncology experience, public evidence search, protected internal AI gateway and cross-site integration
- Current status: repository-level controls passed; exact-head Chromium/WebKit acceptance remains pending

## A. Oncology Procurement Leader

| Review question | Evidence observed | Result |
| --- | --- | --- |
| Is NovaPharm's role understandable? | The hero and scope boundary describe a B2B continuity and readiness model across formulation, source, quality, condition, regulatory and access decisions. | Passed |
| Is the non-operational boundary clear? | The first viewport states that NovaPharm does not present current oncology products, stock, marketing authorisations, WDA(H) status, NHS supply or patient services. | Passed |
| Is the evidence needed for engagement visible? | Six readiness dimensions identify the control question, expected evidence and hold/stop trigger. | Passed |
| Can a buyer distinguish decision support from availability? | Product-readiness and sourcing content avoids inventory, price, availability and approval outputs; the public assistant refuses those requests. | Passed |
| Is the next step appropriate? | Qualified product owners, manufacturers, authorised suppliers, buyers and specialists are directed to contextual, non-confidential B2B enquiry routes. | Passed |

## B. Oncology Digital Design Leader

| Review question | Evidence observed | Result |
| --- | --- | --- |
| Does the page have an original information architecture? | Thirteen sections include a six-axis continuity model, formulation navigator, three-pillar sourcing route, readiness matrix, five-stage condition path and seven-stage development-to-access pathway. | Passed at source level |
| Is imagery evidence-led rather than decorative? | Licensed scientific photographs have route limits, provenance, captions and explicit non-ownership boundaries. The Product Portfolio now has a distinct unbranded evidence hero. | Passed |
| Is the interface calm and pharmaceutical? | Typography, spacing, dark/light bands, limited motion and structured tables follow the existing NovaPharm visual system. | Passed by visual contracts |
| Does it remain usable at all required sizes and in WebKit? | The exact 12-viewport Chromium/WebKit matrix is configured with guarded screenshots, text-overflow checks and no-JavaScript cases. | Pending exact-head workflow |

## C. UK Regulatory Reviewer

| Misinterpretation tested | Control | Result |
| --- | --- | --- |
| NovaPharm holds a WDA(H) or other current wholesale authorisation. | Visible boundary copy, source-backed status language and prohibited-claim tests reject the inference. | Passed |
| Oncology products are stocked, approved or available. | No product list, price, stock or availability result is published; representative media is labelled. | Passed |
| NovaPharm supplies NHS organisations. | NHS supply and commercial-contract claims are excluded from the approved evidence register. | Passed |
| NovaPharm gives patient, dosage or treatment advice. | Public copy remains corporate/B2B; medical and safety requests are refused before retrieval. | Passed |
| NovaPharm is a clinical-trial sponsor or full-service CRO. | Oncology links to the CRO responsibility lanes, which preserve sponsor and qualified-specialist duties. | Passed |
| NovaPharm owns pictured laboratories, manufacturing or distribution infrastructure. | Every relevant image caption states the representative boundary; no ownership claim is made. | Passed |
| AI forecasts, automates release or guarantees outcomes. | The maturity model labels forecasting and traceability as roadmap items and keeps release decisions human. | Passed |

The public claims scanner found zero prohibited high-risk phrases across the Oncology and Responsible AI pages. This is a publication-control test, not legal or regulatory approval.

## D. AI Safety Reviewer

| Attack or failure mode | Implemented control | Actual local result |
| --- | --- | --- |
| Unsupported or hallucinated answer | Retrieval is restricted to 30 approved public sources and 361 deterministic chunks; answers expose cited source passages or abstain. | 180-question benchmark passed; 100% unknown abstention |
| Medical, dosage or safety advice | Policy gate runs before retrieval and returns a controlled safety boundary. | 80 prohibited tests produced zero prohibited answers |
| Prompt injection | System-override, hidden-instruction, source-bypass and exfiltration patterns are rejected. | 12 focused attacks passed; zero injection successes |
| Private-content exposure | Public index excludes portal and private sources; internal gateway requires employee, board or admin scope and source-class permission. | Source and role gates passed |
| Cross-customer access | Existing server-side customer isolation remains authoritative; AI performs no direct record write or unscoped data access. | Enterprise portal isolation tests passed |
| External model leakage | Public retrieval uses no external inference endpoint. Internal provider defaults to `none`; optional Ollama is loopback-only and disabled in production. | Privacy and provider-boundary tests passed |
| False confidence | The exact abstention text is used when approved evidence cannot verify a claim. | Unknown-answer accuracy 100% |

Independent penetration testing and qualified human review remain required before any internal generative provider is enabled with confidential information.

## E. Performance and Accessibility Reviewer

| Control | Actual local evidence | Result |
| --- | --- | --- |
| Initial-load impact | The entry script is 993 bytes and model/index transfer is zero until the user explicitly opens or enables the feature. | Passed |
| Optional asset budget | Public knowledge index, embeddings and model metadata total 1,148,511 uncompressed bytes; no WASM or WebGPU dependency is used. | Passed |
| Deterministic retrieval | The Node performance gate enforces p95 below 50 ms and prints the observed timing in every run. | Passed |
| No-JavaScript access | Oncology, Responsible AI and the search directory retain canonical content and links without JavaScript. | Passed structurally |
| Reduced motion | CSS and browser harness disable non-essential Oncology and AI motion while preserving content. | Passed structurally; rendered confirmation pending |
| Keyboard and assistive semantics | Native dialog controls, forms, buttons, disclosures, table semantics, labels and live regions are present. | Passed structurally; Axe and manual review pending exact-head workflow |
| Storage denied and AI unavailable | Semantic retrieval continues for the current tab without claiming persistence; conventional directory and controlled unavailable states remain usable. | Implemented; rendered confirmation pending |

## Material Findings Resolved

1. One-word retrieval could return weak matches. A minimum matched-term threshold now prevents unsupported low-signal answers.
2. Private-document exfiltration phrasing was broader than the first policy set. Requests to reveal, print, list or access private records and credentials are now blocked.
3. Storage denial originally left a misleading cache control visible. The current UI states that retrieval is tab-only and hides the unavailable cache action.
4. A product photograph was reused on an unrelated AI social preview. Responsible AI now uses a governed evidence-review image.
5. The oncology vial photograph exceeded the two-placement visual policy. Product Portfolio now uses a dedicated unbranded evidence hero.
6. Oncology linked to a retired CRO anchor. The link now targets the live delivery architecture.
7. The CRO navigation test predated the new Oncology item. The contract now verifies the intentional ten-item public navigation.

## Residual Review Gates

- Exact-head Chromium and WebKit matrix, 12 viewports per engine, JavaScript on/off, AI state matrix and Axe scans.
- Human keyboard and screen-reader review before any full WCAG conformance claim.
- UK legal, regulatory and insurance review before oncology or CRO commercial engagement.
- Owner approval of Oncology as a top-level navigation item and of any named future category.
- Independent security testing before confidential internal AI use.
- Separate approval before local Ollama or any experimental browser model is enabled.

No regulatory approval, product availability, NHS supply, owned infrastructure, forecast accuracy or clinical outcome is approved by this report.
