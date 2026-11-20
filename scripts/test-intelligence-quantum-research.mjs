import test from "node:test";
import assert from "node:assert/strict";
import { assessQuantumResearchReceipt, stateVectorBytes } from "../src/core/intelligence-quantum-research.mjs";
const valid = () => ({
  schemaVersion: "npi.quantum-research.v1", experimentId: "bell-1234567890abcdef",
  method: "bell-sampling", engine: "cirq-local-simulator", qubits: 2, shots: 1000,
  seed: 42, noiseModel: "ideal",
  counts: { "00": 493, "01": 0, "10": 0, "11": 507 },
  inputSha256: "a".repeat(64), codeSha256: "b".repeat(64), calibrationId: null,
  simulatedOnly: true, hardwareMeasured: false, independentlyVerified: false,
  dataRightsApproved: false, productionApproved: false, customerVisible: false,
  clinicalUsePermitted: false
});
test("typed research histogram is display-only and never a production receipt", () => {
  const result = assessQuantumResearchReceipt(valid());
  assert.equal(result.observed00Fraction, 0.493);
  assert.equal(result.observedEqualBitFraction, 1);
  assert.equal(result.productionEligible, false);
  assert.equal(result.independentlyVerified, false);
  assert.ok(Object.isFrozen(result));
});
test("release claims, real hardware and untrusted fields are denied", () => {
  for (const [field, value] of [
    ["productionApproved", true], ["customerVisible", true], ["clinicalUsePermitted", true],
    ["hardwareMeasured", true], ["simulatedOnly", false], ["dataRightsApproved", true],
    ["independentlyVerified", true], ["engine", "quantum-hardware"],
    ["method", "molecular-energy"], ["shots", 10001], ["qubits", 31],
    ["inputSha256", "unhashed"], ["calibrationId", "fake-physical-id"],
    ["counts", { "00": 400, "01": 1, "10": 0, "11": 599 }],
    ["counts", { "00": 500, "01": 0, "10": 0, "11": 499 }]
  ]) {
    assert.throws(() => assessQuantumResearchReceipt({ ...valid(), [field]: value }), String(field));
  }
  assert.throws(() => assessQuantumResearchReceipt({ ...valid(), medicalConclusion: "approved" }));
  assert.throws(() => assessQuantumResearchReceipt(null));
});
test("simulator resource advisory is bounded and is not a RAM guarantee", () => {
  assert.equal(stateVectorBytes(20), 16777216);
  assert.equal(stateVectorBytes(30), 17179869184);
  assert.throws(() => stateVectorBytes(41));
  assert.throws(() => stateVectorBytes(-1));
});
