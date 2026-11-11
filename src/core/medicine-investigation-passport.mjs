/**
 * NOVA / PANDORA: the first read-only Medicine Investigation Passport.
 *
 * This is an epistemic boundary, not an AI model, an accepted source-rights
 * decision, a recommendation engine, or a customer entitlement. It turns an
 * already-authorised identity detail into explicit known/unknown workspaces.
 * No demand, approval, safety, stock, pricing or forecast claim is fabricated.
 */
import { createHash } from "node:crypto";

const reject = () => Object.assign(new Error("Invalid medicine investigation input."), { statusCode: 400 });
const medicinePattern = /^medicine-[a-f0-9]{32}$/u;
const sourcePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const unsafeText = /[\u0000-\u001f\u007f<>]/u;
const workspaces = Object.freeze([
  { id: "identity", name: "Medicine identity", type: "observed_fact", state: "identity_recorded_rights_unverified", next: "Validate canonical match, effective date and publisher rights" },
  { id: "primary_care", name: "Primary care demand", type: "observed_fact", availabilityKey: "epd", next: "Validate NHSBSA EPD period, medicine match, geography, rights and denominator" },
  { id: "community_spend", name: "Community prescribing costs", type: "observed_fact", availabilityKey: "pca", next: "Validate NHSBSA PCA definitions, period, matching and rights" },
  { id: "secondary_care", name: "Secondary care utilisation", type: "observed_fact", availabilityKey: "scmd", next: "Accept the NHSBSA SCMD source, hospital coverage, method and rights" },
  { id: "regulatory", name: "Regulatory authorisations", type: "observed_fact", next: "Match dated official regulator records to the exact medicine and jurisdiction" },
  { id: "supply", name: "Supply and distribution", type: "observed_fact", next: "Connect authorised supplier, stock, GDP and logistics evidence" },
  { id: "pricing", name: "Pricing and reimbursement", type: "observed_fact", next: "Accept jurisdiction-specific price and reimbursement source licences" },
  { id: "tenders", name: "Tender intelligence", type: "observed_fact", next: "Connect dated official tender notices and eligible procurement rules" },
  { id: "geography", name: "Comparable markets and geography", type: "derived_metric", next: "Reconcile geographies, population, units and comparable source periods" },
  { id: "forecast", name: "Forecasting", type: "model_forecast", availabilityKey: "forecast", next: "Validate model version, training history, backtest and prediction intervals" },
  { id: "opportunity", name: "Commercial opportunity", type: "commercial_assumption", next: "Review accepted observations, assumptions, constraints and alternative explanations" },
  { id: "decision", name: "Decision workspace", type: "recommendation", next: "Require an authorised human decision and versioned evidence manifest" }
]);

function safeText(value, max) {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= max && !unsafeText.test(value) ? value.trim() : null;
}
function safeTime(value) {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > 64 || !Number.isFinite(Date.parse(value))) throw reject();
  return value;
}
function availability(detail) {
  const input = detail?.analyticalAvailability;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw reject();
  const out = {};
  for (const name of ["epd", "pca", "scmd", "forecast"]) {
    if (typeof input[name] !== "boolean") throw reject();
    out[name] = input[name];
  }
  return out;
}

export function buildMedicineInvestigationPassport(detail) {
  const medicine = detail?.medicine;
  if (!medicine || !medicinePattern.test(medicine.medicineId) ||
      !safeText(medicine.canonicalName, 300) ||
      !sourcePattern.test(medicine.sourceId ?? "")) throw reject();
  const observedAt = safeTime(medicine.sourceLastSeenAt ?? null);
  const assessedAt = safeTime(detail.generatedAt);
  if (!assessedAt) throw reject();
  const coverage = availability(detail);
  const lenses = workspaces.map(({ availabilityKey, ...item }) => {
    const available = availabilityKey ? coverage[availabilityKey] : null;
    return {
      ...item,
      state: item.id === "identity" ? item.state :
        available === true ? "records_exist_not_yet_rights_verified" :
        available === false ? "no_accepted_records_in_this_snapshot" : "not_assessed",
      sourceRights: "unverified",
      decisionUsable: false
    };
  });
  const digest = createHash("sha256").update(JSON.stringify([
    medicine.medicineId, medicine.sourceId, observedAt, assessedAt,
    coverage.epd, coverage.pca, coverage.scmd, coverage.forecast
  ])).digest("hex");
  return {
    contract: "novapharm.intelligence.investigation-passport.v1",
    status: "investigation_only",
    medicineId: medicine.medicineId,
    canonicalName: medicine.canonicalName.trim(),
    sourceId: medicine.sourceId,
    sourceLastSeenAt: observedAt,
    assessedAt,
    snapshotFingerprintSha256: digest,
    fingerprintIsSourceAttestation: false,
    decisionReady: false,
    evidenceClassification: [
      "observed_fact", "derived_metric", "model_forecast",
      "commercial_assumption", "recommendation"
    ],
    lenses,
    requiredBeforeDecision: [
      "Resolve the exact medicine and market/jurisdiction",
      "Accept publisher rights, dates, source versions and lineage for each used dataset",
      "Reconcile comparable metrics, boundaries, populations and reporting periods",
      "Prove model backtests and intervals before presenting any forecast as usable",
      "Run real-time tenant, purpose and source-rights checks at the access boundary",
      "Record a durable evidence manifest and authorised human approval"
    ],
    limitations: [
      "An indexed source or model artifact does not prove licensing, accuracy or decision readiness.",
      "No market figures, regulatory permissions, supply guarantees or patient-level conclusions are generated.",
      "This fingerprint detects changes to the identity/availability snapshot only; it is not signed provenance."
    ]
  };
}
