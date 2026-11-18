import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const read=p=>readFileSync(path.join(root,p),"utf8");

test("Expo iOS and Android preview uses canonical sparse-circuit research governance",()=>{
  const app=read("native/novapharm-intelligence-mobile/App.tsx");
  const catalogue=read("apps/portal/data/nova-ml-modules.ts");
  assert.match(app,/novaMlSparseCircuitAssurance/);
  assert.match(app,/type Screen =[^;]*"research"/);
  assert.match(app,/type Screen =[^;]*"review"/);
  assert.match(app,/screen: "review", label: "Evidence review"/);
  assert.match(app,/<MultimodalReviewScreen/);
  assert.match(app,/screen: "research", label: "Nova ML research"/);
  assert.match(app,/screen === "more"/);
  assert.match(app,/onPress=\{\(\) => changeScreen\(item.screen\)\}/);
  assert.match(app,/screen === "research"/);
  assert.match(app,/offlineExperiment\.limitation/);
  assert.match(app,/methodGates\.map/);
  assert.match(catalogue,/contract: "npi\.sparse-circuit\.v1"/);
  assert.match(catalogue,/mechanistic|research|calibration/i);
});

test("mobile sparse-circuit candidate is static, nonclinical, unconnected and unprivileged",()=>{
  const app=read("native/novapharm-intelligence-mobile/App.tsx");
  const readme=read("native/novapharm-intelligence-mobile/README.md");
  assert.match(app,/No live model inference, clinical decision or production activation/);
  assert.match(app,/No model weights, pharmaceutical data, patient imagery, external requests/);
  assert.match(readme,/It \*\*does not\*\* load a trained model/);
  assert.match(readme,/not a shipped mobile feature/);
  assert.doesNotMatch(app,/\bfetch\s*\(|XMLHttpRequest|AsyncStorage|SecureStore|WebView|useEffect\s*\(|MLModel\.prediction|model\.predict/);
});

test("release remains separately denied in the canonical governance source",()=>{
  const assurance=read("apps/portal/data/nova-ml-modules.ts");
  const owner=JSON.parse(read("config/intelligence/owner-production-constraints.json"));
  assert.match(assurance,/no model experiment connected/i);
  assert.match(assurance,/no model access|Open weights and activations are required/i);
  assert.match(assurance,/Human authority/);
  assert.equal(owner.productionSignoff,"not_granted");
  assert.equal(owner.productionPermissions.activatePublicCustomerAccess,false);
  assert.equal(owner.initialInfrastructureBudget.monthlyCapGbp,0);
});
