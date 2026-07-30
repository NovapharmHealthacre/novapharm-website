export const designTokens = Object.freeze({
  colour: Object.freeze({
    midnight: "#0d1b2a",
    warmWhite: "#fbfaf8",
    charcoal: "#1b2028",
    coolGrey: "#667085",
    silver: "#d8dde4",
    pharmaceuticalBlue: "#eaf3f8",
    novapharmRed: "#be3035",
    focus: "#0b69ff"
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
