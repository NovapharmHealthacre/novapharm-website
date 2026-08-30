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

Accessibility colour treatment: the logo and canonical graphical identity retain `#E3120B`. Small foreground labels and links on light neutral surfaces use the governed darker derivative `#B30E09` where required to preserve WCAG contrast. Browser acceptance verifies this distinction across Chromium and WebKit rather than modifying the supplied artwork.

## PharmaScope product identity

Verified: 26 August 2026
Status: authoritative owner pack preserved; selected Portal delivery assets are byte-identical to the approved sources

| Asset | Repository path | SHA-256 | Governed use |
|---|---|---|---|
| Primary PharmaScope identity | `assets/brand/pharmascope-logo.svg` | `fa42823e57174c03952f57ae99dca7ec3f6a007c3644f8e30adc5f0b19a30757` | Light analytical surfaces and controlled product identity contexts |
| Reverse PharmaScope identity | `assets/brand/pharmascope-logo-reverse.svg` | `322e1178e17d5326c06b8ebabe1ab8629655740f3d2bf4d0f523a7628b17ac40` | Medicines Intelligence navigation on the approved dark surface |
| PharmaScope Pulse mode | `assets/brand/pharmascope-pulse.svg` | `7b0a1296ff1ffb240d5da6721f4537b0067f3d3d8eb28962bb94882bf320285c` | Prescribing, trend and demand context only |
| PharmaScope Vector mode | `assets/brand/pharmascope-vector.svg` | `b5706b3db0597b88cb6a3986a9149c75a19afd22baff1fa5990f48398537d070` | Geography and opportunity context only |
| PharmaScope Helix mode | `assets/brand/pharmascope-helix.svg` | `afcc0cc32720511440842692d988f0ed84debfd8f6525ed065377b0fd2f9db55` | Medicine identity and evidence context only |
| PharmaScope application icon | `assets/brand/pharmascope-app-icon-1024.png` | `9e859f6ccdc0d23c2fe6c79d12f4718335f9db4ee7bb3a049a805ff715a2a41d` | Future governed native/PWA identity; no store-release claim |
| PharmaScope social preview | `assets/brand/pharmascope-open-graph-1200x630-dark.jpg` | `511e19a6a1cf46d656b054a81ea069f914fd93cf329f2e5213b0c4670d894e34` | Controlled product-preview metadata only; PharmaScope remains protected |

The complete owner-supplied PharmaScope pack contains 127 files and 126 checksum entries. It is preserved at `creative-assets/brand/pharmascope-logo-asset-pack/`; the seven necessary application assets above are deployed under `assets/brand/` and synchronized to `apps/portal/public/assets/brand/`. `npm run brand:validate` checks inventory counts, checksum coverage and byte identity.

The supplied PharmaScope files carrying an `.svg` extension are official raster-preserving SVG containers: their markup embeds PNG image data rather than path-traced vector geometry. They are authoritative and may be used at their governed dimensions, but this register does not describe them as path-based master vectors. A future path-only master would require a new owner-approved asset and checksum record; no automatic tracing or logo redraw is authorised.
