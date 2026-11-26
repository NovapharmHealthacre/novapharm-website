import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (filepath) => readFileSync(path.join(root, filepath), "utf8");
const config = JSON.parse(read("native/novapharm-intelligence-mobile/app.json")).expo;
const pkg = JSON.parse(read("native/novapharm-intelligence-mobile/package.json"));
const app = read("native/novapharm-intelligence-mobile/App.tsx");
const form = read("native/novapharm-intelligence-mobile/MultimodalReviewScreen.tsx");
const maps = read("native/novapharm-intelligence-mobile/MapsResearchScreen.tsx");
const countryScreen = read("native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx");
const tokens = read("native/novapharm-intelligence-mobile/appearance.ts");

function paletteOf(name) {
  const escaped = name.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const match = tokens.match(new RegExp("export const " + escaped + " = Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);"));
  assert.ok(match, "Missing original theme: " + name);
  const entries = [...match[1].matchAll(/^\s*(\w+):\s*"(#[0-9A-Fa-f]{6})"/gm)];
  const result = Object.fromEntries(entries.map(([, key, color]) => [key, color]));
  assert.equal(entries.length, 8, "All eight semantic roles must be present for " + name);
  return result;
}
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((n) => Number.parseInt(n, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("Expo SDK 58 enables Android and iOS automatic system appearance with supported plugin", () => {
  assert.equal(config.userInterfaceStyle, "automatic");
  assert.ok(config.plugins.includes("expo-system-ui"));
  assert.equal(pkg.dependencies["expo-system-ui"], "~58.0.7");
  assert.equal(pkg.dependencies["react-native-safe-area-context"], "~5.11.1");
  assert.equal(pkg.private, true, "Native candidate must remain private");
  assert.equal(config.ios.bundleIdentifier, undefined, "Do not manufacture an App Store release");
  assert.equal(config.android.package, undefined, "Do not manufacture Play Store signing");
});

test("both original NovaPharm palettes preserve text and control contrast", () => {
  const light = paletteOf("mobileLightPalette");
  const dark = paletteOf("mobileDarkPalette");
  assert.equal(light.accent, "#E3120B", "Keep canonical corporate red in light appearance");
  assert.notEqual(light.accent, dark.accent, "Use a high-contrast red adaptation in dark mode");
  for (const [name, palette] of [["light", light], ["dark", dark]]) {
    for (const foreground of ["primary", "secondary", "tertiary", "accent"]) {
      assert.ok(contrast(palette[foreground], palette.canvas) >= 4.5,
        name + " " + foreground + " must achieve at least 4.5:1 against canvas");
    }
    for (const foreground of ["primary", "secondary", "tertiary"]) {
      assert.ok(contrast(palette[foreground], palette.grouped) >= 4.5,
        name + " " + foreground + " must achieve at least 4.5:1 against grouped content");
    }
    assert.ok(contrast(palette.border, palette.canvas) >= 3,
      name + " interactive boundaries need 3:1 on canvas");
    assert.ok(contrast(palette.canvas, palette.primary) >= 4.5,
      name + " inverse selected-tab contrast must be readable");
  }
});

test("full offline candidate follows system appearance without reintroducing fixed light-theme surfaces", () => {
  assert.match(app, /SafeAreaProvider/);
  assert.match(app, /SafeAreaView style=\{styles.root\} edges=\{\["top", "right", "bottom", "left"\]\}/);
  assert.match(app, /from "react-native-safe-area-context"/);
  assert.match(app, /useColorScheme\(\) === "dark"/);
  assert.match(app, /const styles = darkMode \? darkStyles : lightStyles/);
  assert.match(app, /const palette = darkMode \? mobileDarkPalette : mobileLightPalette/);
  assert.match(app, /ThemeContext.Provider value=\{\{ styles, palette \}\}/);
  assert.equal((app.match(/useContext\(ThemeContext\)/g) ?? []).length, 5);
  assert.match(app, /StatusBar barStyle=\{darkMode \? "light-content" : "dark-content"\}/);
  assert.match(app, /<MultimodalReviewScreen darkMode=\{darkMode\}/);
  assert.match(app, /fontSize: 17, minHeight: 48/, "Source search input must be readable");
  assert.match(app, /placeholderTextColor=\{palette.tertiary\}/);
  assert.doesNotMatch(app, /fetch\(|client_secret|access_token|AsyncStorage|SecureStore/);
});

test("research review renders in both appearances without forwarding sensitive records", () => {
  assert.match(form, /darkMode = false/);
  assert.match(form, /createReviewStyles\(darkMode \? mobileDarkPalette : mobileLightPalette\)/);
  assert.match(form, /createReviewStyles\(palette: MobilePalette\)/);
  assert.match(form, /backgroundColor:palette.canvas/);
  assert.match(form, /backgroundColor:palette.grouped/);
  assert.match(form, /color:palette.primary/);
  assert.match(form, /color:palette.secondary/);
  assert.match(form, /accessibilityLiveRegion="polite"/);
  assert.match(form, /Do not enter patient or confidential information/);
  assert.doesNotMatch(form, /fetch\(|client_secret|access_token|AsyncStorage|SecureStore/);
});

test("Maps research stays accessible after the light/dark appearance merge without becoming a live service", () => {
  assert.match(app, /import \{ MapsResearchScreen \} from "\.\/MapsResearchScreen"/);
  assert.match(app, /type Screen = .*"maps".*"account"/);
  assert.match(app, /selected === "research" \|\| selected === "inspect" \|\| selected === "maps" \|\| selected === "visual" \|\| selected === "countries" \|\| selected === "science" \|\| selected === "account"/);
  assert.match(app, /\{ screen: "visual", label: "Visual research", detail: "Disabled CLIP candidate: no model inference or approved image catalogue" \}/);
  assert.match(app, /\{ screen: "maps", label: "Maps and location", detail: "Offline source-reference coordinates; external maps only" \}/);
  assert.match(app, /screen === "maps" && <MapsResearchScreen darkMode=\{darkMode\} \/>/);
  assert.match(app, /useColorScheme\(\) === "dark"/);
  assert.doesNotMatch(app, /navigator\.geolocation|requestForegroundPermissions|expo-location/);
});

test("offline reference Maps follows system appearance without shipping an embedded map or patient location", () => {
  assert.match(maps, /darkMode = false/);
  assert.match(maps, /const palette = darkMode \? mobileDarkPalette : mobileLightPalette/);
  assert.match(maps, /useMemo\(\(\) => createStyles\(palette\), \[darkMode\]\)/);
  assert.match(maps, /backgroundColor: palette.primary/);
  assert.match(maps, /color: palette.secondary/);
  assert.match(maps, /borderColor: palette.border/);
  assert.equal((maps.match(/placeholderTextColor=\{palette.tertiary\}/g) ?? []).length, 3);
  assert.match(maps, /accessibilityLiveRegion="polite"/);
  assert.match(maps, /https:\/\/maps\.apple\.com\/\?ll=/);
  assert.doesNotMatch(maps, /fetch\(|requestForegroundPermissions|navigator\.geolocation|client_secret|access_token/);
});

test("Science offline research honours iOS/Android system light and dark appearance", () => {
  const science = read("native/novapharm-intelligence-mobile/ScienceResearchMobile.tsx");
  assert.match(app, /screen === "science" && <ScienceResearchMobile/);
  assert.match(science, /useColorScheme\(\) === "dark" \? darkStyles : lightStyles/);
  assert.match(science, /createStyles\(mobileLightPalette\)/);
  assert.match(science, /createStyles\(mobileDarkPalette\)/);
  assert.match(science, /color: color\.ink/);
  assert.match(science, /color: color\.secondary/);
  assert.doesNotMatch(science, /fetch\(|client_secret|access_token|AsyncStorage|SecureStore/);
});


test("101-country iOS/Android directory tracks system light and dark appearance", () => {
  assert.match(app, /<CountryDirectoryScreen\s*\/>/);
  assert.match(countryScreen, /useColorScheme\(\) === "dark"/);
  assert.match(countryScreen, /darkMode \? mobileDarkPalette : mobileLightPalette/);
  assert.match(countryScreen, /useMemo\(\(\) => createStyles\(palette\), \[darkMode\]\)/);
  assert.match(countryScreen, /function createStyles\(palette: MobilePalette\)/);
  assert.match(countryScreen, /<CountryCard country=\{item\} wide=\{twoColumns\} styles=\{styles\} \/>/);
  assert.match(countryScreen, /placeholderTextColor=\{palette\.tertiary\}/);
  assert.match(countryScreen, /selectedText: \{ color: palette\.canvas \}/);
  assert.match(countryScreen, /actionText: \{[^}]*color: palette\.accent/);
  assert.match(tokens, /mobileLightPalette/);
  assert.match(tokens, /mobileDarkPalette/);
});

test("country cards use shared semantic colours with no light-only surfaces or network activation", () => {
  for (const role of ["canvas", "grouped", "border", "primary", "secondary", "tertiary", "accent"]) {
    assert.ok(countryScreen.includes("palette." + role), "Missing shared role " + role);
  }
  assert.doesNotMatch(countryScreen, /#[A-Fa-f0-9]{6}\b/, "Do not hardcode light-only country colours");
  assert.doesNotMatch(countryScreen, /\bfetch\s*\(|XMLHttpRequest|SecureStore|AsyncStorage|access_token|client_secret|Authorization:/i);
  assert.match(countryScreen, /country-101-client-catalog-20261118\.json/);
  assert.match(countryScreen, /No live medicine records/);
  assert.match(countryScreen, /accessibilityLiveRegion="polite"/);
  assert.match(countryScreen, /keyExtractor=\{\(country\) => country\.iso2\}/);
});


test("large accessibility text reflows the 101-country list into one column without clipping filter labels", () => {
  assert.match(countryScreen, /const \{ width, fontScale \} = useWindowDimensions\(\)/);
  assert.match(countryScreen, /const largeText = fontScale >= 1\.4/);
  assert.match(countryScreen, /const twoColumns = width >= 760 && !largeText/);
  assert.match(countryScreen, /key=\{twoColumns \? "country-wide" : "country-narrow"\}/);
  assert.match(countryScreen, /numColumns=\{twoColumns \? 2 : 1\}/);
  assert.match(countryScreen, /filters: \{ flexDirection: "row", flexWrap: "wrap"/);
  assert.match(countryScreen, /filter: \{ flexGrow: 1, minWidth: 92/);
  assert.match(countryScreen, /minHeight: 48, borderRadius: 9/);
  assert.match(countryScreen, /search: \{[^}]*fontSize: 17/);
  assert.match(countryScreen, /accessibilityLiveRegion="polite"/);
  assert.doesNotMatch(countryScreen, /\bfetch\s*\(|XMLHttpRequest|access_token|client_secret/i);
});


test("iOS and Android maps hand-off transmits coordinates, never an optional local reference label", () => {
  assert.match(maps, /Platform\.OS === "android"/);
  assert.match(maps, /buildAndroidMapUrl\(lat, lon\)/);
  assert.match(maps, /https:\/\/maps\.apple\.com\/\?ll=/);
  assert.doesNotMatch(maps, /&q=\$\{encodeURIComponent\(safeLabel\)\}/);
  assert.doesNotMatch(maps, /[&?]q=\$\{encodeURIComponent\(safeLabel\)\}/);
  assert.match(maps, /optional reference label stays local and is not included in the link/);
  assert.match(maps, /const safeLabel = label\.trim\(\)\.slice\(0, 80\) \|\| "Reference location"/);
  assert.match(maps, /setStatus\("Opened " \+ safeLabel \+/);
  assert.doesNotMatch(maps, /fetch\(|navigator\.geolocation|expo-location|AsyncStorage|SecureStore|client_secret/);
});
