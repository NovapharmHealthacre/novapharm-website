import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (name: string) => readFileSync(join(process.cwd(), "components", name), "utf8");

test("portal search remains authenticated, scoped, progressive and free of query-history persistence", () => {
  const view = source("dashboard.tsx");
  assert.match(view, /type="search" minLength=\{2\} maxLength=\{120\}/);
  assert.match(view, /aria-label="Clear authorised record search"/);
  assert.match(view, /aria-describedby=\{searchScopeId\}/);
  assert.match(view, /role="status" aria-live="polite"/);
  assert.match(view, /aria-keyshortcuts="Meta\+K Control\+K"/);
  assert.match(view, /window\.setTimeout\(\(\) => \{ void runSearch\(query\); \}, 450\)/);
  assert.match(view, /generation !== searchGeneration\.current/);
  assert.match(view, /enterprise\/search\?q=/);
  assert.doesNotMatch(view, /localStorage|sessionStorage|indexedDB/);
});

test("clinical and FDA research only query approved public source endpoints on explicit submit", () => {
  for (const file of ["clinical-trials-discovery.tsx", "us-fda-label-discovery.tsx"]) {
    const view = source(file);
    assert.match(view, /const generation = \+\+searchGeneration\.current/);
    assert.match(view, /generation !== searchGeneration\.current/);
    assert.match(view, /aria-describedby=\{searchScopeId\}/);
    assert.match(view, /enterKeyHint="search"/);
    assert.match(view, /className=\{styles\.clear\} type="button" onClick=\{clearSearch\}/);
    assert.doesNotMatch(view, /localStorage|sessionStorage|indexedDB/);
  }
});

test("tender lookup stays scoped, clearable and bounded by the original official source", () => {
  const view = source("professional-workspaces.tsx");
  assert.match(view, /Clear tender search/);
  assert.match(view, /generation !== generationRef\.current/);
  assert.match(view, /a bounded public sample of recent UK Find a Tender releases/);
  assert.match(view, /v1\/intelligence\/tenders\/uk\/discovery\?q=/);
});

test("recorded WMS sample search can be cleared but never claims live warehouse authority", () => {
  const view = source("wms-recorded-evidence-studio.tsx");
  assert.match(view, /Clear recorded exceptions search/);
  assert.match(view, /Search scope: authorised recorded exceptions/);
  assert.match(view, /aria-controls="distribution-wms-exception-list"/);
  assert.match(view, /No matching recorded exceptions in this bounded sample/);
  assert.match(view, /not live 3PL incidents/);
});
