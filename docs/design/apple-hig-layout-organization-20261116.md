# NovaPharm — Apple HIG Layout and organization adaptation (16 November 2026)

## Source review and implementation boundary

Apple references reviewed:
- [Layout and organization](https://developer.apple.com/design/human-interface-guidelines/layout-and-organization): boxes, collections, column views, disclosure controls, labels, lists/tables, lockups, outline views, split views and tab views.
- [Boxes](https://developer.apple.com/design/human-interface-guidelines/boxes): keep boxes smaller than their containing page, use padding/alignment rather than nested outlines, brief sentence-case titles when useful.
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout): reading-order hierarchy, alignment, space, progressive disclosure, control/content distinction, narrow/wide adaptability, safe areas, enlarged text and RTL reading order.
- [GroupBox](https://developer.apple.com/documentation/swiftui/groupbox) and [NSBox](https://developer.apple.com/documentation/appkit/nsbox): **native API references**, not runtime dependencies of a React/Next.js website.

These are platform-adapted *principles*, not an Apple website clone and not a claim of Apple approval or native SwiftUI/AppKit execution.

## Production candidate changes

1. Shared colour-neutral CSS `assets/css/apple-hig-layout.css` adds optional `.np-hig-box` (outlined, subtle, plain and wide), interior whitespace subgroups, responsive ordered collection, split-pane layout, disclosure and focus/forced-colour handling. Existing full-bleed heroes, catalogue grids, WMS density and authorised commerce flows remain unchanged unless explicitly opted in.
2. Shared React design system exports `GroupBox`, `CollectionView`, `SplitView` and `Disclosure`. GroupBox provides optional accessible heading and explanatory text; CollectionView preserves document/keyboard order; SplitView stacks without hiding its second pane; Disclosure uses a native `details` control that works without JavaScript.
3. Existing React abstractions already cover navigation, labelled form inputs, semantic tables, breadcrumbs, tabs, charts, product collections and status/drawer regions. This release extends them; it does not rewrite the 54 protected modules or change their access model.
4. All **five** Next.js shells now import the common layout source: Corporate, secure Portal/Intelligence, Technology, Founder, and Status. The static corporate web build also receives these primitives through its canonical generated CSS bundle.
5. The Status service rows are an actual semantic `ul/li` collection while retaining the same data contract, item order and presentation.

## Layout topic coverage and next acceptance

| Apple topic | Web equivalent / current approach | Scope of this release |
|---|---|---|
| Boxes | `GroupBox`, optional titled section, CSS `.np-hig-box` | New reusable primitive; no automatic nested card conversion |
| Collections | `CollectionView`, grid or semantic lists | New component, Status production page list |
| Column views | Responsive split/column layout | Foundation only; no new interactive data browser |
| Disclosure controls | Native `details/summary` and existing menus | New reusable disclosure component |
| Labels | Existing FormField and native label/legend | Existing contracts preserved |
| Lists and tables | `DataTable`, scroll regions, semantic list collections | Existing + Status list improvement |
| Lockups | Brand/navigation groups | Existing, no new composite control |
| Outline views | Semantic nested lists and navigation | Requires per-module hierarchy review |
| Split views | `SplitView` and existing responsive splits | New reusable component |
| Tab views | Existing accessible tab component | Existing; keyboard/focus browser testing is still required |

## QA and release gates

- `node --test scripts/test-apple-layout-contract.mjs`
- `npm run test --workspace=@novapharm/design-system`
- `npm run workspace:typecheck`
- `node scripts/build-css-bundle.mjs` followed by `git diff --exit-code -- assets/css/novapharm.bundle.css`
- Founder, Status, Corporate and Portal/Intelligence desktop/mobile, 200% and 400% browser zoom, keyboard focus, RTL and increased text tests.
- Protected customer, employee, admin and executive routes require real authorised session checks and role/tenant assertions, not visual mockups.
- Confirm GitHub checks, merge, public publish and deployment to each managed application separately.

### Explicitly not verified yet

The PR candidate does **not** prove that all 54 portal modules or every page have been manually checked at all sizes. It does not deploy native Apple APIs, bypass authorisation, authorise AWS changes, or establish that a build success equals live deployment. The section-by-section browser and production acceptance remain release gates.

## 16 November: hierarchy implementation extension

A new source-to-implementation ledger, [Apple Layout source matrix](apple-layout-source-matrix-20261116.md), now covers all ten linked Apple layout categories and each provided native framework reference.

The previous foundation-only gaps for column views and outline views have a concrete web implementation candidate: `ColumnBrowser`, `OutlineView`, `HierarchyExplorer`, and `ContentLockup`. The existing WMS prototype workspace map is the **only** new consumer: it navigates the existing 16 capability records with their recorded-data and integration constraints. The module remains under the existing employee access policy. The new code does not activate operations or grant authority.

The default native `details` outline retains readable hierarchy without script, while the optional three-pane browser exposes selected category, item, and evidence. Compact screens receive full stacked content, not a hidden desktop inspector. New contract and render tests cover source order, selection semantics, keyboard focus and governed links.

**Evidence gate remains open:** Until exact-head CI and authorised runtime browser acceptance, this is an unmerged implementation candidate, not proof of production deployment or completed audit of every portal/Intelligence route.
