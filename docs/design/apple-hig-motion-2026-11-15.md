# Apple Human Interface Guidelines — NovaPharm Motion Web Contract

**Date:** 15 November 2026  
**Scope:** Static public GitHub Pages, Corporate, Technology, Status, customer/employee Portal and Founder Next.js shells, shared design-system classes.

## Apple references and correct interpretation

1. https://developer.apple.com/design/human-interface-guidelines/motion
   - Motion has a purpose: feedback, status and context. Avoid gratuitous loops and unnecessary animation on repeated interactions. Make motion optional, brief, interruptible and consistent with gesture direction.
2. https://developer.apple.com/tutorials/swiftui/animating-views-and-transitions
   - Apple's own banner states this tutorial no longer demonstrates current SwiftUI/Xcode practice. Its general ideas about *state-driven* transitions are useful; its SwiftUI modifiers and Xcode project are **not web code**.
3. https://developer.apple.com/tutorials/develop-in-swift/
   - Current native Swift/Xcode learning route. Relevant concepts include state-driven change, predictable timing and animations that preserve context; the web implementation uses browser CSS/DOM, not SwiftUI.
4. https://developer.apple.com/design/human-interface-guidelines/accessibility
   - Reduced Motion may require eliminating zoom, depth, blur and lateral motion in favor of instant updates or fades.

**No Apple-owned binary assets, proprietary fonts, SwiftUI code or native App Clips are copied to the website.** NovaPharm is not Apple-certified or affiliated.

## Implemented and reproducible

| Requirement | Web implementation | Verification |
| --- | --- | --- |
| Shared rhythm | `assets/css/novapharm-hig-motion.css` defines fast/standard/context timing and easing | Motion source contract |
| Repeat-action feedback | Only colour, border, shadow and opacity change on `.np-button`, tabs and opt-in feedback | Scoped selectors |
| Dialogs | Short one-shot entry; immediate dismissal; no long blocking overlay | `.np-dialog[open]` |
| Drawers | Directional, short open/close; visibility follows UI state | `.np-drawer` |
| Legacy reveal | 18px/650ms updated to 6px/260ms; no animation when reduced motion/data | `assets/css/motion.css` |
| Decorative network flow | Continuous infinite loop removed; diagram remains static and meaningful | Legacy stylesheet assertion |
| Reduced Motion | Honors OS/browser media preference across all included estates, including scrolling | Media query and contracts |
| Data Saver | No contextual reveal animations when browser signals a data-saver preference; JS skips reveal on `navigator.connection.saveData` | CSS+JS |
| JS-unavailable/old browser | No hidden reveals unless JS arms the observer; fallback if IntersectionObserver unavailable | JS source contract |
| Platform wiring | Static Pages bundle/entry plus 5 Next.js root layouts | Import contracts |
| CI | Source assertions plus exact reproducible generated bundle | `apple-hig-motion.yml` |

## Rules for every new module

- Default to **no** animation. Introduce it when it clarifies a transition, progress, location or state.
- Prefer CSS transitions of compositor-friendly opacity/transform only when spatial movement conveys meaning; for frequently used controls prefer non-spatial colour/border changes.
- Never communicate critical healthcare data, successful payment, order submission or an error exclusively through animated effects. Keep semantic text, status and live regions.
- Do not add perpetual spinners, breathing or parallax on charts, Medicine Terminal, WMS, payment confirmation, search or dashboard views. Loading affordances need accessible text and end when activity ends.
- Honor `prefers-reduced-motion`; do not block keyboard input, navigation, cancellation or dismissal until an animation completes.
- Treat native-only visionOS / watchOS / SwiftUI APIs as non-applicable to a browser. Web versions use standard DOM/CSS and user preference media queries.

## Release acceptance criteria

1. Run `node scripts/test-apple-hig-motion.mjs` and `node scripts/build-css-bundle.mjs`, then confirm a clean CSS bundle diff.
2. Run Next.js app type checks and website build checks through existing GitHub CI, not by claiming a source-only branch is live.
3. In Chromium and Safari/WebKit at 320px, 390px and desktop, check drawer/dialog feedback, no layout shift, keyboard focus retention and fast dismissal.
4. Emulate `prefers-reduced-motion: reduce` and verify: no hidden content, no continuous motion, no motion-only states, no forced smooth scrolling.
5. After merge, verify the exact deployed revision on each *independently deployed* production domain. A source merge alone is not proof that protected customer or Intelligence applications are live.

The timing values are NovaPharm design decisions, **not** exact Apple-prescribed values. This is a source-level motion foundation, not a claim of 100% complete per-module QA or live deployment.

### Existing public ambient animations

The shared stylesheet additionally overrides five older, automatically looping visual effects in the public hero: animated grid, orbital circle, signal cards, module photography drift and homepage photography drift. These images remain fully visible as static artwork. Deliberate loading indicators with accompanying text are not disabled for users without reduced-motion preferences.

The Pages pull-request validator, guarded AWS-backed production publisher and approved release-dispatch filter all explicitly track future updates to the shared motion stylesheet. Automatic release remains subject to existing production checks and exact revision verification.

## Corporate Next.js follow-up and protected runtime boundary (15 November 2026)

The Corporate Next.js hero uses `.pharma-home-media img` without the old static `body[data-page="home"]` attribute. The shared motion override now matches both the Next.js route and public Pages. Automated source coverage prevents reintroducing perpetual photographic movement.

AWS inspection confirmed that `portal.novapharmhealthcare.com` maps to the separate Nutraxin customer BFF, not the unified Next.js Portal. That BFF already contains a reduced-motion fallback in its account-entry CSS. No account, role, checkout, consent or WMS behaviour is changed in this follow-up.

The protected Intelligence gateway serves independently pinned Lambda aliases. A review of its existing runtime did **not** establish that the merged motion revision has been released to those aliases. To declare the entire estate complete, each protected application's exact built artifact, release authorization, keyboard and reduced-motion browser testing, and live domain version must be verified. No production alias should be updated from CSS source changes alone.
