/**
 * NovaPharm Quantum Research v1 — offline, source-only.
 * A receipt validator, not an executor, licence checker, signature verifier,
 * clinical evaluation, quantum-hardware adapter or production admission grant.
 */
export const QUANTUM_CONTRACT = "npi.quantum-research.v1";
const EXPECTED_KEYS = Object.freeze([
  "schemaVersion", "experimentId", "method", "engine", "qubits", "shots", "seed",
  "noiseModel", "counts", "inputSha256", "codeSha256", "calibrationId",
  "simulatedOnly", "hardwareMeasured", "independentlyVerified",
  "dataRightsApproved", "productionApproved", "customerVisible",
  "clinicalUsePermitted"
]);
const DIGEST = /^[a-f0-9]{64}$/;
const EXPERIMENT_ID = /^bell-[a-f0-9]{16}$/;
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function assessQuantumResearchReceipt(receipt) {
  if (!record(receipt) || Object.keys(receipt).length !== EXPECTED_KEYS.length ||
      EXPECTED_KEYS.some((key) => !Object.hasOwn(receipt, key))) {
    throw new TypeError("Quantum research receipt does not match the exact contract");
  }
  if (receipt.schemaVersion !== QUANTUM_CONTRACT ||
      typeof receipt.experimentId !== "string" ||
      !EXPERIMENT_ID.test(receipt.experimentId) ||
      receipt.method !== "bell-sampling" ||
      receipt.engine !== "cirq-local-simulator" ||
      receipt.qubits !== 2 ||
      !Number.isInteger(receipt.shots) || receipt.shots < 1 || receipt.shots > 10000 ||
      !Number.isInteger(receipt.seed) || receipt.seed < 0 || receipt.seed > 2147483647 ||
      receipt.noiseModel !== "ideal" || receipt.calibrationId !== null ||
      typeof receipt.inputSha256 !== "string" || !DIGEST.test(receipt.inputSha256) ||
      typeof receipt.codeSha256 !== "string" || !DIGEST.test(receipt.codeSha256) ||
      receipt.simulatedOnly !== true || receipt.hardwareMeasured !== false ||
      receipt.independentlyVerified !== false || receipt.dataRightsApproved !== false ||
      receipt.productionApproved !== false || receipt.customerVisible !== false ||
      receipt.clinicalUsePermitted !== false) {
    throw new TypeError("Quantum research receipt is outside the allowed offline state");
  }
  if (!record(receipt.counts) ||
      Object.keys(receipt.counts).length !== 4 ||
      ["00", "01", "10", "11"].some((key) =>
        !Object.hasOwn(receipt.counts, key) ||
        !Number.isInteger(receipt.counts[key]) ||
        receipt.counts[key] < 0 ||
        receipt.counts[key] > receipt.shots)) {
    throw new TypeError("Quantum measurement counts must be a complete bounded histogram");
  }
  const { counts } = receipt;
  if (counts["00"] + counts["01"] + counts["10"] + counts["11"] !== receipt.shots ||
      counts["01"] !== 0 || counts["10"] !== 0) {
    throw new TypeError("Ideal Bell experiment has inconsistent measurement outcomes");
  }
  // A schema-valid record is not independently reproduced scientific evidence.
  return Object.freeze({
    schemaVersion: QUANTUM_CONTRACT,
    experimentId: receipt.experimentId,
    engine: receipt.engine,
    qubits: 2,
    shots: receipt.shots,
    measuredOnHardware: false,
    observedEqualBitFraction: (counts["00"] + counts["11"]) / receipt.shots,
    observed00Fraction: counts["00"] / receipt.shots,
    state: "unverified-offline-simulation",
    productionEligible: false,
    clinicalUsePermitted: false,
    independentlyVerified: false
  });
}
export function stateVectorBytes(qubits) {
  if (!Number.isInteger(qubits) || qubits < 1 || qubits > 40) {
    throw new RangeError("Qubit estimate outside bounded advisory range");
  }
  // 16 bytes / complex128 amplitude; excludes simulator overhead.
  return 16 * 2 ** qubits;
}
