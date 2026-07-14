# NovaPharm Premium Visual Refinement Audit

Status: implemented on review branch  
Branch: `visual/premium-pharma-refinement`  
Source brief: owner-approved 16-module visual refinement instruction, reviewed 14 July 2026

## Executive assessment

The pre-refinement website already had a strong information architecture, regulatory-claims framework, product photography and SEO/GEO system. The principal visual weakness was inconsistency: product cards used credible photography while several high-visibility corporate sections relied on generic geometry, flat text grids or editorial SVG illustrations. This phase extends the product section's realistic image language across the public corporate experience without implying that NovaPharm owns the pictured facilities, products, laboratories or logistics assets.

A motion-enhanced still-image hero was selected instead of a background video. It provides depth, parallax, animated network signals and an explicit pause control while avoiding the bandwidth, autoplay and mobile-performance costs of video. The experience respects `prefers-reduced-motion`.

## Sixteen-module implementation matrix

| Module | Requirement | Implementation |
|---|---|---|
| 1 | Continue from current merged state | Branch created from the current `main` release after the SEO/GEO merge and verified Pages publication. Azure, portal and data architecture are unchanged. |
| 2 | Premium, corporate, credible visual direction | Added a restrained image-led system using slate, white, NovaPharm red, realistic licensed photography, editorial typography and controlled motion. |
| 3 | Leadership portrait replacement and consistency | Preserved the approved repository portraits for Vishal Chakravarty, Prabhakar Vitthal Lahare and Dr Girish Shantilal Achliya; added consistent crops, colour treatment, aspect handling and responsive presentation. No portrait was fabricated for Dr Helly Panchal or Dr Nishita Trivedi because no approved image file was supplied in this run. |
| 4 | Homepage hero improvement | Rebuilt as a cinematic motion-enhanced hero with the existing high-resolution supply-network photograph, animated grid, orbit, governed-signal cards, subtle pointer parallax, pause/play control and reduced-motion fallback. No sound, video or heavy third-party library is used. |
| 5 | Regulatory Foundation roadmap | Converted the plain list into a premium seven-stage visual roadmap. The seventh gate is explicit: commercial release only after applicable authorisation. Desktop and mobile sequences remain readable. |
| 6 | Replace Batch Integrity illustration | Removed the SVG-led treatment and introduced a full photographic feature using licensed controlled-logistics imagery, an evidence checklist and an ownership/status disclosure. |
| 7 | Redesign qualified collaboration section | Replaced flat text tiles with eight image-led homepage cards and ten cards on the Partners page, each with purpose-specific copy and representative-photo disclosure. |
| 8 | Services, Regulatory, Partners and Technology | Added photo-backed page heroes, image-led editorial introductions, supporting galleries, service-specific imagery, a staged regulatory layout, partner imagery and a photographic technology story. |
| 9 | Whole-site visual audit | Improved page rhythm, section transitions, whitespace, hover states, motion, CTA context, leadership crops and visual hierarchy while preserving the existing brand and content system. |
| 10 | Image and media rules | Reused already licensed and validated AVIF/WebP/JPEG assets from the product pipeline. Every new use has accurate alt text or is decorative, dimensions and a clear representative-image disclosure. |
| 11 | Compliance guardrails | Retained pre-operational, B2B-only and authorisation-dependent language. No image caption or copy claims current stock, a NovaPharm-owned facility, an MHRA authorisation, NHS supply or a confirmed partner. |
| 12 | Performance, accessibility and responsiveness | Uses native HTML/CSS/JS only; no third-party runtime. Includes responsive layouts, explicit image dimensions, modern formats, lazy loading, focusable motion control, reduced-motion support and progressive reveal fallback. |
| 13 | Execution approach | Deterministic post-build materialisation, generated-output validation, branch CI and browser acceptance are required before owner review. |
| 14 | Deliverables | Branch, PR, redesigned-section register, motion decision, media register, review guidance and validation results are recorded in the PR and final review report. |
| 15 | Owner interaction | Repository-controlled work proceeds autonomously. Only missing approved portrait binaries or external production steps remain owner-controlled. |
| 16 | Final standard | The result is less generic, more coherent, photographically grounded and aligned with a serious regulated B2B pharmaceutical company, without overstatement. |

## Media provenance and claim boundary

The refinement uses images already present in the repository's licensed product-media pipeline:

- controlled manufacturing and packaging;
- quality-control documentation;
- oral-liquid analysis;
- specialty sample handling;
- oncology vial handling;
- unbranded packaging review;
- laboratory analysis;
- controlled logistics cartons.

They are representative stock photographs. They do not identify NovaPharm-owned premises, current inventory, an authorised NovaPharm product, a current partner, a current NHS relationship or an achieved regulated operation.

## Portrait status

Approved images used:

- `assets/vishalchakravarty.jpeg`
- `assets/prabhakarvitthallahare.jpeg`
- `assets/girishshantilalachliya.jpeg`

No approved portrait was available in this run for:

- Dr Helly Panchal
- Dr Nishita Trivedi

Their existing conservative placeholders remain preferable to fabricated images.

## Acceptance requirements

Before merge:

1. deterministic build completes;
2. the dedicated visual validator passes;
3. production readiness passes;
4. SEO/GEO authority validation remains green;
5. Chromium and WebKit rendering passes across the existing viewport matrix;
6. mobile motion, navigation, text contrast and image crops receive human review;
7. the owner separately approves merge.
