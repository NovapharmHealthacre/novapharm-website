# NovaPharm Healthcare — Logo Asset Pack

## Authoritative colour
Primary red has been normalised to **Economist Red #E3120B** (RGB 227, 18, 11).

## Master artwork
Use `01_master_vector/novapharm-healthcare-primary-red.svg` as the default digital master. It is path-based, so it does not depend on an installed font and is resolution-independent.

For professional print, use the PDF or EPS vector masters. Ask the printer to handle CMYK/Pantone conversion through their output profile rather than converting a web RGB file blindly.

## Website
- Preferred header/navigation logo: `02_web/primary_transparent/novapharm-logo.svg`
- Dark backgrounds: `02_web/reverse_white/novapharm-logo-white.svg`
- Single-colour use: `02_web/monochrome_black/novapharm-logo-black.svg`
- PNG fallbacks are supplied up to 8192 px wide.

## Favicons / PWA
`03_favicon_pwa/` contains favicon.ico, SVG favicon, small PNGs, Apple touch icon, PWA 192/512 icons, a maskable PWA icon and a sample web manifest.

At tiny favicon sizes the icon deliberately uses the **N** without the arc so it remains legible. Larger application/PWA icons use the N plus the original NovaPharm arc motif.

## Apple applications
`04_apple_app_icons/` contains:
- 1024 × 1024 default app icon artwork (no pre-rounded corners)
- dark and transparent monogram variants
- common convenience PNG sizes
- a complete macOS `.iconset`
- `NovapharmHealthcare.icns`

The square app mark is a **derived monogram** based on the exact wordmark's Arial Bold N and the original supplied arc geometry. It is included because a full horizontal wordmark is not legible at app-icon/fav-icon scale.

## Social
`05_social_profile/` contains square profile marks and 1200 × 630 Open Graph cards in both white and red treatments.

## Do not
- stretch or distort the logo
- recolour the primary mark to arbitrary reds
- rasterise the SVG before layout unless a platform requires PNG
- use the horizontal wordmark as a tiny favicon

## Source preservation
`00_original_sources/` contains the exact original PNG, SVG, PDF and EPS files supplied by the owner before colour normalisation.
