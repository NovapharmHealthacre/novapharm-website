import assert from "node:assert/strict";
import test from "node:test";
import {
  parseContractorRecord,
  parseNiDispensingByContractorRecord,
  parsePharmacyActivityRecord,
  parsePhsPrescribedDispensedRecord,
  parsePracticeDispensingFlowRecord,
  parseRegisteredPopulationBandRecord,
  parseRegisteredPracticeMappingRecord,
  parseRegisteredPracticeTotalRecord,
  schemaContracts,
  validateSchema,
} from "../src/index.ts";

function row(headers: readonly string[], values: Readonly<Record<string, string>>): string[] {
  return headers.map((header) => values[header] ?? "");
}

test("current NHSBSA contractor, activity and practice-flow rows retain separate meanings", () => {
  const contractorHeaders = [...schemaContracts.contractor.required];
  const contractor = parseContractorRecord(contractorHeaders, row(contractorHeaders, {
    YEAR_MONTH: "202607", REGION_CODE: "ALD", REGION_NAME: "ALDERNEY", ICB_CODE: "50X", ICB_NAME: "ALDERNEY",
    START_DATE: "20060201", CONTRACTOR_CODE: "204405C", CONTRACTOR_NAME: "PAUL DURSTAN", TRADING_NAME: "BOARDMAN'S PHARMACY & PERFUMERY",
    ADDRESS_FIELD1: "38 VICTORIA STREET", ADDRESS_FIELD2: "ALDERNEY", POST_CODE: "GY9 3TA", PHONE_NUMBER: "01481 822126",
    PHARMACY_TYPE: "PHARMACY", CONTRACTOR_TYPE: "JAG PHARMACY - DRUG ACCOUNT", DISPENSER_ACCOUNT_TYPE: "Alderney Pharmacy Drug",
    PRIVATE_CONTRACTOR: "N", DISTANCE_SELLING_CONTRACTOR: "N", "100_HOUR_PHARMACY_CONTRACTOR": "N", OUT_OF_HRS_DISP_CONTRACTOR: "N", LPS_CONTRACTOR: "N",
  }), 2);
  assert.equal(contractor.monthKey, "2026-07");
  assert.equal(contractor.postcode, "GY9 3TA");
  assert.equal(contractor.flags["distanceSelling"], false);

  const activityHeaders = [...schemaContracts.pharmacyActivity.required];
  const activity = parsePharmacyActivityRecord(activityHeaders, row(activityHeaders, {
    YEAR_MONTH: "2026-04", ICB_CODE: "QOP", ICB_NAME: "GREATER MANCHESTER ICB", CONTRACTOR_CODE: "FA002",
    CONTRACTOR_NAME: "ROWLANDS PHARMACY", POSTCODE: "SK7 5LD", CONTENT_GROUP: "Prescription Count", CONTENT: "Items", VALUE: "11170",
  }), 2);
  assert.deepEqual([activity.monthKey, activity.activity, activity.value], ["2026-04", "Items", 11170]);

  const flowHeaders = [...schemaContracts.practiceDispensing.required];
  const flow = parsePracticeDispensingFlowRecord(flowHeaders, row(flowHeaders, {
    YEAR_MONTH: "2026-04", PRACTICE_CODE: "00L998", PRACTICE_NAME: "UNIDENTIFIED DOCTORS", PRACTICE_POSTCODE: "NE13 9BA",
    CONTRACTOR_CODE: "FEE96", CONTRACTOR_NAME: "BOOTS UK LIMITED", CONTRACTOR_POSTCODE: "NE24 1EY", NUMBER_OF_ITEMS: "1", NUMBER_OF_EPS_ITEMS: "1",
  }), 2);
  assert.deepEqual([flow.practiceCode, flow.contractorCode, flow.items, flow.epsItems], ["00L998", "FEE96", 1, 1]);
  assert.throws(() => parsePracticeDispensingFlowRecord(flowHeaders, row(flowHeaders, {
    YEAR_MONTH: "2026-04", PRACTICE_CODE: "A81001", PRACTICE_NAME: "Practice", PRACTICE_POSTCODE: "TS18 1HU",
    CONTRACTOR_CODE: "FEE96", CONTRACTOR_NAME: "Pharmacy", CONTRACTOR_POSTCODE: "NE24 1EY", NUMBER_OF_ITEMS: "1", NUMBER_OF_EPS_ITEMS: "2",
  }), 3), /more EPS items/iu);
});

test("Scottish and Northern Irish flow parsers never reinterpret paid items as sales", () => {
  const phsHeaders = [...schemaContracts.phsPrescribedDispensed.required];
  const phs = parsePhsPrescribedDispensedRecord(phsHeaders, row(phsHeaders, {
    PaidDateMonth: "202601", PrescriberLocation: "10002", PrescriberLocationPostcode: "DD2 5NH", PrescriberLocationType: "GP PRACTICE",
    PrescriberType: "GENERAL PRACTICE", DispenserLocation: "2029", DispenserLocationPostcode: "EH2 3AA", DispenserLocationType: "COMMUNITY PHARMACY", NumberOfPaidItems: "1",
  }), 2);
  assert.deepEqual([phs.monthKey, phs.prescriberCode, phs.dispenserCode, phs.paidItems], ["2026-01", "10002", "2029", 1]);
  assert.equal("sales" in phs, false);

  const niHeaders = [...schemaContracts.niDispensingByContractor.required];
  const ni = parseNiDispensingByContractorRecord(niHeaders, row(niHeaders, {
    Practice: "Z00001", "Practice Name": "Practice", Postcode: "BT1 1AA", Chemist: "C00001", "Contractor Name": "Contractor",
    "Contractor Postcode": "BT2 2BB", Year: "2026", Month: "6", "Number of Items": "42",
  }), 2);
  assert.deepEqual([ni.monthKey, ni.items, ni.epsItems], ["2026-06", 42, 0]);
  assert.equal("sales" in ni, false);
});

test("August 2026 registered-population contracts preserve totals, age bands and contemporaneous mapping", () => {
  const totalsHeaders = [...schemaContracts.registeredPracticeTotals.required];
  const total = parseRegisteredPracticeTotalRecord(totalsHeaders, row(totalsHeaders, {
    PUBLICATION: "GP_PRAC_PAT_LIST", EXTRACT_DATE: "2026-08-01", TYPE: "GP", SUB_ICB_LOCATION_CODE: "16C",
    ONS_SUB_ICB_LOCATION_CODE: "E38000247", CODE: "A81001", POSTCODE: "TS18 1HU", SEX: "ALL", AGE: "ALL", NUMBER_OF_PATIENTS: "3724",
  }), 2);
  assert.deepEqual([total.monthKey, total.practiceCode, total.population], ["2026-08", "A81001", 3724]);

  const bandHeaders = [...schemaContracts.registeredPopulationBands.required];
  const band = parseRegisteredPopulationBandRecord(bandHeaders, row(bandHeaders, {
    PUBLICATION: "GP_PRAC_PAT_LIST", EXTRACT_DATE: "2026-08-01", ORG_TYPE: "GP", ORG_CODE: "A81001",
    ONS_CODE: "", POSTCODE: "TS18 1HU", SEX: "FEMALE", AGE_GROUP_5: "0_4", NUMBER_OF_PATIENTS: "97",
  }), 2);
  assert.deepEqual([band.organisationType, band.sex, band.ageBand, band.population], ["GP", "FEMALE", "0_4", 97]);

  const mappingHeaders = [...schemaContracts.registeredPracticeMapping.required];
  const mapping = parseRegisteredPracticeMappingRecord(mappingHeaders, row(mappingHeaders, {
    PUBLICATION: "GP_PRAC_PAT_LIST", EXTRACT_DATE: "01Aug2026", PRACTICE_CODE: "A81001", PRACTICE_NAME: "THE DENSHAM SURGERY", PRACTICE_POSTCODE: "TS18 1HU",
    PCN_CODE: "U89141", PCN_NAME: "STOCKTON PCN", ONS_SUB_ICB_LOCATION_CODE: "E38000247", SUB_ICB_LOCATION_CODE: "16C", SUB_ICB_LOCATION_NAME: "NHS North East and North Cumbria ICB - 16C",
    ONS_ICB_CODE: "E54000050", ICB_CODE: "QHM", ICB_NAME: "NHS North East and North Cumbria Integrated Care Board",
    ONS_COMM_REGION_CODE: "E40000012", COMM_REGION_CODE: "Y63", COMM_REGION_NAME: "North East and Yorkshire", SUPPLIER_NAME: "TPP",
  }), 2);
  assert.deepEqual([mapping.extractDate, mapping.monthKey, mapping.pcnCode, mapping.icbCode, mapping.gpSystemSupplier], ["2026-08-01", "2026-08", "U89141", "QHM", "TPP"]);
  assert.equal(validateSchema(schemaContracts.registeredPracticeMapping, mappingHeaders).status, "exact");
});
