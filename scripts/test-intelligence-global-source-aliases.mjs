import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveGlobalSourceAlias, globalSourceAliases } from "../src/core/intelligence-global-source-aliases.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (p) => readFileSync(path.join(root, p), "utf8");
const register = JSON.parse(source("docs/intelligence/global-pharma-sources-20261117.json"));

test("global UK alias reuses NHSBSA existing private source and SNOMED dataset slug", () => {
  assert.equal(globalSourceAliases.length, 1);
  assert.match(source("scripts/data/discover-medicines-sources.ts"), /nhsbsa\.epd/);
  assert.match(source("docs/intelligence/NHSBSA_EPD_OFFICIAL_API_PRIVATE_PROBE_20261114.md"), /NPI_NHSBSA_PRIVATE_API_PROBE_ENABLED/);
  const bridge = resolveGlobalSourceAlias(globalSourceAliases[0].candidateKey, register.sources);
  assert.equal(bridge.existingSourceId, "nhsbsa.epd");
  assert.equal(bridge.jurisdiction, "GB-ENG");
  assert.equal(bridge.exactDatasetSlug, "english-prescribing-dataset-epd-with-snomed-code");
  assert.equal(bridge.discoveryOnly, true);
  assert.equal(bridge.customerVisible, false);
  assert.equal(bridge.privateProbeEnabled, false);
  assert.equal(bridge.productionDataAdmitted, false);
});

test("mismatched or prematurely promoted global source cannot bypass existing private gates", () => {
  const key = globalSourceAliases[0].candidateKey;
  assert.equal(resolveGlobalSourceAlias("not-a-source", register.sources), null);
  assert.throws(() => resolveGlobalSourceAlias(key, null), /Invalid/);
  const modified = register.sources.map((entry) => entry.candidateKey === key ? { ...entry, rightsStatus: "approved" } : entry);
  assert.throws(() => resolveGlobalSourceAlias(key, modified), /may not be activated/);
  const retired = register.sources.map((entry) => entry.candidateKey === key ? { ...entry, url: "https://opendata.nhsbsa.net/dataset/english-prescribing-data-epd" } : entry);
  assert.throws(() => resolveGlobalSourceAlias(key, retired), /may not be activated/);
});
