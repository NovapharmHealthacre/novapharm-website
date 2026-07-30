export const wcagTarget = "WCAG 2.2 AA" as const;

export const acceptanceViewports = Object.freeze([
  Object.freeze({ name: "desktop-standard", width: 1440, height: 900 }),
  Object.freeze({ name: "desktop-wide", width: 1920, height: 1080 }),
  Object.freeze({ name: "tablet-portrait-large", width: 1024, height: 1366 }),
  Object.freeze({ name: "tablet-portrait", width: 768, height: 1024 }),
  Object.freeze({ name: "mobile-medium", width: 390, height: 844 }),
  Object.freeze({ name: "mobile-large", width: 430, height: 932 }),
  Object.freeze({ name: "mobile-compact", width: 375, height: 667 })
]);

export const requiredManualChecks = Object.freeze([
  "keyboard-navigation",
  "visible-focus",
  "heading-order",
  "zoom-and-reflow",
  "screen-reader-status",
  "dialog-focus-management",
  "no-keyboard-traps",
  "reduced-motion",
  "table-semantics",
  "error-summary-and-field-association"
] as const);

export function viewportKey(width: number, height: number): string {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error("Viewport dimensions must be positive integers.");
  return `${width}x${height}`;
}
