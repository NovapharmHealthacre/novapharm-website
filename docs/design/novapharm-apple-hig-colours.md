# NovaPharm website colour system — Apple HIG implementation

Reference: [Apple Human Interface Guidelines — Color](https://developer.apple.com/design/human-interface-guidelines/color). Reviewed November 2026. This is an **Apple-inspired NovaPharm design contract**, not Apple native system colours or an Apple endorsement.

## Design decision

Apple's guidance prioritises semantic meaning, judicious colour, distinct interactive and noninteractive uses, dynamic appearances, increased contrast, accessible status feedback, and testing with realistic content. The implementation deliberately keeps NovaPharm's approved red **#9D1B32** as a *brand accent only*, not the universal colour of every link, error, selection, nav item or chart.

Default customer-facing appearance remains bright, white and quietly editorial. Black/charcoal is the neutral primary action; blue is the conventional text-link and focus colour; status colours communicate operational meaning and are never a substitute for visible status text.


## Owner-approved neutral identity (22 November 2026)

The canonical cross-estate brand contract is `config/brand-neutrals.json`: **Royal Mineral White `#FBFAEF` (primary), Royal Porcelain White `#F8F7F3` (secondary), Sovereign Black `#0B0B0E` (default text), and Porcelain Stone `#DEDCD5` (decorative divider only)**. A stronger semantic control-border token must remain independently contrast-safe. The neutral palette applies across static public pages, Corporate Next.js, protected Portal, Technology, Status and shared React components; distinct Healthcare, Intelligence and Distribution logo colours remain unchanged. Source updates are not proof of production deployment.

## The reusable palette

Defined in `assets/css/novapharm-hig-colours.css`:

| Role | Light | Application |
| --- | --- | --- |
| Canvas / Royal Mineral White | `#FBFAEF` | Primary page background |
| Grouped surface / Royal Porcelain White | `#F8F7F3` | Secondary neutral for panels, controls and sections |
| Recessed surface | `#EDEBE5` | Third-level grouping |
| Primary label | `#0B0B0E` | Headings and essential text |
| Secondary label | `#424245` | Body text |
| Tertiary label | `#595961` | Supporting captions |
| Separator / Porcelain Stone | `#DEDCD5` | Decorative dividers only, not text or sole control boundaries |
| Strong separator | `#86868B` | Visible form and control boundaries |
| Link and focus | `#0066CC` | Navigation in content, keyboard focus |
| Brand accent | `#9D1B32` | One prominent brand action or key emphasis |
| Brand text | `#68101F` | Red emphasis on light grouped surfaces |
| Neutral primary action | `#0B0B0E` | Standard primary UI button |
| Success | `#17745A` | Completed or operational |
| Warning | `#965C0D` | Requires attention |
| Destructive/error | `#9E1B47` | Failure; intentionally distinct from brand red |

White on brand red meets 4.5:1 on the button background; use the darker brand-text token rather than pure brand red as small text on grey grouped backgrounds.

## Where connected

- Static public website and all pages using `novapharm.bundle.css`: the build script includes the semantic system **last**, normalising previously green-tinted basic colours.
- Corporate Next.js: `data-np-estate="corporate"` maps its existing `--nph-*` and `--apple-*` primitives to semantic roles.
- Secure portal (customer, distribution/WMS and protected roles): `data-np-estate="portal"` maps `--portal-*`; no authentication or order-processing logic is modified.
- Status: `data-np-estate="status"` maps service statuses to success, warning, destructive and information semantics.
- Technology: `data-np-estate="technology"` maps editorial surfaces and NovaPharm's red without changing the content layout.

## Appearance policy

The current production pages are **light-first**. `data-np-color-scheme="dark"` defines an explicit dark palette; `data-np-color-scheme="system"` opts into OS-driven dark colours. Increased-contrast and forced-colours selectors are included. These variants must **not** be enabled across an app without a full visual and contrast audit of every hard-coded legacy background, photo overlay, badge, table and chart. Their presence is not evidence that every legacy screen is dark-mode-ready.

For new components, use `data-np-colour-role` with values `surface`, `raised`, `secondary`, `link`, `primary-action`, or `brand-action`. Use `data-np-status` only together with **visible descriptive status text** (for example `Operational`, `Delayed`, `Failed`); never colour-only dots. Do not use brand red as both link and static decorative text. Use a *single* tinted action per action group, not every button.

For user-provided images and charts, use sRGB source artwork unless a reviewed P3-specific alternative is available; verify colour profiles and contrast of text overlays in Safari, Chrome, Windows and Android. Do not add gratuitous glass gradients, rainbow icons or decorative neon.

## Release validation and remaining acceptance

Run `npm run design:colours:validate`, `npm run design:typography:validate`, `npm run build:public-only`, `npm run apps:check`, and the existing browser acceptance checks. The new contract checks light/dark normal-text pairs at >=4.5:1, focus/strong control boundaries at >=3:1, distinct brand and failure hues, and integration into the app layouts and public build.

Follow with browser screenshots and axe/keyboard checks for all key routes, checkout, search, account/address editing, medical search, Distribution/WMS status chips and responsive layouts. A passing token contract **does not** prove every legacy page, state or real device meets accessibility criteria or that the update has been published. Production publication remains subject to the current CI and deployment gates.

## Sovereign Black and three identity colours — 22 November 2026

Default light-mode headings, body copy, navigation and neutral primary actions use Sovereign Black `#0B0B0E`. Dark-mode foreground labels remain high-contrast light text, not black. Identity accents are explicitly scoped: Healthcare Royal Cochineal Crimson `#9D1B32`, Distribution Near-black Garnet `#3D0B13`, and Intelligence Regal Ultramarine `#2546D8`. Brand accents do not replace semantic warning/destructive/link/focus colours. Native/system web typography is used where provided by the operating system; no downloaded Apple fonts are redistributed.
