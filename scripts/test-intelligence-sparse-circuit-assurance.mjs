import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  CIRCUIT_ARTIFACT_VERSION,
  inspectSparseCircuitCandidate
} from "../src/core/intelligence-sparse-circuit-assurance.mjs";

const digest = "a".repeat(64);
function candidate() {
  return {
    schemaVersion: CIRCUIT_ARTIFACT_VERSION,
    model: {identifier:"demo-sparse-model",revision:"v1",weightsSha256:digest,access:"weights-and-activations"},
    task: {identifier:"quote-classification",datasetSha256:digest},
    circuit: {
      nodes: [{id:"n1",kind:"mlp-neuron"},{id:"n2",kind:"residual-write"}],
      edges: [{from:"n1",to:"n2",weight:0.2}]
    },
    evaluation: {
      baselineLoss:0.12,circuitLoss:0.13,ablatedLoss:0.69,
      sampleCount:128,holdout:true,ablation:"mean"
    },
    provenance: {
      runId:"experiment-1",implementationRevision:"commit-abc",
      evaluatedAt:"2026-11-18T00:00:00Z"
    }
  };
}
test("bounded valid research candidate never approves production or clinical use", () => {
  const result = inspectSparseCircuitCandidate(candidate());
  assert.equal(result.valid,true);
  assert.equal(result.status,"unverified-research-candidate");
  assert.equal(result.nodeCount,2);
  assert.equal(result.edgeCount,1);
  assert.equal(result.mechanisticExplanationVerified,false);
  assert.equal(result.productionEligible,false);
  assert.equal(result.clinicalUsePermitted,false);
  assert.equal(Object.isFrozen(result),true);
  assert.equal("weightsSha256" in result,false);
});
test("malformed artifacts reject without echoing raw content", () => {
  for (const input of [null,[],{},{"patientName":"private"},{
    ...candidate(),patientName:"PRIVATE PATIENT"
  }]) {
    const r = inspectSparseCircuitCandidate(input);
    assert.equal(r.valid,false);
    assert.equal(r.productionEligible,false);
    assert.ok(!JSON.stringify(r).includes("PRIVATE"));
  }
});
test("unknown fields cannot carry prompts, tokens, PHI or source rights", () => {
  const c=candidate(); c.circuit.nodes[0].patientText="PRIVATE";
  assert.equal(inspectSparseCircuitCandidate(c).valid,false);
  const d=candidate(); d.provenance.approvedForProduction=true;
  assert.equal(inspectSparseCircuitCandidate(d).valid,false);
});
test("all edges reference unique known nodes with nonzero finite weights", () => {
  for(const edge of [
    {from:"unknown",to:"n2",weight:1},
    {from:"n1",to:"n1",weight:1},
    {from:"n1",to:"n2",weight:0},
    {from:"n1",to:"n2",weight:Infinity},
    {from:"n1",to:"n2",weight:NaN}
  ]) {const c=candidate();c.circuit.edges=[edge];assert.equal(inspectSparseCircuitCandidate(c).valid,false);}
  const c=candidate();c.circuit.edges.push({...c.circuit.edges[0]});
  assert.equal(inspectSparseCircuitCandidate(c).valid,false);
});
test("duplicate, unknown and oversized node lists reject", () => {
  const c=candidate();c.circuit.nodes[1].id="n1";
  assert.equal(inspectSparseCircuitCandidate(c).valid,false);
  const d=candidate();d.circuit.nodes[1].kind="fiction";
  assert.equal(inspectSparseCircuitCandidate(d).valid,false);
  const e=candidate();e.circuit.nodes=Array.from({length:2001},(_,i)=>({id:`n${i}`,kind:"mlp-neuron"}));
  assert.equal(inspectSparseCircuitCandidate(e).valid,false);
});
test("invalid metrics and assertions about evaluation reject", () => {
  for (const patch of [
    {baselineLoss:-1},{circuitLoss:Infinity},{ablatedLoss:NaN},
    {sampleCount:0},{sampleCount:1.5},{holdout:false},
    {ablation:"none"}
  ]) {const c=candidate();Object.assign(c.evaluation,patch);assert.equal(inspectSparseCircuitCandidate(c).valid,false);}
});
test("requires inspectable weights, provenance hashes and valid time", () => {
  const c=candidate();c.model.access="api-only";
  assert.equal(inspectSparseCircuitCandidate(c).valid,false);
  const d=candidate();d.task.datasetSha256="not-a-sha";
  assert.equal(inspectSparseCircuitCandidate(d).valid,false);
  for(const date of ["tomorrow","2026-11-18","2026-99-99T00:00:00Z"]) {
    const t=candidate();t.provenance.evaluatedAt=date;
    assert.equal(inspectSparseCircuitCandidate(t).valid,false);
  }
});
test("input remains unchanged and no user-supplied flags can elevate status", () => {
  const c=candidate();const before=JSON.stringify(c);
  inspectSparseCircuitCandidate(c);
  assert.equal(JSON.stringify(c),before);
  assert.equal(inspectSparseCircuitCandidate({...c,productionEligible:true}).valid,false);
});

// A research graph must be a directed, non-isolated transformer computation.
test("rejects cyclic and isolated graph nodes without claiming causal validation", () => {
  const cycle=candidate();
  cycle.circuit.edges.push({from:"n2",to:"n1",weight:0.1});
  const cycleResult=inspectSparseCircuitCandidate(cycle);
  assert.equal(cycleResult.valid,false);
  assert.ok(cycleResult.errors.includes("circuit.cycle"));
  const isolated=candidate();
  isolated.circuit.nodes.push({id:"n3",kind:"mlp-neuron"});
  const isolatedResult=inspectSparseCircuitCandidate(isolated);
  assert.equal(isolatedResult.valid,false);
  assert.ok(isolatedResult.errors.includes("circuit.disconnected_node"));
});

test("rejects separately connected components and invalid calendar dates", () => {
  const split=candidate();
  split.circuit.nodes.push(
    {id:"n3",kind:"mlp-neuron"},
    {id:"n4",kind:"attention-channel"}
  );
  split.circuit.edges.push({from:"n3",to:"n4",weight:0.4});
  const result=inspectSparseCircuitCandidate(split);
  assert.equal(result.valid,false);
  assert.ok(result.errors.includes("circuit.disconnected_components"));
  const impossible=candidate();
  impossible.provenance.evaluatedAt="2026-02-30T00:00:00Z";
  assert.equal(inspectSparseCircuitCandidate(impossible).valid,false);
  const typed=candidate();
  typed.model.weightsSha256={toString:()=> "a".repeat(64)};
  assert.equal(inspectSparseCircuitCandidate(typed).valid,false);
});

test("versioned unverified research summary matches the shared web and native schema", () => {
  const schema=JSON.parse(readFileSync(
    new URL("../docs/intelligence/npi-sparse-circuit-summary-v1.schema.json", import.meta.url),
    "utf8"
  ));
  const result=inspectSparseCircuitCandidate(candidate());
  assert.equal(result.valid,true);
  assert.equal(schema.additionalProperties,false);
  assert.equal(schema.$id,"urn:novapharm:intelligence:sparse-circuit-summary:v1");
  assert.deepEqual(Object.keys(result).sort(),schema.required.slice().sort());
  assert.deepEqual(Object.keys(schema.properties).sort(),schema.required.slice().sort());
  for (const [key, definition] of Object.entries(schema.properties)) {
    if (Object.hasOwn(definition, "const")) assert.equal(result[key],definition.const);
    if (definition.type === "string") {
      assert.equal(typeof result[key], "string");
      assert.match(result[key],new RegExp(definition.pattern));
    }
    if (definition.type === "integer") {
      assert.ok(Number.isSafeInteger(result[key]));
      assert.ok(result[key] >= definition.minimum && result[key] <= definition.maximum);
    }
    if (definition.type === "number") assert.ok(typeof result[key] === "number" && Number.isFinite(result[key]));
  }
});
