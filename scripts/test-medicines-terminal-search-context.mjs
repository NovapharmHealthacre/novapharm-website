import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Static release regression for the protected React boundary. End-to-end
// acceptance still requires a real authorised user and accepted evidence.
const component = readFileSync(
  new URL("../apps/portal/components/medicines-intelligence.tsx", import.meta.url),
  "utf8",
);
const between = (start, end) => {
  const a = component.indexOf(start);
  const b = component.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Expected source boundaries: ${start} -> ${end}`);
  return component.slice(a, b);
};

test("a new valid medicine search clears prior medicine, analytics and deep-link identity before the request", () => {
  const source = between("async function searchMedicine(", "async function selectMedicine(");
  const queryValidation = source.indexOf("if (query.length < 2)");
  const invalidate = source.indexOf("selectionGenerationRef.current += 1;");
  const clearMedicine = source.indexOf("setDetail(null);");
  const clearAnalytics = source.indexOf("setAnalytics(null);");
  const clearStatus = source.indexOf("setAnalyticsStatus(\"Previous medicine context cleared");
  const clearDeepLink = source.indexOf('nextUrl.searchParams.delete("medicineId")');
  const networkRequest = source.indexOf("await gatewayJson<SearchResponse>");
  assert.ok(queryValidation >= 0 && queryValidation < invalidate);
  for (const index of [clearMedicine, clearAnalytics, clearStatus, clearDeepLink]) {
    assert.ok(index > invalidate && index < networkRequest, "Previous-medicine content must clear before remote search");
  }
  assert.ok(source.includes('window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);'));
  assert.match(source, /setSearchStatus\(professionalError\(error\)\)/u);
  assert.match(source, /next\.results\.length \?/u);
});

test("superseded deep-link restoration cannot restore stale identity or analytics", () => {
  const source = between("// Restore an authorised medicine selection", "function changeFilter(");
  assert.match(source, /const generation = selectionGenerationRef\.current/u);
  assert.match(source, /if \(!active \|\| generation !== selectionGenerationRef\.current\) return;/u);
  assert.match(source, /if \(active && generation === selectionGenerationRef\.current\)/u);
  assert.match(source, /if \(active && generation === selectionGenerationRef\.current\) setBusy\(false\)/u);
});

test("selection cannot populate analytics after a subsequent search supersedes it", () => {
  const source = between("async function selectMedicine(", "async function runAnalytics(");
  assert.match(source, /selectionGenerationRef\.current \+= 1/u);
  assert.match(source, /if \(generation !== selectionGenerationRef\.current\) return;/u);
  assert.match(source, /if \(generation === selectionGenerationRef\.current\) setBusy\(false\)/u);
});

test("in-flight analytical responses cannot refill facts after a subsequent medicine search", () => {
  const source = between("async function runAnalytics(", "let central: ReactNode;");
  assert.match(source, /const generation = selectionGenerationRef\.current/u);
  assert.match(source, /if \(generation !== selectionGenerationRef\.current\) return;/u);
  assert.match(source, /if \(generation === selectionGenerationRef\.current\) setBusy\(false\)/u);
});
