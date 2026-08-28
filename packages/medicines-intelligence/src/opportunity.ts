import type { OpportunityComponentInput, OpportunityContribution, OpportunityScore, OpportunityWeight } from "./types.ts";

export interface OpportunityScoringOptions {
  readonly modelVersion: string;
  readonly productCommerciallyAuthorised: boolean;
  readonly productAvailable: boolean;
  readonly marketingEligible: boolean;
  readonly requiredComponents?: readonly string[];
}

export function scoreOpportunity(
  components: readonly OpportunityComponentInput[],
  weights: readonly OpportunityWeight[],
  options: OpportunityScoringOptions,
): OpportunityScore {
  if (!/^[a-z0-9][a-z0-9._-]{2,80}$/iu.test(options.modelVersion)) throw new Error("Opportunity model version is invalid.");
  const componentByKey = new Map<string, OpportunityComponentInput>();
  for (const component of components) {
    if (componentByKey.has(component.key)) throw new Error(`Duplicate opportunity component: ${component.key}`);
    if (component.value !== null && (!Number.isFinite(component.value) || component.value < 0 || component.value > 1)) throw new Error(`Opportunity component ${component.key} must be normalised from zero to one.`);
    componentByKey.set(component.key, component);
  }
  const weightKeys = new Set<string>();
  let totalWeight = 0;
  const contributions: OpportunityContribution[] = [];
  for (const weight of weights) {
    if (weightKeys.has(weight.key)) throw new Error(`Duplicate opportunity weight: ${weight.key}`);
    if (!Number.isFinite(weight.weight) || weight.weight <= 0 || weight.weight > 1) throw new Error(`Opportunity weight ${weight.key} must be greater than zero and no more than one.`);
    weightKeys.add(weight.key);
    const component = componentByKey.get(weight.key);
    if (!component) throw new Error(`Opportunity weight ${weight.key} has no governed component.`);
    const adjusted = component.value === null ? null : weight.direction === "positive" ? component.value : 1 - component.value;
    const contribution = adjusted === null ? null : adjusted * weight.weight;
    if (contribution !== null) totalWeight += weight.weight;
    contributions.push(Object.freeze({ key: component.key, label: component.label, value: component.value, weight: weight.weight, contribution, source: component.source, period: component.period }));
  }
  const blockers: string[] = [];
  if (!options.productCommerciallyAuthorised) blockers.push("Product is not commercially authorised for this opportunity.");
  if (!options.productAvailable) blockers.push("Approved product availability is not established.");
  if (!options.marketingEligible) blockers.push("The pharmacy/contact is not currently marketing eligible.");
  for (const required of options.requiredComponents ?? []) {
    if (componentByKey.get(required)?.value === null || !componentByKey.has(required)) blockers.push(`Required component ${required} is unavailable.`);
  }
  const eligible = blockers.length === 0;
  const raw = totalWeight > 0 ? contributions.reduce((sum, component) => sum + (component.contribution ?? 0), 0) / totalWeight : null;
  return Object.freeze({
    modelVersion: options.modelVersion,
    score: eligible && raw !== null ? Math.round(raw * 10_000) / 100 : null,
    eligible,
    contributions: Object.freeze(contributions),
    blockers: Object.freeze(blockers),
    caveats: Object.freeze([
      "Nearby prescribing is an opportunity signal, not proof that the selected pharmacy dispensed the medicine.",
      "An email address and marketing eligibility are separate governed facts.",
      "Weights are versioned configuration and must be backtested against outcomes before production reliance.",
    ]),
  });
}
