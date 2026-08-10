# Brand Governance

Status: repository controls implemented; new variants require owner approval
Review date: 1 August 2026
Owner: NovaPharm Healthcare Ltd

## Authoritative identity

- Public brand name: `NovaPharm Healthcare`.
- Legal name where required: `NOVAPHARM HEALTHCARE LTD`.
- Company number: `16716501`.
- Official source logo: `assets/brand/novapharm-healthcare-logo.svg`.
- Approved raster fallback: `assets/brand/novapharm-healthcare-logo.png`.
- Public executive designation: Vishal Chakravarty, `Chief Executive Officer`.
- Founder and statutory-director facts are separate governance relationships, not part of the executive title.

The logo must not be retyped, redrawn, recoloured, stretched, cropped or converted into an invented symbol. No reversed or monochrome variant is approved. Use a light, calm surface when the red artwork lacks contrast.

## Application use

Application build scripts copy the approved source assets and checksum tests verify byte identity where duplicated for framework public directories. Header, footer, portal and structured-data references use the same identity. Print-master PDF/EPS files remain outside ordinary public web delivery.

## Visual system

The selected direction is `Regulated Continuum`. The palette uses midnight navy, warm white, graphite, cool grey, muted silver and NovaPharm red as a controlled accent. Red is not a page background default and cannot be the only status signal. Cards use restrained radii and are limited to real item groupings or tools.

## Media and portraits

- Every media asset requires source, rights, acquisition/review date, subject, crop, alt text and misleading-implication review.
- Representative third-party laboratories, warehouses or supply environments must not be presented as NovaPharm-owned.
- Only approved real executive portraits may represent named people.
- Missing approved portraits use a controlled neutral no-image state, never a generated likeness.
- Partner logos require permission and cannot replace NovaPharm identity.

## Change control

Logo-source changes require owner approval and checksum updates. New colours, typefaces, logo variants or executive images require brand and accessibility review. Changes must pass visual regression, high-density rendering, mobile size, contrast, alt-text and layout-shift checks.

Evidence: `final-report/official-logo-register.md`, `creative-assets/asset-register.json`, `creative-assets/visual-provenance.md`, `packages/design-system/` and `audit/evidence/design-system/`.
