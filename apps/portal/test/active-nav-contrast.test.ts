import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(new URL("../app/apple-pharma-portal.css", import.meta.url), "utf8");
const universal = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function rule(selector: string): string {
  // Select only complete rule blocks, not commented examples.
  const start = stylesheet.indexOf(selector + " {");
  assert.ok(start >= 0, "Missing specific active navigation selector: " + selector);
  const open = stylesheet.indexOf("{", start);
  const close = stylesheet.indexOf("}", open + 1);
  assert.ok(close > open, "Malformed CSS active navigation rule");
  return stylesheet.slice(open + 1, close);
}

function declaration(body: string, property: string): string {
  const expression = new RegExp("(?:^|;)\\s*" + property + "\\s*:\\s*([^;]+)", "i");
  const found = body.match(expression);
  assert.ok(found, "Missing explicit " + property + " declaration");
  return found[1].trim().toUpperCase();
}

function luminance(hex: string): number {
  assert.match(hex, /^#[0-9A-F]{6}$/, "WCAG contrast test requires real hex colours, not inherited tokens");
  const channel = (c: number): number => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return [0.2126, 0.7152, 0.0722].reduce(
    (sum, weight, i) => sum + weight * channel(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)), 0);
}

function contrast(left: string, right: string): number {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("active customer and employee Portal nav pairs explicit surface and text colours", () => {
  const active = rule(".workspace-sidebar nav a.active");
  const status = rule(".workspace-sidebar nav a.active > small");
  const background = declaration(active, "background-color");
  const title = declaration(active, "color");
  const detail = declaration(status, "color");
  assert.equal(background, "#F8EDF0");
  assert.equal(title, "#0B0B0E");
  assert.equal(detail, "#0B0B0E");
  assert.ok(contrast(title, background) >= 4.5, "Active navigation titles must be WCAG AA readable");
  assert.ok(contrast(detail, background) >= 4.5, "Active navigation small status labels must be WCAG AA readable");
});

test("Portal active style outranks the historical dark navigation selector without important overrides", () => {
  assert.match(universal, /\.workspace-sidebar a\.active\s*\{/);
  const active = rule(".workspace-sidebar nav a.active");
  assert.doesNotMatch(active, /!important/i);
  // The added nav element gives this selector higher specificity than the shared dark rule.
  assert.match(stylesheet, /\.workspace-sidebar nav a\.active\s*\{/);
  assert.match(rule(".workspace-sidebar nav a.active > small"), /font-weight:\s*600/);
});

test("unselected navigation and secure route disclosure are not modified by active state", () => {
  assert.match(stylesheet, /\.workspace-sidebar a small\s*\{\s*color:\s*var\(--portal-muted\);\s*\}/);
  assert.match(universal, /\.workspace-sidebar a\.active/);
  assert.doesNotMatch(rule(".workspace-sidebar nav a.active"), /position|display|visibility|pointer-events|opacity/i);
});
