# NovaPharm right-to-left localization acceptance register

**State:** implementation candidate, not a published multilingual release  
**Updated:** 2026-11-16  
**Guidance:** Apple Human Interface Guidelines — Right to left; Apple Localization; SwiftUI Preparing views for localization (design reference only, not a SwiftUI web runtime)

## Language and publication contract

- English (en-GB) is the content source of truth and remains fully usable without JavaScript.
- Arabic (ar) and Hebrew (he) currently offer **layout previews only**, clearly labelled to users. A locale cookie (`np_locale`) stores an explicit user selection for up to 365 days using `SameSite=Lax` and `Secure` on HTTPS. It is not an analytics, marketing, authentication or authorisation cookie.
- Server-side Next.js shells emit a matching `lang` and `dir`. Generated static pages apply direction in a head-loaded external script before DOM construction; when JavaScript is unavailable, English remains the accessible default.
- Never advertise translated canonical URLs, hreflang alternate URLs, or localized Open Graph copy until approved translations actually exist.
- Clearly identify untranslated English editorial/clinical/legal text with `lang="en-GB"`. This is not equivalent to Arabic/Hebrew translations.

## Surface coverage

| Surface | Direction foundation | Common navigation | Full content translation | Browser evidence |
| --- | --- | --- | --- | --- |
| Corporate Next.js | Implemented in PR #765 | Arabic/Hebrew top-level navigation and footer | Pending | RTL preflight added, CI pending |
| Generated public website | Implemented in PR #765 | Common links and headings in preview | Pending | CI pending |
| Secure Portal (customer / employee / executive / admin) | Root direction and CSS rules in PR #765 | Main workspaces still English | Pending | Protected role-boundary CI pending |
| Intelligence medicine workspaces | Inherits portal direction | Workspace content still English | Pending | Protected browser CI pending |
| NovaPharm Innovation Technology | Root direction and primary navigation | Key menu labels in preview | Pending | Browser CI pending |
| Founder website | Root direction and primary navigation | Key menu labels in preview | Pending | Browser CI pending |
| Service status | Root direction and selected chrome; dates use selected locale | Status descriptions remain English | Pending | Browser CI pending |
| Legacy static protected shells | Early direction bootstrap | English fallback | Pending | Static build/production gates pending |

## Apple RTL invariants

1. **Mirrored structure:** leading/trailing order for primary navigation, sidebars, breadcrumbs, tabs, panels, lists, ordered steps, and back/next controls should reverse in RTL. Audit visually across every route, including mobile menus and expanded states.
2. **Language-aware alignment:** short interface labels align to the reading direction; lengthy English paragraphs remain LTR until translated. Avoid English text being falsely read with an Arabic or Hebrew language code.
3. **Bidirectional values:** never mirror digits or reverse identifiers. Phone, email, URLs, clinical codes, EANs, SKU IDs, prices, measurements and payment references must retain character order and readable isolation. Validate both Western/Eastern Arabic numeral preferences as part of full localization.
4. **Navigation symbols:** flip only true backward/forward symbols. Real-world directional controls, external destinations, universal signs and real compass directions retain their meaning.
5. **Unmirrored assets:** NEVER flip NovaPharm/Nutraxin/technology logos, medicine packs, photographs, charts, map/geographic shapes or licensed illustrations; image presentation order may change when semantic reading sequence requires it.
6. **Controls and forms:** progress/range orientation follows RTL, but numeric values themselves never reverse. Focus order, checkbox/radio associations, field labels, errors, dropdown placement, tooltips, modals, breadcrumb order and cookie controls require keyboard and screen-reader acceptance.
7. **Typography:** browser-native Arabic/Hebrew shaping and suitable fallbacks, no faux uppercase, adequate line height and touch targets, optical alignment, support for font scaling and text expansion, no truncation/overlap.
8. **Privacy and identity:** preserve existing same-origin auth and revocation, cookie consent boundaries, analytics disabled-until-consented, server-authorized permissions and secure checkout behavior. Changing a display locale must never change access rights.
9. **Commercial accuracy:** medicine names, units (mg, mcg, mL), expiry/batch codes, tax, GBP prices, regulated claims, payment terms and healthcare disclosures need human-in-the-loop translation review and domain sign-off.
10. **Testing:** run Chromium and WebKit at 320, 375, 390, 430, 768, 1024, 1440 and 1920 px, including reduced motion, increased text, keyboard-only, no-JavaScript English fallback, forced colors and protected workflows. Capture RTL evidence without copying customer records.

## Definition of complete

Completion requires all source and browser tests to pass, approved native-language Arabic and Hebrew translations for every published page and workspace, medical/legal sign-off on controlled content, privacy disclosures for the first-party preference cookie, production deployment evidence, and authenticated tests of the actual customer experience (using synthetic data). This PR is the layout **starting point**, not that completion claim.

## References

- https://developer.apple.com/design/human-interface-guidelines/right-to-left
- https://developer.apple.com/localization/
- https://developer.apple.com/documentation/swiftui/preparing-views-for-localization
