# Corporate component system

Last reviewed: 2026-08-22

## Product disciplines

Components exist to enforce meaning, behaviour and accessible state. They are
not a reason to wrap every paragraph in a card. The public site remains
server-rendered or statically generated for first paint; interaction enhances
content that is already present.

## Foundations

| Foundation | Rule |
| --- | --- |
| Canvas | True white, with restrained near-white separation only when structure requires it. |
| Text | Near-black primary text and an accessible dark grey for secondary copy. |
| Accent | Canonical NovaPharm red, used for brand emphasis and primary interaction rather than large decorative fields. |
| Type | `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Helvetica Neue`, `Arial`, `sans-serif`; no bundled Apple proprietary fonts. |
| Grid | Shared 1200 px content grid, 48 px desktop gutters and 22 px mobile gutters, with narrower editorial measures. |
| Radius | Small and controlled; repeated content surfaces use no more radius than their semantic grouping requires. |
| Motion | Opacity and transform first, quiet duration families, no scroll-jacking, complete reduced-motion alternative. |

## Public primitives

- `CorporateHeader`: logo, seven category destinations and textual mobile
  disclosure.
- `LocalNavigation`: scoped page-family links with semantic current state.
- `EditorialHero`: one H1, one proposition, at most two principal actions and
  optional truthful media.
- `SectionIntroduction`: eyebrow, heading and bounded lead text.
- `EditorialSplit`: media and copy with explicit mobile order and crop.
- `StructuredList`: rows or steps for content that does not need cards.
- `ProductShelf`: pack-shot-led product discovery using consistent image space
  and metadata.
- `Notice`: regulatory, information, warning, success and error variants using
  language and border treatment rather than decorative icons.
- `ManagedWorkflow`: server-authoritative form shell with summary errors,
  inline errors, loading, recovery and truthful outcome state.
- `InstitutionalFooter`: grouped company, capability, product and legal links.

## Prohibited presentation patterns

- Decorative UI icons, including icon-only menu, arrow and check controls.
- Decorative molecular, DNA, node, orbit, circle or vector scenes.
- Generic stock-image mosaics.
- Equal-weight card grids used as a substitute for information architecture.
- Large gradients, glass surfaces, deep shadows or rounded SaaS panels.
- Artificial operational dashboards or unsupported statistics.
- A success state before authoritative persistence or downstream acceptance.

## Notice semantics

| Variant | Use | Required behaviour |
| --- | --- | --- |
| Regulatory | Permission, status or classification boundary | Neutral language; never implies authority. |
| Information | Helpful context | Must not compete with the principal action. |
| Warning | Recoverable risk or important condition | Clear next step and accessible contrast. |
| Success | Authoritative completion | Rendered only after confirmed server outcome. |
| Error | Failure or invalid state | Explains what happened, what was retained and how to recover. |

## Interaction states

Every interactive element implements default, hover where available, visible
focus, pressed, disabled and loading states as applicable. Forms additionally
implement field error, error summary, success and recoverable system failure.
Touch targets remain at least 44 CSS pixels in the primary mobile navigation
and workflow controls.
