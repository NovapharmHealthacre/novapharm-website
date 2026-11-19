# NovaPharm web layout — Apple HIG adaptation

Reference reviewed 15 November 2026: https://developer.apple.com/design/human-interface-guidelines/layout (9 September 2026 update).
Adjacent material reviewed: Layout and organization, Split views, Scroll views, Disclosure controls.

## Source sample
The owner supplied Apple's **Composing custom layouts with SwiftUI** sample.
Its pet-voting app uses Grid/GridRow for aligned columns, custom equal-width
horizontal and vertical Layout containers, ViewThatFits to change direction,
and a radial layout with AnyLayout for rank-driven arrangement.
The Swift source is a **native-platform reference**, not a component to ship
in a Next.js browser bundle. The useful translations are aligned CSS Grid,
auto-fitting equal action groups, responsive splits and context-preserving reflow.
The sample's radial pet leaderboard is intentionally **not** imposed on a
medical or warehouse management product: this would impede data reading.

## Contract scope
- Source: `assets/css/apple-hig-layout.css` (v1).
- Public static pages: `assets/css/novapharm.css` and generated `novapharm.bundle.css`.
- Corporate, Technology, Status, and Portal Next.js roots import the same file.
- Portal shell covers **54 source-defined modules** (18 customer, 13 employee,
  18 executive/board, 5 admin) but this does **not** activate their services.
- A shared layout layer is compatible with Intelligence workspace surfaces
  when rendered inside the portal; independent deployed Intelligence runtimes
  must be audited separately.
- Opt-in utilities: `np-hig-container`, `np-hig-measure`,
  `np-hig-section`, `np-hig-stack`, `np-hig-grid`, `np-hig-split`,
  `np-hig-equal-actions`, `np-hig-actions`, `np-hig-table-region`,
  `np-hig-disclosure`.
- Conservative existing-class guards prevent grid children, long labels and
  forms from forcing unwanted page-level horizontal scrolling. They do not
  restyle product imagery, change access permissions or invent module data.

## Acceptance matrix — release gate
Run `node --test scripts/test-apple-layout-contract.mjs`, rebuild the public
CSS and verify the generated bundle is clean. Before live publication, run
browser acceptance in Chromium and WebKit at 320, 375, 390, 768, 1024,
1440 and 1920 CSS px, and at 200%/400% zoom where supported. Repeat with
large text, long translated labels, keyboard-only use, mobile browser safe
areas and right-to-left fixtures. Verify:
1. No page-level horizontal overflow or clipped primary actions.
2. No overlapping headers, sidebars or disclosure menus.
3. Useful reading measure and aligned numeric columns.
4. Critical controls meet a 44px touch target on touch layouts.
5. Portrait/landscape and resizable windows preserve the same workflows.
6. Tables scroll only inside labelled data regions (not the entire page).
7. Reduced motion/forced colours and semantic focus remain usable.
8. Verify actual **deployed assets and signed-in module screens** separately
   from source builds and synthetically populated tests.

**Native-only exclusions:** tvOS screen dimensions, visionOS ornaments, watchOS
button limits, SwiftUI Dynamic Type APIs and Liquid Glass frameworks are not
web requirements. Their applicable usability principles are translated rather
than copied. Use NovaPharm-owned identity; do not imply Apple endorsement.

**Release truth:** This patch is a layout *foundation*, not proof that each
of the 54 portal modules, 22 Intelligence workspaces or production websites
have individually passed visual acceptance. That requires route-by-route
rendered evidence and an approved deployment of the corresponding frontend.
