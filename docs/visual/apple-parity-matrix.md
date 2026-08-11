# Apple-Parity Matrix

Status: public benchmark translated into original NovaPharm rules; local candidate render verification passed
Observed: 11 August 2026

## Scope and legal boundary

Apple is an internal craftsmanship benchmark, not a public endorsement and not a source of NovaPharm assets, code, fonts, icons, copy or proprietary implementation. Measurements below describe publicly observable browser presentation on the review date. They may change when Apple updates its sites. NovaPharm adopts the discipline behind the geometry while retaining pharmaceutical truth, its official identity and its own compositions.

Evidence labels:

- **Officially documented**: supported by Apple or WebKit public documentation.
- **Publicly observable**: measured from public pages in a browser.
- **Inferred**: a design/engineering conclusion from the observation.
- **Unknown**: private Apple implementation detail, not asserted.

## Observable geometry

| Archetype | Publicly observable checkpoint | NovaPharm translation |
|---|---|---|
| Apple global navigation at 1280px | Approximately 44px high, compact type, stable horizontal density. | Corporate public header stays compact and calm, but retains NovaPharm's logo clear space and the links needed for regulated B2B discovery. |
| Apple homepage hero/tile | Approximately 580px high at the observed desktop checkpoint; display heading around 56/60; primary controls around 44px high. | Corporate hero uses a 580-760px bounded first viewport, a governed full-bleed pharmaceutical visual, a 44px minimum action geometry and concise copy. |
| Apple two-up tiles | Approximately 622px by 580px at 1280px with a 12px inter-tile gutter. | Use full-width editorial bands and repeated tiles only for genuine peer choices; do not force all corporate sections into a two-up template. |
| Apple body copy | Approximately 17/25 at the observed public checkpoint. | NovaPharm body defaults to a legible 17px class with controlled measure and property-specific line height. |
| iPhone product landing at 1280px | Display H1 approximately 80/84, 1120px content span with about 80px outer gutters. | Reserve this scale for flagship product-like moments. Corporate evidence pages use smaller display roles when dense regulated copy must remain scannable. |
| Apple healthcare/scientific page at 1280px | Major scientific headline approximately 64/68 within an 816px text measure; broad sections near 1100px. | Use a wide 1120-1200px institutional grid and a narrower 680-820px editorial text column. |
| Apple mobile at 390px | Navigation approximately 48px high, roughly 24px horizontal gutters and no document overflow in the reviewed pages. | NovaPharm tests 320-2560px, preserves at least 20-24px authored mobile gutters, safe areas, 44px targets and intentional crop changes. |

The private implementation values, source abstractions and design-token names behind Apple pages are **unknown** and are not reverse-engineered or claimed.

## Route archetype matrix

| NovaPharm route or product surface | Reference archetype | Header and grid comparison | Type and spacing decision | Motion and responsive decision | Intentional difference / remaining gate |
|---|---|---|---|---|---|
| Corporate homepage | Apple homepage plus scientific editorial pages | Compact global navigation; full-width hero media; contained copy; controlled next-section reveal. | Flagship display scale is bounded and text width stays below the visual focal boundary. | Subtle CSS image drift only; static composition remains complete; reduced motion removes the loop. | Regulatory status and conceptual-media boundaries remain visible even when they add copy Apple would not need. Local Chromium/WebKit evidence passed; managed-staging review remains pending. |
| Company and About | Apple corporate/newsroom editorial | Broad institutional grid with narrow reading columns and selective media. | Lower display scale, longer comfortable measure, restrained metadata. | Ordinary scroll; no pinned spectacle. | Evidence, governance and company-number detail take precedence over extreme minimalism. |
| Services and Capabilities | Apple services overview | One clear system per band; lists or process structures preferred to repetitive cards. | Descriptive hierarchy uses H2/H3 rhythm, not hero typography inside modules. | Reveal motion is progressive and nonessential. | Qualified scope and pre-authorisation limits remain explicit. |
| Products | Apple product family navigation | First substantive portfolio section is the governed Nutraxin review, followed by approved categories and context. | Product names remain inspectable; no consumer sales styling. | Mobile changes ordering/crop without horizontal precision scrolling. | No Apple-like commerce, price or purchase controls; product claims remain registry-gated. |
| Regulatory | Apple scientific/healthcare narrative | Premium staged pathway with clear sequence and constrained copy. | Process labels are compact; stage titles remain readable at 320px. | No scroll-jacking; sequence survives without motion. | Seven authorisation/control stages and status caveat are a pharmaceutical requirement. |
| CRO and Oncology | Apple deep product/scientific detail | Section-by-section story with evidence architecture, controlled media and selective interactive navigation. | Larger scientific statements alternate with dense but bounded evidence. | CSS/browser motion first; no animation framework. | No fake trials, clinical outcomes, patient claims or full-service-CRO implication. |
| Leadership hub/profiles | Apple leadership/newsroom profile | Portrait-led editorial layout with consistent crops and direct entity relationships. | Canonical title dominates; governance facts remain separate. | No decorative portrait motion. | Missing owner-approved portraits remain controlled no-image states. |
| Founder platform | Apple Newsroom/editorial | Quiet publication grid, narrow article measure, durable metadata and portrait authority. | Editorial serif/sans system remains purpose-specific rather than copied. | Transitions are minimal; reading is immediate. | Independent-journal character is deliberately distinct from Corporate. |
| Innovation Technology | Apple developer/technology storytelling | Denser technical grid and controlled interactive architecture. | Technical labels and data hierarchy are compact but readable. | Canvas/CSS movement remains bounded and optional. | No fake platform data or unsupported AI/scientific capability. |
| Secure Portal | Apple-quality application discipline, not marketing pages | Stable shell, purposeful density, clear module hierarchy and fewer ornamental surfaces. | Data and workflow typography prioritise scan speed. | State transitions are immediate and reduced-motion safe. | Enterprise pharmaceutical controls, role boundaries and tables require greater density than public Apple pages. |
| Authentication and forms | Apple account/form clarity | Short labelled sequences, stable control heights, precise errors and preserved data. | Labels never rely on placeholders; status text is explicit. | No delayed completion animation; authoritative server success only. | GitHub Pages remains fail-closed and cannot simulate submission/authentication. |
| Status and error states | Apple support/status clarity | Single dominant status, direct recovery action and quiet footer. | Plain language and visible state over decorative treatment. | No unnecessary animation. | Sanitised operational data and noindex boundaries are mandatory. |

## Current intervention

The post-PR53 homepage intervention replaces a visually constrained split card with one truthful full-bleed supply-chain composition. The H1, primary actions and regulatory status remain HTML. A white directional veil protects contrast while retaining the image focal point. The Batch Integrity section now uses the governed traceability composition at architectural scale instead of a card-like split. Both images carry explicit ownership-safe boundaries; neither implies a NovaPharm facility, inventory, product or active supply operation.

## Acceptance geometry

Automated geometry must cover `320`, `360`, `375`, `390`, `414`, `430`, `768`, `820`, `1024`, `1280`, `1366x768`, `1440`, `1512`, `1728`, `1920` and `2560`. Curated route screenshots remain deliberately smaller than the geometry matrix to avoid the known 32,767px full-page WebKit bitmap failure. Acceptance fails on horizontal overflow, broken or unloaded imagery, headings split inside a word, serious/critical Axe findings, failed subresources or browser console errors.

The final local public-artifact run produced 36 curated viewport screenshots, 36 Axe runs and 26 additional homepage geometry checks across Chromium and Playwright WebKit. It found no horizontal overflow, broken or stalled media, mid-word H1/H2 breaks, serious/critical Axe findings, failed subresources or browser console errors. This proves the local candidate artifact only; it is not real-Safari hardware, managed-staging or production acceptance.

## Official references

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Apple public homepage](https://www.apple.com/)
- [Apple healthcare](https://www.apple.com/healthcare/)
- [Apple Newsroom](https://www.apple.com/newsroom/)
- [WebKit scroll-driven animation guidance](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/)
