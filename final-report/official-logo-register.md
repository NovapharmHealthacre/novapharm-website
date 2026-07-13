# Official NovaPharm Healthcare Logo Register

Verified: 11 July 2026  
Status: production web files are byte-identical to the supplied approved SVG and PNG masters

| Asset | Repository path | SHA-256 | Production use |
|---|---|---|---|
| Approved vector wordmark | `assets/brand/novapharm-healthcare-logo.svg` | `0450a3a7957b5a0ce0bb2f1764bddc2c07711222cb5b787d23b77c85cfee0239` | Preferred header, mobile header, footer, portals, Executive Platform, favicon and manifest identity |
| Approved raster wordmark | `assets/brand/novapharm-healthcare-logo.png` | `b381ee4929b4014a40c889d26941c994bcbe7bfc558cd81f0f47d2d1917d00ad` | `<picture>` fallback, email templates, structured-data logo and Open Graph/social identity |

The attached PDF and EPS were reviewed as print masters and are not copied into public web paths or offered as downloads. The implementation does not redraw, recolour, crop, stretch, rotate or recreate the logo. Intrinsic width and height preserve its approximate 8:1 proportions and prevent layout shift.

## Implementation locations

- Public header, mobile header, footer, error pages, Contact, account application and all public pages: `scripts/build-public-pages.mjs`.
- Portal login, Customer Portal, Employee Portal, Board/Executive Platform and Administrator Portal: `scripts/build-pages.mjs`.
- SharePoint-hydrated Executive Platform modules: `src/integrations/sharepoint/secure-content-branding.mjs`.
- Transactional email header: `src/integrations/email/client.mjs`.
- Structured data, canonical social image, favicon and web manifest generation: `scripts/build-public-pages.mjs`.
- Generated manifest: `manifest.webmanifest`.

Structured-data logo URL: `https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png`  
Open Graph image URL: `https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png`

## Owner decision

No approved standalone symbol, reversed logo or monochrome logo was supplied. The complete official SVG is therefore used for the favicon and application identity. A simplified small-format icon requires a separately approved brand asset; none has been manufactured.
