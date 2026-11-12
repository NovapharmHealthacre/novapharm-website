import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { founderWorkspaceCategories, founderWorkspaceCoverageValid, founderWorkspaceSlugs } from "../data/founder-workspace-categories";
import { intelligenceWorkspaceCatalogue } from "../data/intelligence-workspaces";

test("approved founder experience contains exactly five categories and all 22 unique workspaces", () => {
  assert.equal(founderWorkspaceCoverageValid, true);
  assert.deepEqual(founderWorkspaceCategories.map(category => category.slugs.length), [6,5,4,3,4]);
  assert.equal(founderWorkspaceSlugs.length, intelligenceWorkspaceCatalogue.length);
  assert.equal(new Set(founderWorkspaceSlugs).size, 22);
});

test("founder experience remains session-verified and read-only", () => {
  const page = readFileSync("app/founder/page.tsx","utf8");
  assert.match(page,/if \(!\(await privateFounderSession\(\)\)\) redirect\("\/auth\/customer\/start"\)/u);
  assert.match(page,/result\["scope"\] === "founder-shell-read-only"/u);
  assert.match(page,/result\["customerAccess"\] === false/u);
  assert.match(page,/result\["medicinesDataAccess"\] === false/u);
  assert.match(page,/founderWorkspaceCoverageValid/u);
  assert.match(page,/Acceptance pending/u);
  assert.equal((page.match(/\\bunoptimized\\b/gu) ?? []).length, 2, "Photos must use direct allowed assets rather than the unexposed Next image optimizer");
  assert.doesNotMatch(page,/localStorage|sessionStorage|mock-user/u);
});

test("founder photos are bundled locally rather than loaded from third-party trackers", () => {
  const sync = readFileSync("scripts/sync-public-assets.mjs","utf8");
  for (const name of ["hero-editorial.avif","medicine.jpg","market.jpg","supply.jpg","biotech.jpg","decisions.jpg"]) {
    assert.match(sync,new RegExp(name.replace(".","\\.")));
  }
  for (const category of founderWorkspaceCategories) {
    assert.match(category.image,/^\/assets\/media\/founder\/[a-z-]+\.jpg$/u);
  }
});
