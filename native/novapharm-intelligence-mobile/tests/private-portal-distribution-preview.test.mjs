import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const preview = readFileSync(path.join(root,
  "native/novapharm-intelligence-mobile/PrivateOperationsPreviewScreen.tsx"), "utf8");
const app = readFileSync(path.join(root,
  "native/novapharm-intelligence-mobile/App.tsx"), "utf8");

function moduleIds(area) {
  const start = preview.indexOf('"' + area + '": Object.freeze([');
  assert.ok(start >= 0, "Missing " + area + " module grouping");
  const end = preview.indexOf("])", start);
  assert.ok(end > start, "Unclosed " + area + " grouping");
  return [...preview.slice(start, end).matchAll(/\{\s*id:\s*"([^"]+)"/g)]
    .map(match => match[1]);
}

test("customer portal preview has the agreed ten named private modules", () => {
  assert.deepEqual(moduleIds("customer-portal"),
    ["dashboard", "account", "products", "prices", "orders", "invoices",
      "statements", "delivery", "documents", "support"]);
});

test("distribution preview includes traceability and controlled warehouse journeys", () => {
  assert.deepEqual(moduleIds("distribution"),
    ["inventory", "batches", "quality", "replenishment", "pick",
      "dispatch", "delivery", "returns", "performance"]);
});

test("More navigation reaches each distinct private preview and retains gated scope", () => {
  assert.match(app, /import \{ PrivateOperationsPreviewScreen \} from "\.\/PrivateOperationsPreviewScreen";/);
  for (const [route,area] of [
    ["customer-portal-preview", "customer-portal"],
    ["distribution-preview", "distribution"]
  ]) {
    assert.ok(app.includes('screen: "' + route + '"'));
    assert.ok(app.includes('screen === "' + route + '" && <PrivateOperationsPreviewScreen area="' + area + '"'));
  }
  assert.match(preview, /Not connected · Not authorized · Not production verified/);
  assert.match(preview, /accessibilityRole="button"/);
  assert.match(preview, /accessibilityLiveRegion="polite"/);
  assert.match(preview, /minHeight: 48/);
  assert.match(preview, /minHeight: 50/);
});

test("private previews cannot access accounts, stock or transaction services", () => {
  assert.doesNotMatch(preview, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bLinking\b/);
  assert.doesNotMatch(preview, /\bAsyncStorage\b|\bSecureStore\b|\bFileSystem\b/);
  assert.doesNotMatch(preview, /\bAuthorization\b|\bclient_secret\b|\baccess_token\b/);
  assert.doesNotMatch(preview, /\bpayment\.confirm\b|\bpurchase\s*\(/);
  assert.match(preview, /no live access/);
  assert.match(preview, /owner authorization/);
});
