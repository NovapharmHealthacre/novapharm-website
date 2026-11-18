// Research-only, deterministic import guard for sparse mechanistic circuit artifacts.
// This is NOT a model runner, an OpenAI API adapter, a signed attestation, or a clinical approval.
export const CIRCUIT_ARTIFACT_VERSION = "npi.sparse-circuit.v1";

const identifier = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const sha256 = /^[a-f0-9]{64}$/;
const nodeKinds = new Set([
  "mlp-neuron", "attention-channel", "residual-read", "residual-write", "embedding-channel"
]);
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const validIdentifier = (value) => typeof value === "string" && identifier.test(value);
const finiteNonNegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function objectWithKeys(value, required, path, errors) {
  if (!isObject(value)) {
    errors.push(`${path}.invalid_object`);
    return false;
  }
  const actual = Object.keys(value);
  if (required.some((key) => !Object.hasOwn(value, key)) ||
      actual.some((key) => !required.includes(key))) {
    errors.push(`${path}.field_mismatch`);
    return false;
  }
  return true;
}

function reject(errors) {
  return Object.freeze({
    schemaVersion: CIRCUIT_ARTIFACT_VERSION,
    valid: false,
    status: "rejected",
    errors: Object.freeze([...new Set(errors)]),
    mechanisticExplanationVerified: false,
    productionEligible: false,
    clinicalUsePermitted: false
  });
}

/**
 * Checks a bounded, metadata-only circuit candidate. Does not run, prune, train,
 * certify, fetch, or reproduce a model. No prompts, tokens, examples or PHI accepted.
 * Never trust browser/mobile supplied artifacts as access or rights evidence.
 */
export function inspectSparseCircuitCandidate(artifact) {
  const errors = [];
  if (!objectWithKeys(artifact, [
    "schemaVersion", "model", "task", "circuit", "evaluation", "provenance"
  ], "artifact", errors)) return reject(errors);
  if (artifact.schemaVersion !== CIRCUIT_ARTIFACT_VERSION) errors.push("artifact.unsupported_version");

  const modelOK = objectWithKeys(artifact.model,
    ["identifier", "revision", "weightsSha256", "access"], "model", errors);
  if (modelOK && (
    !validIdentifier(artifact.model.identifier) ||
    !validIdentifier(artifact.model.revision) ||
    typeof artifact.model.weightsSha256 !== "string" || !sha256.test(artifact.model.weightsSha256) ||
    artifact.model.access !== "weights-and-activations"
  )) errors.push("model.invalid_metadata");

  const taskOK = objectWithKeys(artifact.task,
    ["identifier", "datasetSha256"], "task", errors);
  if (taskOK && (
    !validIdentifier(artifact.task.identifier) ||
    typeof artifact.task.datasetSha256 !== "string" || !sha256.test(artifact.task.datasetSha256)
  )) errors.push("task.invalid_metadata");

  const graphOK = objectWithKeys(artifact.circuit, ["nodes", "edges"], "circuit", errors);
  let nodeCount = 0;
  let edgeCount = 0;
  if (graphOK) {
    const {nodes, edges} = artifact.circuit;
    if (!Array.isArray(nodes) || !Array.isArray(edges) ||
        nodes.length < 1 || nodes.length > 2000 ||
        edges.length < 1 || edges.length > 8000) {
      errors.push("circuit.invalid_size");
    } else {
      nodeCount = nodes.length;
      edgeCount = edges.length;
      const ids = new Set();
      for (const node of nodes) {
        if (!objectWithKeys(node, ["id", "kind"], "node", errors)) continue;
        if (!validIdentifier(node.id) || !nodeKinds.has(node.kind) || ids.has(node.id)) {
          errors.push("node.invalid_or_duplicate");
        } else ids.add(node.id);
      }
      const pairs = new Set();
      for (const edge of edges) {
        if (!objectWithKeys(edge, ["from", "to", "weight"], "edge", errors)) continue;
        if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to ||
            typeof edge.weight !== "number" || !Number.isFinite(edge.weight) ||
            edge.weight === 0) {
          errors.push("edge.invalid");
          continue;
        }
        const pair = `${edge.from}\u0000${edge.to}`;
        if (pairs.has(pair)) errors.push("edge.duplicate");
        pairs.add(pair);
      }
      // Transformer computation is a feed-forward DAG. Cyclic or disconnected
      // directed graphs cannot be represented as an accepted circuit candidate.
      // This is structural checking only: it does not verify causal faithfulness.
      if (errors.length === 0) {
        const adjacency = new Map([...ids].map(id => [id, []]));
        const incoming = new Map([...ids].map(id => [id, 0]));
        const incident = new Set();
        for (const edge of edges) {
          adjacency.get(edge.from).push(edge.to);
          incoming.set(edge.to, incoming.get(edge.to) + 1);
          incident.add(edge.from);
          incident.add(edge.to);
        }
        if (incident.size !== ids.size) errors.push("circuit.disconnected_node");
        // Weak connectivity is necessary for a single extracted circuit.
        // A graph may be acyclic and have no isolated nodes yet still contain
        // multiple unrelated components.
        const neighbors = new Map([...ids].map(id => [id, []]));
        for (const edge of edges) {
          neighbors.get(edge.from).push(edge.to);
          neighbors.get(edge.to).push(edge.from);
        }
        const reached = new Set();
        const traversal = [nodes[0].id];
        for (let i = 0; i < traversal.length; i += 1) {
          const current = traversal[i];
          if (reached.has(current)) continue;
          reached.add(current);
          for (const other of neighbors.get(current)) {
            if (!reached.has(other)) traversal.push(other);
          }
        }
        if (reached.size !== ids.size) errors.push("circuit.disconnected_components");
        const queue = [...ids].filter(id => incoming.get(id) === 0);
        let visited = 0;
        for (let index = 0; index < queue.length; index += 1) {
          const id = queue[index];
          visited += 1;
          for (const next of adjacency.get(id)) {
            incoming.set(next, incoming.get(next) - 1);
            if (incoming.get(next) === 0) queue.push(next);
          }
        }
        if (visited !== ids.size) errors.push("circuit.cycle");
      }
    }
  }

  const evaluationOK = objectWithKeys(artifact.evaluation, [
    "baselineLoss", "circuitLoss", "ablatedLoss", "sampleCount", "holdout", "ablation"
  ], "evaluation", errors);
  if (evaluationOK && (
    !finiteNonNegative(artifact.evaluation.baselineLoss) ||
    !finiteNonNegative(artifact.evaluation.circuitLoss) ||
    !finiteNonNegative(artifact.evaluation.ablatedLoss) ||
    !Number.isSafeInteger(artifact.evaluation.sampleCount) ||
    artifact.evaluation.sampleCount < 1 ||
    artifact.evaluation.sampleCount > 1_000_000 ||
    artifact.evaluation.holdout !== true ||
    artifact.evaluation.ablation !== "mean"
  )) errors.push("evaluation.invalid_metrics");

  const provenanceOK = objectWithKeys(artifact.provenance, [
    "runId", "implementationRevision", "evaluatedAt"
  ], "provenance", errors);
  if (provenanceOK && (
    !validIdentifier(artifact.provenance.runId) ||
    !validIdentifier(artifact.provenance.implementationRevision) ||
    typeof artifact.provenance.evaluatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(artifact.provenance.evaluatedAt) ||
    !Number.isFinite(Date.parse(artifact.provenance.evaluatedAt)) ||
    (Number.isFinite(Date.parse(artifact.provenance.evaluatedAt)) &&
      new Date(artifact.provenance.evaluatedAt).toISOString().slice(0, 19) !==
      artifact.provenance.evaluatedAt.slice(0, 19))
  )) errors.push("provenance.invalid_metadata");

  if (errors.length) return reject(errors);
  return Object.freeze({
    schemaVersion: CIRCUIT_ARTIFACT_VERSION,
    valid: true,
    status: "unverified-research-candidate",
    modelId: artifact.model.identifier,
    taskId: artifact.task.identifier,
    nodeCount,
    edgeCount,
    lossDeltaCircuitVsBaseline: artifact.evaluation.circuitLoss - artifact.evaluation.baselineLoss,
    lossDeltaAblatedVsCircuit: artifact.evaluation.ablatedLoss - artifact.evaluation.circuitLoss,
    sampleCount: artifact.evaluation.sampleCount,
    ablation: "mean",
    // Even a well-formed artifact cannot prove the run, causal faithfulness,
    // licensing, source admission, safety or a production deployment.
    mechanisticExplanationVerified: false,
    productionEligible: false,
    clinicalUsePermitted: false
  });
}
