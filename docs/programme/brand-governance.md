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
- Authoritative primary colour: Economist Red `#E3120B` (`rgb(227 18 11)`).
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

## Media and portraits

- Every media asset requires source, rights, acquisition/review date, subject, crop, alt text and misleading-implication review.
- Representative third-party laboratories, warehouses or supply environments must not be presented as NovaPharm-owned.
- Only approved real executive portraits may represent named people.
- Missing approved portraits use a controlled neutral no-image state, never a generated likeness.
- Partner logos require permission and cannot replace NovaPharm identity.

## Change control

Logo-source changes require owner approval and checksum updates. New colours, typefaces, logo variants or executive images require brand and accessibility review. `npm run brand:validate` enforces the pack count, all registered checksums, byte identity of the public subset, path-only SVG safety, primary colour and raster dimensions. Changes must also pass visual regression, high-density rendering, mobile size, contrast, alt-text and layout-shift checks.

Evidence: `final-report/official-logo-register.md`, `creative-assets/asset-register.json`, `creative-assets/visual-provenance.md`, `packages/design-system/` and `audit/evidence/design-system/`.
