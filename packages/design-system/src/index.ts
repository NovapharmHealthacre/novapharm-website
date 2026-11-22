export const designTokens = Object.freeze({
  colour: Object.freeze({
    midnight: "#0d1b2a",
    warmWhite: "#FBFAEF",
    porcelainWhite: "#F8F7F3",
    sovereignBlack: "#0B0B0E",
    porcelainStone: "#DEDCD5",
    controlBorder: "#86868B",
    charcoal: "#1b2028",
    coolGrey: "#667085",
    silver: "#DEDCD5",
    pharmaceuticalBlue: "#eaf3f8",
    novapharmRed: "#9D1B32",
    novapharmRedText: "#68101F",
    focus: "#0b69ff"
  }),
  materials: Object.freeze({
    navigation: Object.freeze({
      solid: "#FBFAEF",
      translucent: "rgba(251, 250, 239, 0.94)",
      separator: "rgba(11, 11, 14, 0.12)",
      blurredOnlyWhenSupported: true
    }),
    content: Object.freeze({ canvas: "#FBFAEF", grouped: "#F8F7F3", effect: "opaque" }),
    accessibility: Object.freeze({
      reducedTransparencyAttribute: "data-np-transparency=reduce",
      motion: "prefers-reduced-motion",
      contrast: "prefers-contrast",
      forcedColors: "forced-colors"
    })
  }),
  typography: Object.freeze({
    uiFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    compactFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    monoFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    editorialFamily: "ui-serif, 'Iowan Old Style', Charter, Georgia, serif",
    body: "1rem",
    caption: "0.875rem",
    lead: "clamp(1.125rem, 1.6vw, 1.375rem)",
    display: "clamp(2.75rem, 6vw, 5.75rem)",
    section: "clamp(1.875rem, 4vw, 4.25rem)",
    readingLeading: 1.65,
    interfaceLeading: 1.45,
    readingMeasure: "68ch",
    opticalSizing: "auto"
  }),
  radius: Object.freeze({ small: "4px", card: "8px" }),
  motion: Object.freeze({ immediate: "0ms", fast: "160ms", standard: "280ms", maximum: "480ms" }),
  layout: Object.freeze({ columns: 12, readingMeasure: "70ch", contentMax: "1440px", touchTarget: "44px" })
});

export type EstateProperty = "corporate" | "nit" | "founder" | "portal";

export const propertyDirection: Readonly<Record<EstateProperty, string>> = Object.freeze({
  corporate: "Editorial pharmaceutical continuity with evidence-led photography and controlled red accents.",
  nit: "Technical precision with dark data surfaces, real process media and restrained kinetic detail.",
  founder: "Quiet executive editorial design with portraiture, sources and long-form reading rhythm.",
  portal: "Dense, calm operational workspace optimised for scanning, comparison and repeated action."
});

export function reducedMotionCss(): string {
  return "@media (prefers-reduced-motion: reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:0.001ms!important;animation-iteration-count:1!important;transition-duration:0.001ms!important;}}";
}

export * from "./components";
export * from "./styles";
export * from "./symbols";
export * from "./app-store-badges";
export * from "./image-content";
export * from "./modal-dialog";
export * from "./file-selection-zone";
export * from "./controlled-document-viewer";
export * from "./notification-preferences";
export * from "./layout-organization";
export * from "./layout-policy";
export * from "./menu-actions-policy";
