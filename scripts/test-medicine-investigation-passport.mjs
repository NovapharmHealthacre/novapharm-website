import assert from "node:assert/strict";
import test from "node:test";
import { buildMedicineInvestigationPassport } from "../src/core/medicine-investigation-passport.mjs";

const input = () => ({
  medicine: {
    medicineId: "medicine-0123456789abcdef0123456789abcdef",
    canonicalName: "Apixaban 5 mg tablets",
    sourceId: "nhsbsa.bnf-current",
    sourceLastSeenAt: "2026-07-30T12:00:00Z",
    supplierName: "Sensitive private commercial supplier"
  },
  analyticalAvailability: { epd: true, pca: false, scmd: false, forecast: true },
  generatedAt: "2026-11-11T00:00:00.000Z",
  patient_email: "must-never-appear@example.com"
});

test("one medicine gives twelve deterministic evidence and decision lenses", () => {
  const result = buildMedicineInvestigationPassport(input());
  assert.equal(result.contract, "novapharm.intelligence.investigation-passport.v1");
  assert.equal(result.lenses.length, 12);
  assert.equal(result.lenses[0].id, "identity");
  assert.equal(result.lenses.find(x => x.id === "primary_care").state, "records_exist_not_yet_rights_verified");
  assert.equal(result.lenses.find(x => x.id === "forecast").state, "records_exist_not_yet_rights_verified");
  assert.equal(result.lenses.find(x => x.id === "regulatory").state, "not_assessed");
  assert.equal(result.decisionReady, false);
  assert.equal(result.fingerprintIsSourceAttestation, false);
  assert.equal(result.snapshotFingerprintSha256.length, 64);
  assert.deepEqual(result, buildMedicineInvestigationPassport(input()));
});

test("no coverage never becomes an invented market, licence or forecast claim", () => {
  const sample = input();
  sample.analyticalAvailability = { epd: false, pca: false, scmd: false, forecast: false };
  const result = buildMedicineInvestigationPassport(sample);
  assert.ok(result.lenses.every(x => x.decisionUsable === false && x.sourceRights === "unverified"));
  assert.equal(result.lenses.find(x => x.id === "primary_care").state, "no_accepted_records_in_this_snapshot");
  assert.equal(result.lenses.find(x => x.id === "decision").state, "not_assessed");
  assert.notEqual(result.snapshotFingerprintSha256, buildMedicineInvestigationPassport(input()).snapshotFingerprintSha256);
});

test("private supplier, patient identifiers and unrelated fields are not projected", () => {
  const wire = JSON.stringify(buildMedicineInvestigationPassport(input()));
  assert.doesNotMatch(wire, /Sensitive private|patient_email|must-never-appear|supplierName/);
  assert.match(wire, /human approval/);
});

test("untrusted canonical source or invalid availability fails closed", () => {
  for (const change of [
    x => { x.medicine.medicineId = "other-id"; },
    x => { x.medicine.sourceId = "../private"; },
    x => { x.medicine.canonicalName = "<script>"; },
    x => { x.medicine.sourceLastSeenAt = "invalid"; },
    x => { x.analyticalAvailability.epd = "true"; },
    x => { delete x.analyticalAvailability.forecast; },
    x => { delete x.generatedAt; }
  ]) {
    const sample = input();
    change(sample);
    assert.throws(() => buildMedicineInvestigationPassport(sample), e => e.statusCode === 400);
  }
});
