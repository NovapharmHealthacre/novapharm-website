/**
 * NovaPharm layout and organization design contract, adapted from Apple's
 * Human Interface Guidelines for accessible React/HTML/CSS websites.
 *
 * This is a decision standard for every new NovaPharm page and module. It does
 * not load SwiftUI/UIKit/AppKit/tvOS code, grant data rights or alter a route.
 */
export const layoutOrganizationPolicy = Object.freeze({
  version: "2026-11-16",
  estates: ["corporate", "technology", "founder", "status", "portal", "intelligence", "distribution"] as const,
  scope: "all new and materially modified NovaPharm web screens",
  patterns: Object.freeze({
    collections: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/collections",
      use: "Image-rich product, portrait and visual-asset sets",
      avoid: "Dense text-only medicines, invoices, quality or batch ledgers",
      web: "CollectionView / ordered list and responsive CSS grid",
    }),
    columnViews: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/column-views",
      use: "Deep, reversible hierarchy with parent, child and preview, on wide screens",
      avoid: "Flat tables or narrow screens that would truncate essential information",
      web: "ColumnBrowser with a native outline alternative and adjustable category pane",
    }),
    disclosureControls: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/disclosure-controls",
      use: "Advanced choices and secondary information with descriptive labels",
      avoid: "Hiding primary actions, approvals or essential warnings",
      web: "Disclosure or native details/summary",
    }),
    labels: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/labels",
      use: "Concise, readable, selectable interface text",
      avoid: "Icon-only names, faux editing and decorative status pills",
      web: "Native text, FormField and TextLabel",
    }),
    listsAndTables: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/lists-and-tables",
      use: "Text-heavy records with proper headings, sorting only when accurate, and stable row order",
      avoid: "Unlabelled columns, fake transactions or hidden primary details",
      web: "Semantic list / DataTable / bounded scroll region",
    }),
    lockups: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/lockups",
      use: "A single navigable product, media or content entity",
      avoid: "Nested links/buttons or irrelevant hover enlargements",
      web: "ContentLockup with one destination",
    }),
    outlineViews: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/outline-views",
      use: "Text-heavy nested documents and operation hierarchies",
      avoid: "Flat metrics or datasets without a real hierarchy",
      web: "OutlineView with native disclosure and meaningful source order",
    }),
    splitViews: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/split-views",
      use: "Related navigation, results and evidence inspector",
      avoid: "Clipped panes and obstructed mobile content",
      web: "SplitView / responsive stack with visible selection",
    }),
    tabViews: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/tab-views",
      use: "A small number of mutually exclusive, closely related content panes",
      avoid: "Global navigation, unrelated actions or more than six tab destinations",
      web: "Tabs with keyboard focus and labelled panels",
    }),
    overallLayout: Object.freeze({
      source: "https://developer.apple.com/design/human-interface-guidelines/layout-and-organization",
      use: "Precise alignment, accessible hierarchy, no clipped workflows, logical RTL reflow",
      avoid: "Uniform card grids forced onto all information shapes",
      web: "Shared tokens and apple-hig-layout.css imported by every application shell",
    }),
  }),
  acceptance: Object.freeze({
    widths: [320, 375, 390, 768, 1024, 1440, 1920] as const,
    zoom: ["200%", "400%"] as const,
    browsers: ["Chromium", "WebKit"] as const,
    states: ["keyboard", "RTL", "reduced motion", "forced colours", "long translated labels", "authorized and denied"] as const,
    mustProve: ["exact-head CI", "current bundle parity", "deployed SHA", "authenticated runtime acceptance"] as const,
  }),
});
