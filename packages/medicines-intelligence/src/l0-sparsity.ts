// Research-only numerical primitives for Louizos et al. (ICLR 2018) L0 hard-concrete gates.
// No trained model, patient data, network route or customer release is bundled here.
export interface L0GateOptions {
  readonly temperature?: number;
  readonly gamma?: number;
  readonly zeta?: number;
}

export interface L0SparseLinearCandidate {
  readonly format: "nova-l0-sparse-linear-candidate-v1";
  readonly releaseStatus: "research-only";
  readonly productionApproved: false;
  readonly customerVisible: false;
  readonly featureNames: readonly string[];
  readonly coefficients: readonly number[];
  readonly bias: number;
  readonly nonZeroCount: number;
}

const DEFAULT_TEMPERATURE = 2 / 3;
const DEFAULT_GAMMA = -0.1;
const DEFAULT_ZETA = 1.1;

function validFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(label + " must be finite.");
  return value;
}

function parameters(options: L0GateOptions): Readonly<{ temperature: number; gamma: number; zeta: number }> {
  const temperature = validFinite(options.temperature ?? DEFAULT_TEMPERATURE, "Temperature");
  const gamma = validFinite(options.gamma ?? DEFAULT_GAMMA, "Gamma");
  const zeta = validFinite(options.zeta ?? DEFAULT_ZETA, "Zeta");
  if (temperature <= 0 || gamma >= 0 || zeta <= 1 || zeta <= gamma) {
    throw new Error("Hard-concrete parameters require temperature > 0, gamma < 0 and zeta > 1.");
  }
  return Object.freeze({ temperature, gamma, zeta });
}

function sigmoid(value: number): number {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** P(z > 0) from the paper's analytic expected-L0 penalty (Eq. 12). */
export function l0ActivationProbability(logAlpha: number, options: L0GateOptions = {}): number {
  validFinite(logAlpha, "Gate log-alpha");
  const { temperature, gamma, zeta } = parameters(options);
  return sigmoid(logAlpha - temperature * Math.log(-gamma / zeta));
}

/** Deterministic test-time gate (Eq. 13); exact zero and one are possible. */
export function l0DeterministicGate(logAlpha: number, options: L0GateOptions = {}): number {
  validFinite(logAlpha, "Gate log-alpha");
  const { gamma, zeta } = parameters(options);
  return clamp01(sigmoid(logAlpha) * (zeta - gamma) + gamma);
}

/** Reparameterised stochastic training gate. Random uniform u must be strictly between 0 and 1. */
export function l0SampleGate(logAlpha: number, uniform: number, options: L0GateOptions = {}): number {
  validFinite(logAlpha, "Gate log-alpha");
  validFinite(uniform, "Uniform sample");
  if (uniform <= 0 || uniform >= 1) throw new Error("Uniform sample must be strictly between 0 and 1.");
  const { temperature, gamma, zeta } = parameters(options);
  const logisticNoise = Math.log(uniform) - Math.log1p(-uniform);
  return clamp01(sigmoid((logisticNoise + logAlpha) / temperature) * (zeta - gamma) + gamma);
}

/** Expected active feature/group count, not a guaranteed compute-speedup measurement. */
export function l0ExpectedActiveCount(logAlphas: readonly number[], options: L0GateOptions = {}): number {
  if (!Array.isArray(logAlphas) || logAlphas.length === 0 || logAlphas.length > 4096) {
    throw new Error("Expected L0 requires between 1 and 4096 gates.");
  }
  return logAlphas.reduce((sum, logAlpha) => sum + l0ActivationProbability(logAlpha, options), 0);
}

/**
 * Materialise a single-output research-only linear candidate.
 * A trusted model registry must separately verify the weights, signed manifest,
 * data rights, holdout evaluation and deployment eligibility before any integration.
 */
export function compileL0SparseLinearCandidate(input: Readonly<{
  featureNames: readonly string[];
  weights: readonly number[];
  logAlphas: readonly number[];
  bias: number;
  gates?: L0GateOptions;
}>): L0SparseLinearCandidate {
  const { featureNames, weights, logAlphas } = input;
  if (!Array.isArray(featureNames) || featureNames.length === 0 || featureNames.length > 4096 ||
      featureNames.length !== weights.length || weights.length !== logAlphas.length) {
    throw new Error("Feature names, weights and gate parameters must have matching nonempty dimensions (max 4096).");
  }
  if (featureNames.some((name) => typeof name !== "string" || !/^[a-z][a-z0-9_]{0,63}$/u.test(name)) ||
      new Set(featureNames).size !== featureNames.length) {
    throw new Error("Feature identifiers must be unique, lowercase and schema-safe.");
  }
  const bias = validFinite(input.bias, "Bias");
  const coefficients = weights.map((weight, index) => {
    const gate = l0DeterministicGate(logAlphas[index]!, input.gates);
    const coefficient = validFinite(weight, "Weight") * gate;
    return validFinite(coefficient, "Gated coefficient") === 0 ? 0 : coefficient;
  });
  return Object.freeze({
    format: "nova-l0-sparse-linear-candidate-v1",
    releaseStatus: "research-only",
    productionApproved: false,
    customerVisible: false,
    featureNames: Object.freeze([...featureNames]),
    coefficients: Object.freeze(coefficients),
    bias,
    nonZeroCount: coefficients.filter((value) => value !== 0).length,
  });
}

/** Offline test-only inference. No medical recommendations, calibrated intervals or confidence claims. */
export function scoreL0SparseLinearCandidate(
  model: L0SparseLinearCandidate,
  features: Readonly<Record<string, number>>,
): number {
  if (model.format !== "nova-l0-sparse-linear-candidate-v1" ||
      model.releaseStatus !== "research-only" ||
      model.productionApproved !== false ||
      model.customerVisible !== false ||
      Object.keys(features).length !== model.featureNames.length ||
      new Set(model.featureNames).size !== model.featureNames.length ||
      model.featureNames.length !== model.coefficients.length) {
    throw new Error("Sparse candidate or feature schema is invalid.");
  }
  let result = validFinite(model.bias, "Bias");
  for (let index = 0; index < model.featureNames.length; index += 1) {
    const featureName = model.featureNames[index]!;
    if (!Object.hasOwn(features, featureName)) throw new Error("Required feature missing.");
    const value = validFinite(features[featureName]!, "Feature");
    const coefficient = validFinite(model.coefficients[index]!, "Coefficient");
    result += coefficient * value;
    validFinite(result, "Score");
  }
  return result;
}
