# CRO Red-Team Report

Candidate date: 18 July 2026

Status: repository candidate passed the implemented red-team controls; commercial and legal owner gates remain

## Adversarial question

Could a reasonable sponsor, regulator, search engine or commercial counterparty read the new section as evidence that NovaPharm is an operational full-service CRO, a clinical-trial sponsor, an investigator-site network, an in-house biometrics provider or an owner of clinical infrastructure?

The final candidate answers **no**. The first viewport, delivery model, service modules, decision framework, FAQs, structured data, image captions and contact route all preserve the narrower evidenced proposition: programme framing, UK pathway coordination, responsibility mapping, controlled evidence, specialist-provider orchestration and development-to-market continuity.

## Attacks applied

| Attack | Candidate control | Result |
| --- | --- | --- |
| Read only the hero and CTA. | Hero says NovaPharm coordinates specialist contributors; an immediate scope boundary rejects full-service CRO, sponsor, site-network and in-house biometrics interpretations. | Passed |
| Read only headings and cards. | Three responsibility lanes distinguish NovaPharm-led, qualified specialist and sponsor-retained work. | Passed |
| Treat strategic therapeutic interest as trial history. | Focus-area copy explicitly says it is strategic interest, not completed NovaPharm trial experience. | Passed |
| Treat a conceptual image as a real NovaPharm study, team or facility. | Both images have visible representative-use captions, accurate alt text and provenance controls. | Passed |
| Assume delegation transfers sponsor duties. | Sponsor-retained lane, quality section, FAQ and MHRA/HRA sources preserve sponsor accountability. | Passed |
| Assume a decision-framework option is a delivered internal service. | Every option identifies direct, specialist or no-fit routing; full-service execution routes away from NovaPharm. | Passed |
| Submit patient or safety information through the CTA. | Page and contact route warn against patient-identifiable, adverse-event and urgent medical information. | Passed |
| Disable JavaScript. | Lifecycle, services, decision options, FAQs, links and status boundaries remain visible and usable. | Passed in Chromium and WebKit |
| Use a narrow or short viewport. | The 320 px through 1920 px acceptance matrix detected no clipping, overflow or text collision. | Passed |
| Inspect private or runtime surfaces for accidental CRO promotion. | CRO is linked only as a public capability; protected pages retain noindex and role enforcement. | Passed |

## Defects found and corrected

1. The initial challenge-panel kicker did not meet the contrast threshold. A higher-specificity colour rule now passes Axe.
2. The Services dark related-capability label inherited a low-contrast editorial colour. The dark-section semantic override now passes.
3. A Technology status label overflowed at 1280 px. The grid and wrapping constraints were corrected.
4. WebKit's no-JavaScript test initially inspected styles before page load. The acceptance harness now waits for the document load event before measuring.
5. The mobile lifecycle control used horizontal scrolling, hiding stage context. It now uses a stable two-column grid.
6. The first decision framework did not provide an explicit no-fit route. Full-service trial execution now directs the sponsor to an established full-service CRO.
7. Generated HTML contained trailing whitespace. The generator was corrected and the outputs rebuilt.
8. The uncompressed local static server delayed first paint. A deterministic CSS bundle and the production Node runtime's Brotli/Gzip delivery reduced median mobile LCP to 1.50 seconds.

## Residual gates

- Owner approval of the public label **Clinical Research & CRO Support**.
- UK legal review of engagement terms, responsibility wording, insurance and clinical-research liability before paid work is accepted.
- Evidence review and written permission before publishing any named provider, client, testimonial, case study, metric or logo.
- Programme-specific regulatory advice must come from appropriately qualified professionals and current official guidance.

No full-service CRO, trial delivery, site-network, laboratory, biometrics, sponsor, approval, trial-volume or success-rate claim has been approved by this report.
