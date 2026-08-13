# Official NovaPharm Healthcare Logo Register

Verified: 13 August 2026
Status: authoritative owner pack preserved; deployed web subset is byte-identical to its approved sources

| Asset | Repository path | SHA-256 | Production use |
|---|---|---|---|
| Approved path-based vector wordmark | `assets/brand/novapharm-healthcare-logo.svg` | `9199250e117b5c7d2b39d4d08d33522928f668d36316863b4e60f5eb7ca2a729` | Header, footer, portals, Executive Platform and high-density web identity |
| Approved 2048px raster wordmark | `assets/brand/novapharm-healthcare-logo.png` | `f1f5a0e0aa68ebf0f6f0370b45c2810d41b9420c2c930d4649cf199efeb96fdf` | `<picture>` fallback, email templates and structured-data organisation identity |
| Approved reverse vector | `assets/brand/novapharm-healthcare-logo-reverse.svg` | `6571ff65dbf47ce33c9a6f725aa7a8d29dc07651ee261ec56d6ec3f117875f2e` | Controlled dark or red surfaces only |
| Approved monochrome vector | `assets/brand/novapharm-healthcare-logo-monochrome.svg` | `f9543f7a851b8c307a3992d3fe0966823bb2871dca584b19729f1af54d1546ef` | Necessary single-colour output only |
| Approved SVG favicon | `assets/brand/favicon.svg` | `f8abf32bef19098701e2e66097358d6f4fd517307dce19efb56b18b7cac43fcc` | Modern browser identity at constrained sizes |
| Approved multi-resolution favicon | `assets/brand/favicon.ico` | `cdef00b3fdf6677dfd94897f2e48405b97c5bee8e5b82d0f23240eec2b937deb` | Legacy/desktop browser fallback |
| Approved Apple touch icon | `assets/brand/apple-touch-icon.png` | `5f45536153ab8ac5f8c27aa764557b1297630859c21142deb071610ffa7d5e02` | Apple home-screen identity, 180x180 |
| Approved PWA icons | `assets/brand/pwa-icon-192.png`, `assets/brand/pwa-icon-512.png`, `assets/brand/pwa-maskable-512.png` | Enforced by `npm run brand:validate` | Web application manifest, including a dedicated maskable surface |
| Approved default social card | `assets/brand/novapharm-open-graph-1200x630-white.jpg` | `1239b1c71f95a3d0c34d02e068c2f86c85196aab617551be18e9783e7a18be8f` | Default Open Graph and large social preview |

The complete pack contains exactly 93 files, including four untouched originals, master SVG/PDF/EPS artwork, web derivatives through 8192px, browser/PWA assets, Apple application assets, social artwork, brand tokens, preview, instructions and checksum register. It is retained at `creative-assets/brand/novapharm-logo-asset-pack/`; only the 17 necessary delivery assets are exposed under `assets/brand/`. Intrinsic dimensions preserve the supplied proportions and prevent layout shift.

## Implementation locations

- Public header, mobile header, footer, error pages, Contact, account application and all public pages: `scripts/build-public-pages.mjs`.
- Portal login, Customer Portal, Employee Portal, Board/Executive Platform and Administrator Portal: `scripts/build-pages.mjs`.
- SharePoint-hydrated Executive Platform modules: `src/integrations/sharepoint/secure-content-branding.mjs`.
- Transactional email header: `src/integrations/email/client.mjs`.
- Structured data, canonical social image, favicon and web manifest generation: `scripts/build-public-pages.mjs`.
- Pack integrity and delivery-copy validation: `scripts/programme/validate-brand-assets.mjs`.
- Generated manifest: `manifest.webmanifest`.

Structured-data logo URL: `https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png`  
Default Open Graph image URL: `https://novapharmhealthcare.com/assets/brand/novapharm-open-graph-1200x630-white.jpg`

## Owner decision

The owner explicitly approved the complete asset pack on 13 August 2026. The supplied horizontal corporate logo remains unchanged in role and is never replaced by typed text. The pack's `N` favicon and `N + original arc` application mark are approved only for sizes where the full horizontal wordmark would be unreadable. Reverse and monochrome variants are approved only for their documented contrast/output contexts. Economist Red `#E3120B` is the authoritative primary identity colour.
