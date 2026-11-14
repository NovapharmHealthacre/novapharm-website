# NovaPharm Distribution — official WMS product identity

**Owner-provided source:** `NovaPharm_Distribution_Official_Logo_Kit(2).zip`  
**Kit version:** 1.0, prepared 14 November 2026  
**Integration scope:** existing NovaPharm governed employee portal (no new application)  
**Additional SaaS spend:** £0

## Identity decision

**Product name:** NovaPharm Distribution.

The company remains NovaPharm Healthcare, while *NovaPharm Distribution* is the product/workspace identity of its warehouse-management and distribution-control operations. It is not represented as a separately incorporated company or a different MHRA licence holder. This naming does not change contractual product rights, data residency, customer login, order release, physical warehouse ownership or regulatory permissions.

The supplied official artwork is graphite on white, with a white/reverse variant. It has an Apple-inspired visual appearance, but contains no Apple proprietary font or Apple trademark. The brand kit contains outlined vector traces and not editable San Francisco text.

## Asset provenance and validation

The attached ZIP was unpacked locally, verified to contain no traversal paths, and its 69 SHA-256 manifest records were all independently checked against included files. The approved visual preview was inspected.

| Use | Repo path | Source |
| --- | --- | --- |
| Primary employee header | `assets/brand/novapharm-distribution.svg` | Optimised outlined SVG derived from the approved graphite vector, 2307 × 408 |
| Reverse on dark | `assets/brand/novapharm-distribution-reverse.svg` | Same artwork, white fill |
| Browser tab / small symbol | `assets/brand/novapharm-distribution-mark.svg` | Approved kit's standalone N mark |
| iPhone / iPad home-screen | `assets/brand/novapharm-distribution-apple-touch-icon.png` | Approved kit's original 180 × 180 PNG; SHA-256 `9d7db87e4c39737febb0f70d1faec0c4081b39fff7bd5ff1acf3d85ae1da0b2c` |

The outlined web SVG was optimised from the owner's vector master for lightweight delivery; it is not a new typography interpretation or a separately licensed mark. Preserve the kit's original master vector for print/signage. The reverse variant is only for dark backgrounds.

## Where it is integrated

1. `apps/portal/components/distribution-brand.tsx` displays the official SVG wordmark using the portal's existing local Next Image asset pipeline, with alternative text and a link to the governed employee operations landing route.
2. `apps/portal/components/dashboard.tsx` uses that mark only on the existing editorial employee distribution header (operations dashboard, telesales and warehouse). The customer portal continues to use the Healthcare logo.
3. `apps/portal/components/employee-distribution-workspace.tsx` changes the WMS work-area name to **NovaPharm Distribution** and updates its distribution identity labels. The recognised warehouse route `/employee/warehouse/` and familiar page heading `Warehouse & Inventory` remain.
4. `apps/portal/app/[[...slug]]/page.tsx` applies a distribution-specific browser title, favicon and iOS touch icon to the three relevant employee distribution pages only. Login, board, customer and administration titles/icons remain under the parent portal.
5. `apps/portal/app/employee-distribution.css` preserves the 2307:408 wordmark ratio and visible keyboard focus in responsive layouts.
6. The existing `apps/portal/scripts/sync-public-assets.mjs` synchronises the root `assets/brand` folder to `apps/portal/public/assets/brand`, including all four WMS assets. The existing standalone Next build copies those assets into its server bundle.
7. `apps/portal/test/distribution-brand.test.ts` verifies safe SVG content, geometry, reverse artwork, hash integrity of the original mobile icon, route scope, parent branding and first-party static paths.

## Brand use rules

- Use **NovaPharm Distribution** for the WMS product, associated employee operational views and future distribution-operations materials.
- Use **NovaPharm Healthcare** for the legal/company-level corporate site, customer-account identity, existing invoices, licensing and public main portal entry.
- Keep logos proportionate: no stretching, distorted letter spacing, shadows, emoji substitutions, external CDN logo dependencies or recolouring. Primary graphite: `#1D1D1F`; reverse: `#FFFFFF`; white/off-white background for the main wordmark.
- Preserve the full approved ZIP for high-resolution email, letterhead, presentation and print assets. There is no need to publish all large print masters or raster exports into the customer-accessible website.
- Never infer registered trademark ownership or a separate corporate entity from this design package.

## Release boundaries

This brand change is not a physical WMS, warehouse interface, payment approval, production deployment or commerce activation. It does not change the default-deny enterprise order-release gates or the source-confidence markers.

- [Unified AWS-first portal cutover issue #601](https://github.com/NovapharmHealthacre/novapharm-website/issues/601) is a separate release.
- [Polar Speed / UPS interface issue #664](https://github.com/NovapharmHealthacre/novapharm-website/issues/664) is the separate 3PL connection.
- Code review and CI acceptance are necessary before merging or applying the product identity to a live domain.
