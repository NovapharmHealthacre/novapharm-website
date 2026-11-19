import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (name) => readFileSync(path.join(root, name), "utf8");
const screen = read("native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx");
const palette = read("native/novapharm-intelligence-mobile/appearance.ts");
const app = read("native/novapharm-intelligence-mobile/App.tsx");

test("101-country iOS/Android directory tracks system light and dark appearance", () => {
  assert.match(app, /<CountryDirectoryScreen\s*\/>/);
  assert.match(screen, /useColorScheme\(\) === "dark"/);
  assert.match(screen, /darkMode \? mobileDarkPalette : mobileLightPalette/);
  assert.match(screen, /useMemo\(\(\) => createStyles\(palette\), \[darkMode\]\)/);
  assert.match(screen, /function createStyles\(palette: MobilePalette\)/);
  assert.match(screen, /<CountryCard country=\{item\} wide=\{twoColumns\} styles=\{styles\} \/>/);
  assert.match(screen, /placeholderTextColor=\{palette\.tertiary\}/);
  assert.match(screen, /selectedText: \{ color: palette\.canvas \}/);
  assert.match(screen, /actionText: \{[^}]*color: palette\.accent/);
  assert.match(palette, /mobileLightPalette/);
  assert.match(palette, /mobileDarkPalette/);
});

test("country cards use shared semantic colours with no light-only surfaces or network activation", () => {
  for (const role of ["canvas", "grouped", "border", "primary", "secondary", "tertiary", "accent"]) {
    assert.ok(screen.includes("palette." + role), "Missing shared role " + role);
  }
  assert.doesNotMatch(screen, /#[A-Fa-f0-9]{6}\b/, "Do not hardcode light-only country colours");
  assert.doesNotMatch(screen, /\bfetch\s*\(|XMLHttpRequest|SecureStore|AsyncStorage|access_token|client_secret|Authorization:/i);
  assert.match(screen, /country-101-client-catalog-20261118\.json/);
  assert.match(screen, /No live medicine records/);
  assert.match(screen, /accessibilityLiveRegion="polite"/);
  assert.match(screen, /keyExtractor=\{\(country\) => country\.iso2\}/);
});
