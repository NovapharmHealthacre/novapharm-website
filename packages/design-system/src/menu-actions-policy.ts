/**
 * Permanent NovaPharm interaction policy.
 *
 * Apple HIG principles are adapted to semantic web controls and NovaPharm's
 * existing regulated-access boundaries; this is not a native OS API shim.
 * Use this policy before creating a new interaction anywhere in the estate.
 */
export const menuActionsPolicy = Object.freeze({
  version: "2026-11-16",
  estates: ["corporate", "technology", "founder", "status", "portal", "intelligence", "distribution"] as const,
  scope: "all new and materially modified NovaPharm web pages and modules",
  patterns: Object.freeze({
    menusAndActions: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/menus-and-actions",
      use: "One clear action hierarchy across navigation, selection and contextual tasks",
      avoid: "Copying native UIKit, SwiftUI and AppKit implementations into websites",
      web: "Native buttons, anchors, CommandMenu and ActionToolbar",
    }),
    activityViews: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/activity-views",
      use: "Share button for clearly public and intentionally sharable resources",
      avoid: "Duplicate fake system share sheets or leaks of protected and signed URLs",
      web: "SharePublicLink with Web Share API and canonical HTTPS clipboard fallback",
    }),
    buttons: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/buttons",
      use: "Instant action, descriptive verb label, press and disabled states, 44px accessible target",
      avoid: "Destructive primary action, inconsistent sizes and decorative icon-only buttons",
      web: "Semantic button or anchor with focused action hierarchy",
    }),
    privacyLocationButton: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/privacy#Location-button",
      use: "Request location only when a specific person-initiated task needs it",
      avoid: "Pretending CoreLocation one-time permission buttons are available in a web browser or asking for location on page load",
      web: "If a genuine location feature exists, use the browser permission mechanism after a clear user action; no tracking or coordinates added by this policy",
    }),
    contextMenus: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/context-menus",
      use: "Small set of directly relevant actions also present in the main UI",
      avoid: "Long hidden menu, nested menus or replacing native edit context menus",
      web: "Optional progressive enhancement plus visible actionable controls",
    }),
    dockMenus: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/dock-menus",
      use: "Native installed Mac application only",
      avoid: "Claiming a browser site can register NSApplication Dock items",
      web: "Not applicable to a web-only application",
    }),
    editMenus: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/edit-menus",
      use: "Respect selection, Copy, Paste, Cut, Undo, Translate and Look Up",
      avoid: "Intercepting standard browser OS text-edit commands",
      web: "Use standard editable HTML fields and browser selection UI",
    }),
    homeQuickActions: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/home-screen-quick-actions",
      use: "Native UIKit applications may expose static and dynamic icon actions",
      avoid: "Presenting a PWA manifest as an iOS UIKit shortcut guarantee",
      web: "Optional public-only manifest shortcuts; platform dependent",
    }),
    menus: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/menus",
      use: "Short verb labels, priority ordering, grouped commands, disabled unavailable regular menu items",
      avoid: "Overcrowded groups, irrelevant symbols or hidden primary action",
      web: "CommandMenu, with native disclosure and keyboard support",
    }),
    ornaments: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/ornaments",
      use: "Native visionOS windows only",
      avoid: "Floating decorative controls obscuring the website",
      web: "Not applicable to a web-only application",
    }),
    popUpButtons: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons",
      use: "Compact flat list of mutually exclusive choices",
      avoid: "Mixed commands and selection controls",
      web: "ChoicePicker native select",
    }),
    pullDownButtons: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons",
      use: "Three or more secondary commands attached to a predictable action",
      avoid: "Hiding all actions in one button or using it for exclusive selection",
      web: "CommandMenu with descriptive trigger",
    }),
    menuBar: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/the-menu-bar",
      use: "Native macOS/iPad application menu conventions only",
      avoid: "Hijacking browser/system menu shortcuts",
      web: "Not applicable; retain standard browser controls",
    }),
    toolbars: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/toolbars",
      use: "Frequent contextual actions in consistent small groups; More only for overflow",
      avoid: "Unbounded command clusters, needless tinted or boxed controls",
      web: "ActionToolbar with labelled keyboard/RTL navigation",
    }),
    toggles: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/toggles",
      use: "Binary persistent setting, visible accessible checked state",
      avoid: "A button that looks like an on/off switch but lacks state semantics",
      web: "BinaryToggle native checkbox",
    }),
    segmentedControls: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/segmented-controls",
      use: "Two to five closely related visible exclusive choices with equal targets",
      avoid: "Mixed actions and selection state, many uneven labels",
      web: "SegmentedChoice native radio group",
    }),
  }),
  accessibility: Object.freeze({
    targetPixels: 44,
    keyboard: ["Tab", "Enter", "Space", "Escape", "Arrow keys", "Home", "End"] as const,
    layout: ["320px width", "200% zoom", "400% zoom", "RTL", "forced colours", "reduced motion"] as const,
  }),
  release: Object.freeze({
    mandatory: ["latest-head CI", "responsive browser QA", "authorisation on server",
      "exact deployed SHA", "live functional acceptance", "reversible rollout"] as const,
    prohibitions: ["no protected share URLs", "no unapproved stock actions", "no medicine-data leaks",
      "no browser shortcut hijacking", "no invented native-platform features"] as const,
  }),
});