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
  const kotlinReader = read("native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitReader.kt");
  const kotlinView = read("native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaSparseCircuitResearchScreen.kt");

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
  assert.match(plan, /source rights/i);
  assert.match(plan, /not deployed/i);
});

test("registered AI providers never claim sparse circuit access or causal verification", async () => {
  const { internalModelRegister } = await import("../src/core/ai/model-registry.mjs");
  const { PUBLIC_SEMANTIC_MODEL } = await import("../src/ai/model-registry.mjs");
  assert.equal(internalModelRegister.length >= 3, true);
  for (const model of internalModelRegister) {
    assert.equal(model.mechanisticCircuitVerified, false);
    assert.notEqual(model.mechanisticCircuitAccess, "verified");
  }
  assert.equal(PUBLIC_SEMANTIC_MODEL.sparseCircuitsApplicable, false);
  assert.equal(PUBLIC_SEMANTIC_MODEL.mechanisticCircuitVerified, false);
});

test("Android pilot compiles only an offline, read-only application shell by design", () => {
  const manifest = read("native/novapharm-intelligence-android/app/src/main/AndroidManifest.xml");
  const activity = read("native/novapharm-intelligence-android/app/src/main/java/com/novapharm/intelligence/research/NovaResearchActivity.kt");
  const gradle = read("native/novapharm-intelligence-android/app/build.gradle.kts");
  assert.doesNotMatch(manifest, /<uses-permission/);
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.match(activity, /summary = null/);
  assert.doesNotMatch(activity, /HttpURLConnection|OkHttpClient|WebView|token|apiKey/);
  assert.match(gradle, /minSdk = 26/);
  assert.match(gradle, /targetSdk = 35/);
});
