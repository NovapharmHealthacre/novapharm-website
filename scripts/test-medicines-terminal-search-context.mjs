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
  assert.match(source, /next\.pagination\.totalRows\s*\?/u);
});

test("an empty medicine identity catalogue cannot masquerade as a genuine no-match", () => {
  const search = between("async function searchMedicine(", "async function searchMedicinePage(");
  assert.match(search, /next\.catalogueState === "no_current_repository_identities"/u);
  assert.match(search, /No current medicine identities are loaded/u);
  assert.match(component, /searchResponse\.catalogueState === "no_current_repository_identities"/u);
  assert.match(component, /Results remain unavailable until source approval and ingestion/u);
});

test("late medicine search responses cannot overwrite the newer selected query", () => {
  const source = between("async function searchMedicine(", "async function selectMedicine(");
  const capture = source.indexOf("const generation = selectionGenerationRef.current;");
  const networkRequest = source.indexOf("await gatewayJson<SearchResponse>");
  const guard = source.indexOf("if (generation !== selectionGenerationRef.current) return;");
  const display = source.indexOf("setSearchResponse(next);");
  assert.ok(capture >= 0 && capture < networkRequest);
  assert.ok(guard > networkRequest && guard < display);
  assert.match(source, /if \(generation === selectionGenerationRef\.current\) setSearchStatus\(professionalError\(error\)\)/u);
  assert.match(source, /if \(generation === selectionGenerationRef\.current\) setBusy\(false\)/u);
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

test("selecting a second medicine clears the previous evidence and stale deep-link before network I/O", () => {
  const source = between("async function selectMedicine(", "async function runAnalytics(");
  const invalidate = source.indexOf("selectionGenerationRef.current += 1;");
  const clearMedicine = source.indexOf("setDetail(null);");
  const clearAnalytics = source.indexOf("setAnalytics(null);");
  const clearStatus = source.indexOf('setAnalyticsStatus("Previous medicine evidence cleared');
  const clearDeepLink = source.indexOf('pendingUrl.searchParams.delete("medicineId");');
  const request = source.indexOf("await gatewayJson<MedicineDetail>");
  assert.ok(invalidate >= 0 && request > invalidate);
  for (const index of [clearMedicine, clearAnalytics, clearStatus, clearDeepLink]) {
    assert.ok(index > invalidate && index < request, "Old medicine content must not survive selection loading");
  }
  assert.ok(source.includes('window.history.replaceState(null, "", `${pendingUrl.pathname}${pendingUrl.search}${pendingUrl.hash}`);'));
});

test("in-flight analytical responses cannot refill facts after a subsequent medicine search", () => {
  const source = between("async function runAnalytics(", "let central: ReactNode;");
  assert.match(source, /const generation = selectionGenerationRef\.current/u);
  assert.match(source, /if \(generation !== selectionGenerationRef\.current\) return;/u);
  assert.match(source, /if \(generation === selectionGenerationRef\.current\) setBusy\(false\)/u);
});

test("search pagination is server-backed and fenced against stale response updates", () => {
  const source = between("async function searchMedicinePage(", "async function selectMedicine(");
  assert.match(source, /selectionGenerationRef\.current \+= 1/u);
  assert.match(source, /page < 1 \|\| page > current\.pagination\.totalPages/u);
  assert.match(source, /enterprise\/medicines\/search\?q=/u);
  assert.match(source, /&page=\$\{page\}/u);
  const request = source.indexOf("await gatewayJson<SearchResponse>");
  const guard = source.indexOf("if (generation !== selectionGenerationRef.current) return;");
  const update = source.indexOf("setSearchResponse(next);");
  assert.ok(request >= 0 && guard > request && update > guard);
  assert.match(component, /aria-label="Medicine search result pages"/u);
  assert.match(component, /searchResponse\.pagination\.totalPages > 1/u);
});
