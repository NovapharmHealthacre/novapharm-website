/** Mobile-only, original NovaPharm semantic appearance tokens.
 * Uses system typography; no bundled Apple font or SF Symbols artwork.
 * Android and iOS consume the same safe, offline color contract.
 */
export const mobileLightPalette = Object.freeze({
  canvas: "#FFFFFF",
  grouped: "#F5F5F7",
  raised: "#E8E8ED",
  border: "#6C6C70",
  primary: "#1D1D1F",
  secondary: "#424245",
  tertiary: "#595961",
  accent: "#B30E09"
});

export const mobileDarkPalette = Object.freeze({
  canvas: "#1C1C1E",
  grouped: "#2C2C2E",
  raised: "#3A3A3C",
  border: "#A1A1A6",
  primary: "#F5F5F7",
  secondary: "#D1D1D6",
  tertiary: "#BDBDC2",
  accent: "#FF6961"
});

export type MobilePalette = { readonly [K in keyof typeof mobileLightPalette]: string };
