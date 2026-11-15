/**
 * Deterministic, editable capacity *scenario*. This is not an AI forecast,
 * warehouse staffing decision, actual slotting or physical execution.
 *
 * No browser/server storage, no network and no production data are used.
 */
export type WmsCapacityScenarioInput = Readonly<{
  orderLines: number;
  teamMembers: number;
  linesPerHourPerPerson: number;
  shiftHours: number;
  equipmentAvailabilityPercent: number;
  variabilityBufferPercent: number;
  zoneAWeight: number;
  zoneBWeight: number;
  zoneCWeight: number;
}>;

export const DEFAULT_WMS_CAPACITY_SCENARIO: WmsCapacityScenarioInput = Object.freeze({
  orderLines: 1200,
  teamMembers: 6,
  linesPerHourPerPerson: 35,
  shiftHours: 8,
  equipmentAvailabilityPercent: 85,
  variabilityBufferPercent: 15,
  zoneAWeight: 50,
  zoneBWeight: 35,
  zoneCWeight: 15,
});

type ScenarioResult = Readonly<{
  status: "hypothetical_scenario" | "invalid_inputs";
  reason: string;
  requiredMembers: number | null;
  additionalMembers: number | null;
  effectiveCapacityLines: number | null;
  bufferedDemandLines: number | null;
  utilisationPercent: number | null;
  pressure: "capacity_gap" | "elevated" | "within_scenario" | "unknown";
  zones: ReadonlyArray<Readonly<{ zone: string; hypotheticalLines: number }>>;
  liveLaborConfirmed: false;
  workerAssignmentsCreated: false;
  warehouseTasksCreated: false;
  providerDataUsed: false;
  aiPrediction: false;
}>;

function valid(n: number, min: number, max: number) {
  return Number.isFinite(n) && Number.isSafeInteger(n) && n >= min && n <= max;
}

export function evaluateWmsCapacityScenario(input: WmsCapacityScenarioInput): ScenarioResult {
  const blocked = (reason: string): ScenarioResult => Object.freeze({
    status: "invalid_inputs", reason,
    requiredMembers: null, additionalMembers: null, effectiveCapacityLines: null,
    bufferedDemandLines: null, utilisationPercent: null, pressure: "unknown",
    zones: Object.freeze([]),
    liveLaborConfirmed: false, workerAssignmentsCreated: false,
    warehouseTasksCreated: false, providerDataUsed: false, aiPrediction: false,
  });
  if (!input ||
      !valid(input.orderLines, 0, 1000000) ||
      !valid(input.teamMembers, 1, 500) ||
      !valid(input.linesPerHourPerPerson, 1, 200) ||
      !valid(input.shiftHours, 1, 24) ||
      !valid(input.equipmentAvailabilityPercent, 10, 100) ||
      !valid(input.variabilityBufferPercent, 0, 50) ||
      !valid(input.zoneAWeight, 0, 100) ||
      !valid(input.zoneBWeight, 0, 100) ||
      !valid(input.zoneCWeight, 0, 100) ||
      input.zoneAWeight + input.zoneBWeight + input.zoneCWeight === 0)
    return blocked("Enter valid, non-negative hypothetical workload and resource assumptions.");

  const effectiveness = input.equipmentAvailabilityPercent / 100;
  const required = input.orderLines * (1 + input.variabilityBufferPercent / 100);
  const perPerson = input.linesPerHourPerPerson * input.shiftHours * effectiveness;
  const capacity = input.teamMembers * perPerson;
  if (!Number.isFinite(required) || !Number.isFinite(capacity) || capacity <= 0)
    return blocked("Scenario quantity exceeds safe calculation bounds.");

  const requiredMembers = Math.ceil(required / perPerson);
  const load = Math.round((required / capacity) * 100);
  const weights = [input.zoneAWeight,input.zoneBWeight,input.zoneCWeight];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const a = Math.floor(input.orderLines * weights[0] / totalWeight);
  const b = Math.floor(input.orderLines * weights[1] / totalWeight);
  const zones = Object.freeze([
    Object.freeze({ zone: "Zone A", hypotheticalLines: a }),
    Object.freeze({ zone: "Zone B", hypotheticalLines: b }),
    Object.freeze({ zone: "Zone C", hypotheticalLines: input.orderLines - a - b }),
  ]);
  return Object.freeze({
    status: "hypothetical_scenario",
    reason: "Inputs are entered assumptions, not qualified historical demand or live 3PL labour telemetry.",
    requiredMembers,
    additionalMembers: Math.max(0, requiredMembers - input.teamMembers),
    effectiveCapacityLines: Math.floor(capacity),
    bufferedDemandLines: Math.ceil(required),
    utilisationPercent: load,
    pressure: load > 100 ? "capacity_gap" : load >= 85 ? "elevated" : "within_scenario",
    zones,
    liveLaborConfirmed: false,
    workerAssignmentsCreated: false,
    warehouseTasksCreated: false,
    providerDataUsed: false,
    aiPrediction: false,
  });
}
