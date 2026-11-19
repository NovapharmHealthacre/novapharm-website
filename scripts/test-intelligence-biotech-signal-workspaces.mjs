import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const app = read("apps/portal/components/medicines-intelligence.tsx");
const trials = read("apps/portal/components/clinical-trials-discovery.tsx");
const professional = read("apps/portal/components/professional-workspaces.tsx");
const catalogue = read("apps/portal/data/intelligence-workspaces.ts");
const readiness = read("src/core/intelligence-22-workspace-readiness.mjs");

test("biotech has a real, protected official trial-registry discovery view instead of an unavailable-only placeholder", () => {
  assert.match(app, /current === "biotech-intelligence"\) central = <ClinicalTrialsDiscovery context="biotech" \/>/u);
  assert.match(trials, /context\?: "evidence" \| "biotech"/u);
  assert.match(trials, /Biotech Intelligence \/ Public trial registry/u);
  assert.match(trials, /v1\/intelligence\/evidence\/us\/clinical-trials\?intervention=/u);
  assert.match(trials, /clinicaltrials\.gov\/data-api\/api/u);
  assert.match(trials, /complete biotech asset pipeline/u);
  assert.match(trials, /productionReuseRightsCertified: false/u);
  assert.match(trials, /Do not enter patient information/u);
});

test("signals has a distinct source-dependent read-only threshold research view", () => {
  assert.match(app, /current === "signals"\) central = <ProfessionalWorkspace kind="signals"/u);
  assert.match(professional, /\| "signals"/u);
  assert.match(professional, /signals: \{\s*title: "Signals"/u);
  assert.match(professional, /kind === "alerts" \|\| kind === "signals"/u);
  assert.match(professional, /observedChange\?\.state === "observed_change_candidate_requires_review"/u);
  assert.match(professional, /Comparable accepted observations are required/u);
  assert.match(professional, /There is no customer watchlist, saved rule or notification delivery/u);
  assert.match(professional, /No shortage, pricing movement or supply interruption is inferred/u);
});

test("adding research functionality must not silently release either of these gated modules", () => {
  for (const slug of ["biotech-intelligence", "signals"]) {
    assert.match(catalogue, new RegExp('slug: "' + slug + '".*state: "gated"'));
  }
  assert.match(professional, /Not approved for customer release/u);
  assert.match(readiness, /independentRuntimeAcceptanceVerified: false/u);
  assert.match(readiness, /customerAccessible: false/u);
  assert.match(readiness, /productionLive: false/u);
});

test("core medicine and original evidence views remain routed separately", () => {
  assert.match(app, /current === "medicine-search" \|\| current === "medicine-overview" \|\| current === "identity"/u);
  assert.match(app, /current === "evidence"\) central = <ClinicalTrialsDiscovery \/>/u);
  assert.match(app, /current === "observed-market"\) central = /u);
});
