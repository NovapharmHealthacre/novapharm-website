import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("sparse-circuit assurance is exposed only through the existing protected Nova ML route family", () => {
  const app = read("apps/portal/components/nova-ml-workspaces.tsx");
  const data = read("apps/portal/data/nova-ml-modules.ts");
  const router = read("apps/portal/data/routes.ts");
  const protectedPage = read("apps/portal/app/[[...slug]]/page.tsx");
  const original = read("apps/portal/data/intelligence-workspaces.ts");

  assert.match(data, /novaMlSparseCircuitAssurance/);
  assert.match(data, /npi\.sparse-circuit\.v1/);
  assert.match(data, /Open weights and activations are required/);
  assert.match(data, /rights-admitted source records/);
  assert.match(app, /aria-labelledby="nova-ml-sparse-circuits"/);
  assert.match(data, /no model experiment connected/i);
  assert.match(app, /No inspected model/);
  assert.match(app, /causal proof/);
  assert.match(app, /methodGates\.map/);
  assert.doesNotMatch(app, /\bfetch\(|localStorage|sessionStorage|indexedDB|model\.predict/);
  assert.match(router, /novaMlPrefix/);
  assert.match(protectedPage, /verifiedPortalSession/);
  assert.match(protectedPage, /sessionDecision\(view, session\)/);
  assert.equal([...original.matchAll(/slug: "/g)].length, 22);
  assert.equal([...data.matchAll(/slug: "nova-/g)].length, 4);
});

test("iOS and Android screens do not claim verification or run network/model inference", () => {
  const swiftReader = read("native/novapharm-intelligence-apple/NovaSparseCircuitReader.swift");
  const swiftView = read("native/novapharm-intelligence-apple/NovaSparseCircuitResearchView.swift");
  const swiftPackage = read("native/novapharm-intelligence-apple/Package.swift");
  const kotlinReader = read("native/novapharm-intelligence-android/NovaSparseCircuitReader.kt");
  const kotlinView = read("native/novapharm-intelligence-android/NovaSparseCircuitResearchScreen.kt");

  for(const [reader,view] of [[swiftReader,swiftView],[kotlinReader,kotlinView]]) {
    assert.match(reader, /npi\.sparse-circuit\.v1/);
    assert.match(reader, /research-candidate/);
    assert.match(reader, /productionEligible/);
    assert.match(reader, /clinicalUsePermitted/);
    assert.match(reader, /mechanisticExplanationVerified/);
    assert.match(view, /Sparse-circuit research/);
    assert.match(view, /No independently verified circuit experiment is connected/);
    assert.doesNotMatch(reader + view, /URLSession|HttpURLConnection|OkHttpClient|Retrofit|MLModel\.prediction|ModelInference/);
  }

  assert.match(swiftPackage, /NovaSparseCircuitReader\.swift/);
  assert.match(swiftPackage, /NovaSparseCircuitResearchView\.swift/);
  assert.match(swiftReader, /Set\(raw\.keys\) == expectedKeys/);
  assert.match(kotlinReader, /supplied == expectedKeys/);
});

test("real customer and clinical release must remain explicitly excluded", () => {
  const plan = read("docs/intelligence/SPARSE_CIRCUIT_RESEARCH_INTEGRATION_20261118.md");
  const implementation = read("src/core/intelligence-sparse-circuit-assurance.mjs");
  for (const phrase of ["productionEligible: false","clinicalUsePermitted: false","mechanisticExplanationVerified: false"]) {
    assert.match(implementation, new RegExp(phrase));
  }
  assert.match(plan, /Production gates/);
  assert.match(plan, /source rights/);
  assert.match(plan, /not deployed/i);
});
