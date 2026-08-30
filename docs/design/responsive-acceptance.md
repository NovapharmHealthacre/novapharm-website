# Corporate responsive acceptance

Review date: 28 August 2026
Engines: Chromium and WebKi
Required widths: 1920, 1440, 1366, 1280, 1024, 768, 430, 390, 375, 360 and 320 CSS pixels

## Design contrac

- Shared content width: `1200px` maximum.
- Desktop outer gutter: `48px`; tablet: `32px`; compact mobile: `24px` with a `20px` floor.
- Header height: `56px`, reducing to `54px` at the smallest breakpoint.
- Mobile is recomposed as a single editorial flow; no desktop card grid is horizontally scrolled.
- Global navigation becomes a textual `Menu` disclosure; Company, Capabilities and Products retain local family navigation.
- Product media uses stable intrinsic dimensions, `object-fit: contain` and range-aware responsive sizing so the pack is never cropped.
- Headline sizing is bounded with `clamp()` and does not scale linearly with viewport width.
- No content section relies on `100vh`, fixed-height storytelling or scroll-jacking.

## Route matrix

| Family | Representative routes | Mobile-specific risks | Desktop-specific risks | Acceptance state |
| --- | --- | --- | --- | --- |
| Corporate narrative | `/`, `/about/`, `/capabilities/` | Hero wrap, local-nav density, CTA stacking | Excess empty width and weak text measure | Pass; bounded hero, intentional wraps and stable gutters verified |
| Capability detail | `/services/`, `/regulatory-services/`, `/cro/`, `/technology/` | Roadmap sequencing, long labels, notices | Uneven columns and oversized gaps | Pass; roadmap, notices and media visible in Chromium and WebKit |
| Oncology | `/oncology/` | Empty viewport and image crop regression | Overlong media stage | Pass; no sticky/viewport media and no horizontal overflow |
| Products | `/products/`, `/products/nutraxin/`, product detail, strategic portfolio | Pack visibility, action order, long product names | Product/media balance and line length | Pass; first substantive portfolio order and stable pack ratios verified |
| Editorial | `/news-insights/`, representative article | Metadata wrap and article measure | Excessive line length | Pass through static validation and representative browser review |
| People | `/leadership/`, five profiles | Portrait focal point and title wrapping | Crop consistency and rhythm | Pass; approved portraits and exact titles verified in both engines |
| Conversion/safety | `/contact/`, `/account-application/`, `/portal/` | Long warnings, safe action visibility | Content not appearing like a disabled form | Pass; truthful fail-closed routes expose no fake form or success state |
| Institutional | `/trust-centre/`, legal routes, footer | Link grouping and readable disclosures | Footer stretch and low-contrast legal copy | Pass through static validation and institutional footer checks |

## Exact implementation rendered result

The final 28 August standalone run covered 40 canonical routes plus the governed 404 at all ten listed viewports in Chromium and Playwright WebKit. It produced 820 screenshots, 164 WCAG 2.2 Axe runs at the key desktop/mobile viewports, two high-density product-media checks and two JavaScript-disabled navigation checks. No serious or critical Axe finding, horizontal overflow, broken image, failed subresource, unexpected console error, clipped principal action or mid-word major-heading break survived.

The run materialised lazy media before key captures, checked the official logo, canonical and JSON-LD graph, security headers, route-specific page identity, responsive Product hierarchy and safe public Contact failure state. Human review of the regenerated Products and Oncology desktop/mobile frames then found and corrected two material composition defects: collapsed product-category context at 320 pixels and a phantom empty Oncology grid cell. The complete matrix was rerun after those corrections and passed at `2026-08-28T15:06:51.669Z`.

Reproduction command: `npm run test:browser --workspace=@novapharm/corporate` after the corporate production build. The harness starts and removes its own isolated standalone server.

## Failure criteria

Any horizontal overflow, clipped navigation, inaccessible control, hidden essential text, product crop, overlapping sticky element, empty first viewport, accidental single-word hero widow, unreadable disclosure or two-dimensional 400% reflow remains a release defect. The accepted code was committed unchanged as `9f49161425790596413051a2b00cedeae51905a9`; subsequent visual or functional changes must rerun the affected matrix, while managed-staging browser evidence remains separate.
