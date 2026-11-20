/**
 * NovaPharm quantum research — nonexecuting classical simulator capacity planning.
 * A state-vector memory formula is not a runtime, performance, budget,
 * cloud-availability, fault-tolerant or quantum-hardware estimate.
 */
import { stateVectorBytes } from "./intelligence-quantum-research.mjs";

export const RESOURCE_PLAN_CONTRACT = "npi.quantum-simulator-preflight.v1";

const KEYS = Object.freeze([
  "schemaVersion", "backend", "qubits", "shots", "circuitGates",
  "memoryBudgetMiB", "hardwareExecutionRequested", "paidComputeRequested",
  "protectedDataRequested", "productionApproved"
]);

export function assessQuantumResourcePlan(plan) {
  if (plan === null || typeof plan !== "object" || Array.isArray(plan) ||
      Object.keys(plan).length !== KEYS.length ||
      KEYS.some((key) => !Object.hasOwn(plan, key))) {
    throw new TypeError("Unsupported quantum simulation plan structure");
  }
  if (plan.schemaVersion !== RESOURCE_PLAN_CONTRACT ||
      plan.backend !== "classical-state-vector-only" ||
      !Number.isInteger(plan.qubits) || plan.qubits < 1 || plan.qubits > 40 ||
      !Number.isInteger(plan.shots) || plan.shots < 1 || plan.shots > 10000 ||
      !Number.isInteger(plan.circuitGates) || plan.circuitGates < 1 || plan.circuitGates > 100000 ||
      !Number.isInteger(plan.memoryBudgetMiB) || plan.memoryBudgetMiB < 1 ||
      plan.memoryBudgetMiB > 256 ||
      plan.hardwareExecutionRequested !== false ||
      plan.paidComputeRequested !== false ||
      plan.protectedDataRequested !== false ||
      plan.productionApproved !== false) {
    throw new RangeError("Plan violates bounded, noncommercial offline constraints");
  }

  // Complex128 state vector = 16 bytes times 2^n; excludes all overhead,
  // ancillary states, density matrices, simulator temporaries and OS/runtime RAM.
  const stateVectorMiB = stateVectorBytes(plan.qubits) / (1024 * 1024);
  const withinVectorBudget = stateVectorMiB <= plan.memoryBudgetMiB;
  const withinConservativeStudyBounds = plan.qubits <= 20 &&
    plan.shots <= 1000 && plan.circuitGates <= 5000;
  return Object.freeze({
    schemaVersion: RESOURCE_PLAN_CONTRACT,
    backend: "classical-state-vector-only",
    qubits: plan.qubits,
    shots: plan.shots,
    circuitGates: plan.circuitGates,
    stateVectorMemoryMiB: stateVectorMiB,
    vectorBudgetMiB: plan.memoryBudgetMiB,
    vectorWithinBudget: withinVectorBudget,
    conservativeResearchCandidate: withinVectorBudget && withinConservativeStudyBounds,
    assessment: withinVectorBudget && withinConservativeStudyBounds
      ? "source-review-only" : "exceeds-bounded-research-advisory",
    actualMemoryRequiredMiB: null,
    wallClockSeconds: null,
    quotedCostGbp: null,
    logicalQubitsRequired: null,
    physicalQubitsRequired: null,
    faultToleranceValidated: false,
    hardwareEnabled: false,
    executionEnabled: false,
    productionEligible: false,
    independentlyVerified: false
  });
}
