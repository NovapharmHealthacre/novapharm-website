# Brand Governance

Status: repository controls implemented; authoritative 93-file owner pack integrated
Review date: 13 August 2026
Owner: NovaPharm Healthcare Ltd

## Authoritative identity

- Public brand name: `NovaPharm Healthcare`.
- Legal name where required: `NOVAPHARM HEALTHCARE LTD`.
- Company number: `16716501`.
- Official source logo: `assets/brand/novapharm-healthcare-logo.svg`.
- Approved raster fallback: `assets/brand/novapharm-healthcare-logo.png`.
- Authoritative primary colour: Royal Cochineal Crimson `#9D1B32` (`rgb(157 27 50)`).
- Governed source archive: `creative-assets/brand/novapharm-logo-asset-pack/`.
- Approved small-format identity: `assets/brand/favicon.svg`, derived in the owner-supplied pack from the `N` and original arc for legibility.
- Approved reverse, monochrome, PWA, Apple-touch and social variants are listed in `final-report/official-logo-register.md`.
- Public executive designation: Vishal Chakravarty, `Chief Executive Officer`.
- Founder and statutory-director facts are separate governance relationships, not part of the executive title.

The horizontal logo must not be retyped, redrawn, recoloured, stretched, cropped or replaced with the small-format monogram. Use the path-based red wordmark on light surfaces, the supplied reverse artwork on approved dark/red surfaces, and the supplied monochrome artwork only where a one-colour implementation is necessary. The monogram is reserved for favicon, PWA, Apple application and similarly constrained square surfaces.

## Application use

Application build scripts copy the approved delivery assets and checksum tests verify byte identity where duplicated for framework public directories. Header, footer, portal and structured-data references use the horizontal identity; browser and application metadata use the approved small-format assets. PDF, EPS, 8K PNG and Apple-native source masters remain outside ordinary public web delivery.

## Visual system

The selected direction is `Regulated Continuum`. The palette uses midnight navy, warm white, graphite, cool grey, muted silver and NovaPharm red as a controlled accent. Red is not a page background default and cannot be the only status signal. Cards use restrained radii and are limited to real item groupings or tools.

Royal Cochineal Crimson `#9D1B32` remains the canonical identity colour for the logo, graphical accents, fills and borders. The governed darker derivative `#68101F` is used when red is foreground text on white or neutral surfaces, particularly for small labels and links. This accessibility treatment does not recolour or alter the official logo; it preserves a minimum contrast margin across the estate's approved neutral surfaces.

## Media and portraits

- Every media asset requires source, rights, acquisition/review date, subject, crop, alt text and misleading-implication review.
- Representative third-party laboratories, warehouses or supply environments must not be presented as NovaPharm-owned.
- Only approved real executive portraits may represent named people.
- Missing approved portraits use a controlled neutral no-image state, never a generated likeness.
- Partner logos require permission and cannot replace NovaPharm identity.

## Change control

Logo-source changes require owner approval and checksum updates. New colours, typefaces, logo variants or executive images require brand and accessibility review. `npm run brand:validate` enforces the pack count, all registered checksums, byte identity of the public subset, path-only SVG safety, primary colour and raster dimensions. Changes must also pass visual regression, high-density rendering, mobile size, contrast, alt-text and layout-shift checks.

Evidence: `final-report/official-logo-register.md`, `creative-assets/asset-register.json`, `creative-assets/visual-provenance.md`, `packages/design-system/` and `audit/evidence/design-system/`.


## Superseding owner decision — 22 November 2026

The corporate identity is Royal Cochineal Crimson `#9D1B32` (RGB 157, 27, 50), with accessible deep hover shade `#68101F`. The separate NovaPharm Distribution primary logo uses Near-black Garnet `#3D0B13`. This decision supersedes August 2026 references to the former Economist Red. Approved reverse/monochrome variants retain their contrast-specific uses. Unrecoloured PNG, ICO, application-icon and social-card files in the earlier asset pack remain historical derivatives and require a separately verified re-render before they may be described as colour-current.

## Superseding owner decision — Sovereign Black, 22 November 2026

The official default on-screen black is **NovaPharm Sovereign Black `#0B0B0E`** (RGB 11, 11, 14). It governs primary body copy, headings, navigation text, standard labels, and neutral primary actions across the corporate website, Portal, Intelligence/technology, and Distribution interfaces wherever a dark-on-light colour is intended. Previous default black/ink values such as `#1D1D1F`, `#111111`, `#111113`, and dark-navy stand-ins are superseded as defaults; separately intentional navy backgrounds and graphite secondary labels remain distinct semantic colours. In reviewed dark mode, foreground labels remain light for accessibility; do not force dark text onto dark surfaces. `#000000` remains available solely as pure technical/monochrome black when an output medium requires it. This decision does **not** change Distribution's branded near-black garnet `#3D0B13`, Healthcare's primary crimson `#9D1B32`, or Intelligence's selected ultramarine `#2546D8`.

The token changes are review-branch source work only until exact-head CI, generated-bundle parity, browser contrast and deployment checks are approved; do not infer a live publication from this specification.
