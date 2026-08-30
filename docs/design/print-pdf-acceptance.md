# Print and PDF acceptance

Review date: 28 August 2026

## Print contract

The corporate stylesheet contains a dedicated print mode that:

- removes global, local and range navigation, action groups, cookie UI and nonessential footer navigation;
- neutralises sticky/fixed positioning and viewport-height presentation;
- removes hero background media while retaining the semantic title and introduction;
- forces black text on white;
- uses a `16mm` page margin and stable print type sizes;
- avoids breaks inside product cards and Notice components;
- preserves company, regulatory and medical disclosures in the printed footer;
- prevents generated link URLs from obscuring page composition.

## Required route matrix

| Route | Blank page | Navigation over content | Missing text | Pale/clipped text | Critical break | Exact-candidate result |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | None | None | None | None | None | Pass; 2 pages |
| `/about/` | None | None | None | None | None | Pass; 2 pages |
| `/services/` | None | None | None | None | Six complete service decisions remain intact | Pass; 5 pages |
| `/regulatory-services/` | None | None | None | None | Roadmap sequence and Batch Integrity remain readable | Pass; 4 pages |
| `/cro/` | None | None | None | None | Responsibility model remains readable | Pass; 3 pages |
| `/oncology/` | None | None | None | None | No empty scientific-media page | Pass; 5 pages |
| `/products/` | None | None | None | None | Both portfolio decisions, governance and notices remain connected | Pass; 3 pages |
| `/partner-with-us/` | None | None | None | None | None | Pass; 4 pages |
| `/technology/` | None | None | None | None | Maturity labels remain associated | Pass; 3 pages |
| `/news-insights/` | None | None | None | None | Article grouping remains clear | Pass; 3 pages |
| `/contact/` | None | None | None | None | Public safety and verified email routes remain legible | Pass; 2 pages |
| `/account-application/` | None | None | None | None | Lifecycle and approval boundary remain visible | Pass; 3 pages |

## Rendered result

`npm run corporate:print:validate` generated 12 tagged A4 PDFs and rendered all 39 PDF pages back to PNG at 72 DPI. The harness rejected visible navigation/cookie controls, fixed or sticky print elements, missing H1/main content, HTML overflow, PDF page-count mismatch and blank or near-blank rendered pages. Each PDF received a SHA-256 digest in the temporary run manifest generated at `2026-08-28T14:58:57.693Z`.

Human inspection covered the homepage, Services, Regulatory roadmap and Batch Integrity section, Oncology, both Products portfolios, Contact safety states and the account lifecycle. The review corrected a printed skip-link, an isolated product-image page, a split strategic-portfolio heading, incomplete product context, split service decisions and an over-padded screen footer that had overridden print CSS. The final Products document is three balanced pages and preserves all required regulatory and medical notices; every Services decision remains intact without a split panel.

These local PDFs are test intermediates and are not published downloads. The accepted implementation was committed unchanged as `9f49161425790596413051a2b00cedeae51905a9`; managed-staging browser print remains a separate production gate.
