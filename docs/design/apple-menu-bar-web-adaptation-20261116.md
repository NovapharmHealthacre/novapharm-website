# NovaPharm corporate navigation — Apple menu guidance adaptation
Reviewed: 16 November 2026

## Visual sources and scope
The owner supplied (1) a Safari screenshot of the official Apple Developer HIG *The menu bar* page, including Apple's dark website chrome and a sample Mac app menu; (2) the NovaPharm live homepage showing an unusually tall, white all-text header; and (3) the *AddingMenusAndShortcutsToTheMenuBarAndUserInterface* Swift/UIKit sample ZIP.

**Important:** Apple describes the Mac/iPad menu bar as a native application/system menu, not a browser website navigation pattern. The correct NovaPharm implementation is a carefully styled **corporate web navigation**, not a fake native macOS menu or copying Apple's trademarks.

## Source mapping
| Supplied official reference | Relevant guidance | NovaPharm application |
| --- | --- | --- |
| [HIG — The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar) | Top-level commands for native Mac/iPad apps; familiar order and placement | Web-adapted compact global hierarchy; do **not** create File/Edit/View menus on the website |
| [HIG — Menus](https://developer.apple.com/design/human-interface-guidelines/menus) | Clear, succinct labels and logically grouped actions, with predictable behaviour | Grouped corporate category panels, concise headings and link labels |
| [SwiftUI Menu](https://developer.apple.com/documentation/swiftui/menu) | Native SwiftUI menu control | Conceptual disclosure reference only; native API is not used by HTML |
| [UIKit menus and shortcuts](https://developer.apple.com/documentation/uikit/menus-and-shortcuts) | Context and command menus in UIKit | Preserve browser keyboard, focus and Escape; no UIKit dependency |
| [AppKit menus](https://developer.apple.com/documentation/appkit/menus) | macOS app menu system | Not a browser API |
| [HIG — Dock menus](https://developer.apple.com/design/human-interface-guidelines/dock-menus) | Native app Dock shortcuts | Not applicable to public website navigation |
| [HIG — Standard keyboard shortcuts](https://developer.apple.com/design/human-interface-guidelines/keyboards#Standard-keyboard-shortcuts) | Don't redefine or hijack familiar keyboard commands | Keep native browser shortcuts; use Tab, Shift+Tab, Enter and Escape correctly |
| [SwiftUI CommandMenu](https://developer.apple.com/documentation/swiftui/commandmenu) | Native Mac app command menus | Not a website command menu |
| [UIKit sample — Adding menus and shortcuts](https://developer.apple.com/documentation/uikit/adding-menus-and-shortcuts-to-the-menu-bar-and-user-interface) | Mac Catalyst UIMenuBuilder/UIMenu/UICommand patterns; source ZIP owner supplied | Respect grouping and command predictability without embedding or copying native Swift code |
| [AppKit NSStatusBar](https://developer.apple.com/documentation/appkit/nsstatusbar) | Mac menu-bar status items | Not a website navigation feature |

The supplied UIKit URL was duplicated end-to-end in the message; its canonical path is listed above.

## Actual owner-supplied Apple project file audit

The owner-provided ZIP was opened and its 91 entries catalogued. These comprise Git metadata/directories and **34 application files**, including 8 Swift sources, README, Xcode project/configuration, localized strings, settings, storyboards, app icon metadata and the licence. There is no HTML/CSS/React website navigation implementation in the archive.

- `Menus/MenuController.swift`: groups related `UIMenu`, `UICommand`, and `UIKeyCommand` elements. Transfer concise grouping, not native API usage.
- `Menus/AppDelegate.swift`: inserts the menu via `buildMenu(with:)`; only Mac Catalyst uses this native mechanism.
- `Menus/PrimaryViewController.swift`: validates command availability with `canPerformAction` and `validate`; transfer honest disabled-state and focus design to applicable web controls.
- `Menus/DetailViewController.swift`: groups contextual commands using `UIContextMenuInteractionDelegate` and `UIAction`; do not convert informational corporate navigation into edit commands.
- `Menus/PrimaryViewController+Toolbar.swift`: native toolbar command slots; separate from a website global navbar.
- `Menus/PrimaryViewController+Table.swift`, `Menus/TableItem.swift`, `Menus/SceneDelegate.swift`: sample table/state/window scaffolding, not reusable browser menu code.
- `Menus/en.lproj` and `Menus/zh-Hans.lproj`, settings bundles, `Info.plist`: localization and native app command configuration; web parallels are distinct interface translations and properly labeled controls.
- `README.md`: explains the sample's File > Open shortcut, Style state checks, contextual editing and native Print integration; keep browser defaults instead of intercepting Command+O, Command+Q, Copy or Print.

This audit reflects actual ZIP contents, not an inference from its filename. Importing its Swift files into the Next.js or static website would not work.

## Re-reviewed guidance priorities

- Apple's **Menus** guidance explicitly favors concise action labels, consistent groups, important items early, few submenu levels, predictable state and appropriate disabled indication.
- **Menu bar** standard menus and **CommandMenu** apply to installed Mac/iPad software, not browser navigation; avoid fake File/Edit/Window menus.
- **Keyboard** guidance warns against stealing system shortcuts. The public website uses normal links, Enter, Tab, Escape and ArrowDown only where expected; Ctrl/Command/Option-modified clicks must remain browser-controlled.
- **Dock menus** and **NSStatusBar** concern OS-managed launch/status shortcuts; they do not justify an invented web Dock or a global status control.
- The current PR adds click-to-disclose behavior for static desktop categories. Without JavaScript, their existing hrefs continue to work and the same overview pages remain reachable inside the disclosed panel.

## Design acceptance for both corporate renderers
- Height 52px; charcoal \#171719 nav material, quiet cool-white labels; controlled contrast.
- Approved NovaPharm logo artwork only: white visual treatment of the existing approved logo in both corporate renderers (without swapping the registered identity or modifying the underlying image).
- At desktop width: compact, restrained global hierarchy; approved red Secure Portal action. No brand or Apple mark substitution.
- At narrow widths: visible, operable Menu button with a scrollable disclosure and no viewport overflow.
- Static category mega panels share the bar's restrained dark material, preserve ordinary anchor destinations and remain keyboard operable; do not require JavaScript to reach essential pages.
- Keep existing portal origin and authentication boundary unchanged.
- Preserve RTL language layout, brand marks without mirroring, minimum 44px target sizes, focus indication, reduced motion, reduced transparency, high contrast and forced colours.
- Use *no* invented native application File/Edit/Window/Help menus, Apple-owned artwork, or OS shortcut claims.
- Verify on 320/390/768/1280/1366/1440/1920 widths and both Chromium and WebKit as available.
- Treat successful PR checks/merge as distinct from the production website's actual published CSS and browser verification.

## Code ownership and release boundary
Source of truth: `assets/css/apple-web-navigation.css`.
The static bundle `assets/css/novapharm.bundle.css` is generated by `scripts/build-css-bundle.mjs`; the Next.js corporate site imports the same source via `apps/corporate/app/layout.tsx`.
Automated checks: `scripts/test-apple-web-navigation.mjs`, Apple HIG Layout Contract workflow, corporate browser-acceptance assertions, sitewide design audit.
**Do not claim the live site is updated until deployed exact-SHA and live browser evidence show the new header.** AWS resources are untouched by this PR.
