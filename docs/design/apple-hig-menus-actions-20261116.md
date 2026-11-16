# NovaPharm Apple HIG — menus and actions

Source review: 16 November 2026. This document distinguishes reusable web implementation, individual-route adoption, and verified live release. Apple native APIs cannot run directly in a website.

## Owner-provided HIG pages and NovaPharm decisions

| Official source | Web design decision | Current code |
|---|---|---|
| [Menus and actions](https://developer.apple.com/design/human-interface-guidelines/menus-and-actions) | Coherent commands, visible priorities | ActionToolbar / CommandMenu |
| [Activity views](https://developer.apple.com/design/human-interface-guidelines/activity-views) | Web Share API or clipboard for explicitly public URLs only | SharePublicLink |
| [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | Text verbs, press state, 44px targets, semantic disabled states, clear destructive role | ActionToolbar and styles |
| [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus) | Keep context commands discoverable in main interface, hide irrelevant items in contextual surfaces | Visible CommandMenu available; secondary-click/long-press route integration pending |
| [Dock menus](https://developer.apple.com/design/human-interface-guidelines/dock-menus) | System macOS app menu, not a browser feature | Native-only; not applicable |
| [Edit menus](https://developer.apple.com/design/human-interface-guidelines/edit-menus) | Preserve native browser Select, Copy, Cut, Paste, Undo | No replacement browser edit menu |
| [Home Screen quick actions](https://developer.apple.com/design/human-interface-guidelines/home-screen-quick-actions) | UIKit iOS app shortcut feature not available to ordinary web pages; PWA manifest shortcuts are not equivalent | Native shortcut unsupported by browser; public PWA manifest shortcuts added separately, browser-dependent |
| [Menus](https://developer.apple.com/design/human-interface-guidelines/menus) | Short labels, priority order, groups, discernible disabled actions | CommandMenu |
| [Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments) | visionOS window-specific feature | Not applicable to web |
| [Pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons) | Flat mutually exclusive choice with known current value | ChoicePicker, native select |
| [Pull-down buttons](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons) | Closely related commands; do not bury primary actions | CommandMenu |
| [The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar) | macOS and iPad native app menu bar, not a website header | Native-only; browser owns system menu |
| [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) | Small visible high-value commands; secondary More group | ActionToolbar |
| [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles) | Visible binary setting, never distinguish by colour alone | BinaryToggle |
| [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) | Use existing Tabs for closely related subviews and native selection for compact exclusive choices; no action/state mixing | Existing Tabs / ChoicePicker |

## Supplied developer/API references

- Activity — [UIActivityViewController](https://developer.apple.com/documentation/uikit/uiactivityviewcontroller), [UIActivity](https://developer.apple.com/documentation/uikit/uiactivity), [app extension support](https://developer.apple.com/documentation/foundation/app-extension-support): native OS services and installed extensions; do not copy into React.
- Buttons — [SwiftUI Button](https://developer.apple.com/documentation/swiftui/button), [UIButton](https://developer.apple.com/documentation/uikit/uibutton), [NSButton](https://developer.apple.com/documentation/appkit/nsbutton), [changesSelectionAsPrimaryAction](https://developer.apple.com/documentation/uikit/uibutton/changesselectionasprimaryaction): browser buttons, links and inputs are semantic equivalents.
- Context — [SwiftUI View.contextMenu](https://developer.apple.com/documentation/swiftui/view/contextmenu(menuitems:)), [UIContextMenuInteraction](https://developer.apple.com/documentation/uikit/uicontextmenuinteraction), [NSMenu popUpContextMenu](https://developer.apple.com/documentation/appkit/nsmenu/popupcontextmenu(_:with:for:)): web context menus must preserve keyboard discoverability.
- Dock — [NSApplicationDelegate Dock menu](https://developer.apple.com/documentation/appkit/nsapplicationdelegate/applicationdockmenu(_:)): native-only.
- Edit — [UIEditMenuInteraction](https://developer.apple.com/documentation/uikit/uieditmenuinteraction), [NSMenu](https://developer.apple.com/documentation/appkit/nsmenu): preserve standard browser editing. Owner repeated UIEditMenuInteraction; it is the same API.
- Home Screen — [UIKit quick actions sample](https://developer.apple.com/documentation/uikit/add-home-screen-quick-actions): native-only.
- Menus — [SwiftUI Menu](https://developer.apple.com/documentation/swiftui/menu), [UIKit menus and shortcuts](https://developer.apple.com/documentation/uikit/menus-and-shortcuts), [AppKit menus](https://developer.apple.com/documentation/appkit/menus).
- Ornaments — [SwiftUI ornament modifier](https://developer.apple.com/documentation/swiftui/view/ornament(visibility:attachmentanchor:contentalignment:ornament:)): visionOS-only.
- Pop-up — [MenuPickerStyle](https://developer.apple.com/documentation/swiftui/menupickerstyle), [UIButton selection](https://developer.apple.com/documentation/uikit/uibutton/changesselectionasprimaryaction), [NSPopUpButton](https://developer.apple.com/documentation/appkit/nspopupbutton).
- Pull-down — [MenuPickerStyle](https://developer.apple.com/documentation/swiftui/menupickerstyle) (supplied twice), [showsMenuAsPrimaryAction](https://developer.apple.com/documentation/uikit/uicontrol/showsmenuasprimaryaction), [NSPopUpButton.pullsDown](https://developer.apple.com/documentation/appkit/nspopupbutton/pullsdown).
- Menu bar — [SwiftUI CommandMenu](https://developer.apple.com/documentation/swiftui/commandmenu), [UIKit sample](https://developer.apple.com/documentation/uikit/adding-menus-and-shortcuts-to-the-menu-bar-and-user-interface), [AppKit NSStatusBar](https://developer.apple.com/documentation/appkit/nsstatusbar). The supplied concatenated UIKit/NSStatusBar hyperlink was malformed and is treated as two separate documentation URLs.
- Toolbars — [SwiftUI toolbars](https://developer.apple.com/documentation/swiftui/toolbars), [UIToolbar](https://developer.apple.com/documentation/uikit/uitoolbar), [NSToolbar](https://developer.apple.com/documentation/appkit/nstoolbar).

## Two supplied Xcode ZIP archives inspected

1. AddHomeScreenQuickActions.zip — iOS application Info.plist defines static Search and Share shortcuts. SceneDelegate handles quick actions on warm/cold app activation and sets dynamic UIApplication shortcut items from favourites. These UIKit actions cannot operate in the NovaPharm website; do not label a PWA alternative equivalent to native iOS.
2. AddingMenusAndShortcutsToTheMenuBarAndUserInterface.zip — Mac Catalyst MenuController constructs UIMenu / UICommand / UIKeyCommand groups for File, Cities, Navigation, Style, and Tools. AppDelegate builds the menu; UIContextMenuInteractionDelegate provides context commands; validate and canPerformAction manage eligibility. Keyboard shortcut and localization patterns guide, but their UIKit symbols cannot be imported into web code.

## Release and clinical/operational controls

- The shared components are available after build/merge; **this branch is not a claim that all NovaPharm routes have adopted them**.
- Keep the existing medical, regulatory, procurement and fulfilment approval boundaries. Rendering an enabled item is not permission to execute server mutations.
- Destructive commands require an explicit handler and confirmation message, and a bare destructive URL is disabled. Confirmation is only a UX safeguard; server authorization must still be validated.
- Share only intentionally public HTTPS URLs: never signed evidence links, invoices, customer identifiers, authentication or medication data.
- Preserve primary actions and standard browser editing instead of duplicating or hiding them in menus.
- Before claiming acceptance: exact-head CI, TypeScript, SSR tests, Chromium/WebKit keyboard and touch tests, RTL, forced colours, 200–400% zoom, reduced motion, screen readers. Test Escape/outside dismiss and Arrow/Home/End navigation.
- Separately roll out and audit public Corporate/Technology/Founder/Status, Intelligence, Customer Portal, Employee Portal, Distribution/WMS and all applicable governed modules; verify exact published SHAs and protected user journeys. No AWS, clinical, stock, payment or approval mutation in this branch.

## Public web-app shortcuts (browser-dependent)

Both root manifest.webmanifest and apps/corporate/app/manifest.ts advertise exactly two public in-scope choices: Browse Products (/products/) and Contact NovaPharm (/contact/). These do not implement iOS UIKit UIApplication shortcut items or an installed Mac Dock menu. Shortcuts visibility and ordering are decided by supporting browsers/platforms; Safari/iOS support must not be assumed. No protected Portal, Intelligence, clinical, billing, stock, or approval URL is included.

## Verified source-specific rules and cross-estate adoption (16 Nov 2026)

The official pages were read in their Markdown forms, including the linked SwiftUI/UIKit/AppKit/Foundation reference pages. The original owner supplied UIEditMenuInteraction and MenuPickerStyle more than once. These duplicates are one technical requirement each. The original combined UIKit menu-bar + NSStatusBar URL was malformed; both actual Apple pages were reviewed individually. The Apple supplied samples are iOS and Mac Catalyst projects, not React implementations.

### Action hierarchy and semantics
- Apple **Buttons**: 44 × 44 pt native recommendation, visible press feedback, short purpose-first labels, only one or two prominent actions, and never make an irreversible destructive action primary. On the web this contract uses minimum 44 CSS pixels as a target and does not claim physical points are equivalent across platforms.
- Apple **Menus**: succinct verb labels, priority order, consistent icons only where meaningful, ellipsis when further input is required, disabled unavailable actions in regular menus. Apple **Context menus** differs: omit inapplicable commands and duplicate every available context action in a visible interface; never hide the only route to completing work in a right click.
- Apple **Pull-down buttons**: keep primary action visible, group three or more directly related secondary actions and seek confirmation before destructive actions. Apple **Pop-up buttons**: a flat exclusive choice with a visible current value; never use one to issue commands.
- Apple **Segmented controls**: related simultaneous-visible choices, no mixing of command and selection behaviors, ideally two to five options on narrow screens. New web SegmentedChoice uses **native mutually exclusive radios** to preserve arrows, Tab, checked state and screen-reader names.
- Apple **Toolbars**: deliberate visible commands, small groups, meaningful titles, and More only when needed. On the web retain the browser's own address/print/edit controls and avoid pretending a page toolbar is a native Mac window toolbar.
- Apple **Activity views**: use the familiar Share command for shareable context; avoid duplicate Print/Copy actions when native share UI already supplies them; browser Web Share is a supported analogue only for approved public destinations.
- Apple **Edit menus**: selection, Cut, Copy, Paste, Undo, Translate and Look Up must retain normal browser/system behavior. No global Command+C or Control+V interception and no fake system menu bar.

### Native-only boundaries
Dock menus, the macOS/iPadOS native menu bar, NSStatusBar items, visionOS ornaments, and UIKit Home Screen quick actions require the corresponding installed native application. The two owner-supplied sample archives establish those platform assumptions, including static Info.plist shortcuts, UIApplication dynamic shortcuts, scene lifecycle handling, UIMenu/UICommand/UIKeyCommand, action availability and context-menu presentation. The public PWA manifest shortcuts in this branch are browser-dependent navigation hints, not UIKit Home Screen quick actions.

### Actual adoption
The employee Distribution/WMS recorded-exception filter (apps/portal/components/wms-recorded-evidence-studio.tsx) now consumes SegmentedChoice from the shared design system. The setting remains a local **read-only priority filter** over application evidence; it cannot mark a 3PL incident, approve a QA disposition, reserve stock or dispatch a shipment. The shared component library additionally exposes CommandMenu, ActionToolbar, ChoicePicker, BinaryToggle and SharePublicLink for appropriate routes. These components are not proof of adoption by all 54 portal modules.

### Per-change enforcement
The exported canonical policy is packages/design-system/src/menu-actions-policy.ts. The PR review template requires action-specific HIG classification and an explicit native-only exclusion. The dedicated Apple HIG Menus and Actions workflow runs source-policy, manifest-parity, TypeScript and component tests; it is a code guard, not a browser or server-authorization substitute.

Release evidence must include exact-head CI, meaningful client interactions at touch/keyboard/RTL/zoom/forced-colours, risk-based authenticated acceptance, published artifact SHA and a rollback plan. Do not substitute source tests or merged GitHub state for production browser proof.
