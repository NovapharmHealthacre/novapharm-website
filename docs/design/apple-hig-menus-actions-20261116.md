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
