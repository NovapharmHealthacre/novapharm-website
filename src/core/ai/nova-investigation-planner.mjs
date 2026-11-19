/**
 * NOVA: deterministic, non-executing investigation plan derived from an already
 * authorised Medicine Investigation Passport. Internal planning contract only.
 *
 * SECURITY BOUNDARY: The passport is not an authorisation token or evidence
 * attestation. This function does not read a database, call a model or run tools.
 * A trusted server must independently check session, tenant, source rights,
 * accepted evidence, model approval and audit at the actual execution boundary.
 */
import { createHash } from "node:crypto";

const CONTRACT = "novapharm.intelligence.nova-investigation-plan.v1";
const PASSPORT = "novapharm.intelligence.investigation-passport.v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const MEDICINE = /^medicine-[a-f0-9]{32}$/u;
const PURPOSES = Object.freeze([
  "market_access", "supply_resilience", "regulatory_readiness", "portfolio_review"
]);
const LENSES = Object.freeze([
  "identity", "primary_care", "community_spend", "secondary_care", "regulatory",
  "supply", "pricing", "tenders", "geography", "forecast", "opportunity", "decision"
]);
const STATE = new Set([
  "identity_recorded_rights_unverified", "records_exist_not_yet_rights_verified",
  "no_accepted_records_in_this_snapshot", "not_assessed"
]);

const STEP_DEFINITIONS = Object.freeze([
  { id: "medicine_identity", lenses: ["identity"], toolBoundary: "medicine_identity_read",
    requiredProof: ["Canonical medicine identity and effective date", "Identity publisher rights and lineage"] },
  { id: "observed_market", lenses: ["primary_care", "community_spend", "secondary_care"],
    toolBoundary: "market_observations_read",
    requiredProof: ["Accepted source observations, not validation samples", "Matching units, source periods and compatible market definitions"] },
  { id: "regulatory_and_supply", lenses: ["regulatory", "supply", "pricing", "tenders"],
    toolBoundary: "regulatory_supply_read",
    requiredProof: ["Jurisdiction-specific source rights and effective dates", "Separate approvals, commercial availability and tender eligibility"] },
  { id: "geography_comparison", lenses: ["geography"], toolBoundary: "geography_comparison_read",
    requiredProof: ["Comparable geographies, population denominators and observation periods"] },
  { id: "scenario_forecasting", lenses: ["forecast"], toolBoundary: "approved_forecast_read",
    requiredProof: ["Accepted training history", "Versioned model, out-of-sample backtests and calibrated uncertainty intervals"] },
  { id: "hypothesis_review", lenses: ["opportunity"], toolBoundary: "evidence_comparison_read",
    requiredProof: ["Supporting and contradicting evidence", "Explicit commercial assumptions and unresolved alternatives"] },
  { id: "human_decision", lenses: ["decision"], toolBoundary: "human_approval_only",
    requiredProof: ["Complete evidence manifest and source-rights recheck", "Named human decision owner and durable approval"] }
]);

const HYPOTHESES = Object.freeze([
  { id: "H1", proposition: "Geographic demand is uneven enough to warrant investigation.",
    disconfirmingEvidence: "Comparable per-capita observations show no meaningful geographic difference.",
    lensIds: ["primary_care", "geography"] },
  { id: "H2", proposition: "A viable market-access gap may exist.",
    disconfirmingEvidence: "Verified authorisations, procurement constraints or competitor coverage close the proposed gap.",
    lensIds: ["regulatory", "tenders", "opportunity"] },
  { id: "H3", proposition: "Supply resilience might improve with a qualified alternative.",
    disconfirmingEvidence: "Quality, authorisation, supply or economics evidence makes the alternative non-viable.",
    lensIds: ["supply", "pricing"] },
  { id: "H4", proposition: "A proposed future scenario may be distinguishable from a baseline.",
    disconfirmingEvidence: "Out-of-sample tests or uncertainty intervals do not support a material difference.",
    lensIds: ["forecast"] }
]);

function reject() {
  return Object.assign(new Error("NOVA planning input was rejected."), {
    statusCode: 400, code: "nova_plan_input_rejected"
  });
}

function validatedLensMap(passport) {
  if (!Array.isArray(passport.lenses) || passport.lenses.length !== LENSES.length) throw reject();
  const ids = new Map();
  for (const lens of passport.lenses) {
    if (!lens || typeof lens !== "object" || !LENSES.includes(lens.id) || ids.has(lens.id) ||
        !STATE.has(lens.state) || lens.sourceRights !== "unverified" || lens.decisionUsable !== false) {
      throw reject();
    }
    ids.set(lens.id, lens.state);
  }
  if (LENSES.some(id => !ids.has(id))) throw reject();
  return ids;
}

/**
 * Generate a falsifiable research *plan*, never an AI answer or a permission.
 * The caller must already have created the passport from an authorised server
 * read. The result is always non-executable and decision-not-ready.
 */
export function buildNovaInvestigationPlan(passport, { purpose = "market_access", jurisdiction = "GB" } = {}) {
  if (!passport || typeof passport !== "object" || Array.isArray(passport) ||
      passport.contract !== PASSPORT || passport.status !== "investigation_only" ||
      passport.decisionReady !== false || passport.fingerprintIsSourceAttestation !== false ||
      !MEDICINE.test(passport.medicineId ?? "") ||
      !SHA256.test(passport.snapshotFingerprintSha256 ?? "") ||
      !PURPOSES.includes(purpose) || jurisdiction !== "GB") {
    throw reject();
  }
  const lensStates = validatedLensMap(passport);
  const steps = STEP_DEFINITIONS.map(step => ({
    id: step.id,
    type: "read_only_research_plan",
    toolBoundary: step.toolBoundary,
    lenses: step.lenses.map(id => ({ id, observedState: lensStates.get(id) })),
    requiredProof: [...step.requiredProof],
    status: "not_authorised_to_execute",
    modelInvocationAllowed: false,
    executionAuthorized: false
  }));
  const hypotheses = HYPOTHESES.map(item => ({
    id: item.id, proposition: item.proposition,
    disconfirmingEvidence: item.disconfirmingEvidence,
    lensIds: [...item.lensIds],
    epistemicStatus: "untested_hypothesis",
    evidenceAccepted: false
  }));
  // Hash only fixed, validated research-plan inputs; this is not a signature,
  // acceptance receipt or proof of source rights.
  const planFingerprintSha256 = createHash("sha256").update(JSON.stringify({
    contract: CONTRACT, medicineId: passport.medicineId,
    snapshotFingerprintSha256: passport.snapshotFingerprintSha256,
    purpose, jurisdiction,
    lensStates: LENSES.map(id => [id, lensStates.get(id)]),
    stepVersion: 1
  })).digest("hex");
  return {
    contract: CONTRACT,
    status: "planning_only",
    productionCertified: false,
    executionAuthorized: false,
    decisionReady: false,
    medicineId: passport.medicineId,
    jurisdiction, purpose,
    sourcePassportFingerprintSha256: passport.snapshotFingerprintSha256,
    planFingerprintSha256,
    fingerprintIsSourceAttestation: false,
    steps, hypotheses,
    safeguards: {
      noClinicalAdvice: true,
      noAutonomousTransactions: true,
      noModelOrToolCalls: true,
      noAuthorityInferredFromPassport: true,
      currentTenantAndSourceRightsChecksRequired: true,
      independentlyAcceptedEvidenceRequired: true,
      modelBacktestsRequiredBeforeForecastClaims: true,
      humanReviewRequired: true
    },
    limitations: [
      "This is a research plan, not a discovered market opportunity or clinical recommendation.",
      "No source licence, medicine fact, model validation, account entitlement or tenant permission has been independently verified.",
      "Execution needs a separate trusted server-side workflow with current authority, audit and controlled read-only tools."
    ]
  };
}
