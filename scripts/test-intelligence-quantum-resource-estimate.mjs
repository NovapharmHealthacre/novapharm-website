import test from "node:test";
import assert from "node:assert/strict";
import { assessQuantumResourcePlan, RESOURCE_PLAN_CONTRACT } from "../src/core/intelligence-quantum-resource-estimate.mjs";

const plan = () => ({
  schemaVersion: RESOURCE_PLAN_CONTRACT,
  backend: "classical-state-vector-only",
  qubits: 20, shots: 512, circuitGates: 100,
  memoryBudgetMiB: 64,
  hardwareExecutionRequested: false, paidComputeRequested: false,
  protectedDataRequested: false, productionApproved: false
});

test("complex128 state vector estimate is dimensional, not a runtime guarantee", () => {
  const p = assessQuantumResourcePlan(plan());
  assert.equal(p.stateVectorMemoryMiB, 16);
  assert.equal(p.vectorWithinBudget, true);
  assert.equal(p.conservativeResearchCandidate, true);
  assert.equal(p.assessment, "source-review-only");
  assert.equal(p.actualMemoryRequiredMiB, null);
  assert.equal(p.wallClockSeconds, null);
  assert.equal(p.quotedCostGbp, null);
  assert.equal(p.physicalQubitsRequired, null);
  assert.equal(p.executionEnabled, false);
  assert.equal(p.productionEligible, false);
  assert.ok(Object.isFrozen(p));
});
test("25 and 30 qubit plans are *never* marked executable or affordable", () => {
  for (const [qubits, expectedMemory] of [[25,512],[30,16384],[40,16777216]]) {
    const p = assessQuantumResourcePlan({...plan(),qubits});
    assert.equal(p.stateVectorMemoryMiB,expectedMemory);
    assert.equal(p.vectorWithinBudget,false);
    assert.equal(p.conservativeResearchCandidate,false);
    assert.equal(p.hardwareEnabled,false);
    assert.equal(p.executionEnabled,false);
  }
});
test("large shots and gates are not promoted just because vector fits", () => {
  for (const mutation of [{shots:2000},{circuitGates:10000},{qubits:21}]) {
    const p = assessQuantumResourcePlan({...plan(),...mutation});
    assert.equal(p.conservativeResearchCandidate,false);
  }
});
test("hardware, paid, protected, clinical and extra-field claims fail closed", () => {
  for (const key of ["hardwareExecutionRequested","paidComputeRequested","protectedDataRequested","productionApproved"]) {
    assert.throws(() => assessQuantumResourcePlan({...plan(),[key]:true}),key);
  }
  assert.throws(() => assessQuantumResourcePlan({...plan(),patientName:"sensitive"}));
  assert.throws(() => assessQuantumResourcePlan({...plan(),clinicalUsePermitted:true}));
  assert.throws(() => assessQuantumResourcePlan({...plan(),backend:"qpu"}));
});
test("noninteger, overbudget and malformed plans are rejected", () => {
  for(const change of [
    {qubits:0},{qubits:41},{qubits:2.5},{qubits:NaN},{shots:0},
    {shots:10001},{circuitGates:-1},{circuitGates:100001},
    {memoryBudgetMiB:0},{memoryBudgetMiB:257},{memoryBudgetMiB:Infinity},
    {shots:"512"},{memoryBudgetMiB:true}
  ]) {
    assert.throws(() => assessQuantumResourcePlan({...plan(),...change}));
  }
  assert.throws(() => assessQuantumResourcePlan(null));
  assert.throws(() => assessQuantumResourcePlan([]));
  assert.throws(() => assessQuantumResourcePlan({}));
});
