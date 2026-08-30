import assert from "node:assert/strict";
import test from "node:test";
import { parseEpdRecord, parsePcaRecord, parsePrescriberPracticeRecord, parseScmdRecord, schemaContracts, scmdSchemaVariant, validateSchema } from "../src/index.ts";

const epdHeaders = [...schemaContracts.epd.required];
const epdValues: Readonly<Record<string, string>> = {
  YEAR_MONTH: "2026-06", REGIONAL_OFFICE_NAME: "NORTH EAST AND YORKSHIRE", REGIONAL_OFFICE_CODE: "Y63",
  ICB_NAME: "NHS WEST YORKSHIRE INTEGRATED CARE BOARD", ICB_CODE: "QWO", PCO_NAME: "NHS WEST YORKSHIRE ICB - 36J", PCO_CODE: "36J00",
  PRACTICE_NAME: "CLARENDON MEDICAL CENTRE", PRACTICE_CODE: "B83628", ADDRESS_1: "ROYAL STANDARD HOUSE", ADDRESS_2: "26 MANNINGHAM LANE",
  ADDRESS_3: "BRADFORD", ADDRESS_4: "", POSTCODE: "BD1 3DN", BNF_CHEMICAL_SUBSTANCE_CODE: "2003",
  BNF_CHEMICAL_SUBSTANCE: "Wound Management & Other Dressings", BNF_PRESENTATION_CODE: "20030100181",
  BNF_PRESENTATION_NAME: "Tegaderm Film dressing 12cm x 12cm", BNF_CHAPTER_PLUS_CODE: "20: Dressings", QUANTITY: "20.", ITEMS: "1",
  TOTAL_QUANTITY: "20.", ADQ_USAGE: "0.", NIC: "23.8", ACTUAL_COST: "21.4632", UNIDENTIFIED: "N", SNOMED_CODE: "694311000001104",
};

const pcaHeaders = [...schemaContracts.pca.required];
const pcaValues: Readonly<Record<string, string>> = {
  YEAR_MONTH: "202606", REGION_NAME: "NORTH WEST", REGION_CODE: "Y62", ICB_NAME: "NHS LANCASHIRE AND SOUTH CUMBRIA INTEGRATED CARE BOARD",
  ICB_CODE: "QE1", DISPENSER_ACCOUNT_TYPE: "English Dispensing Doctor", BNF_PRESENTATION_CODE: "0302000N0BBAYBA",
  BNF_PRESENTATION_NAME: "Flixotide 125micrograms/dose Evohaler", SNOMED_CODE: "398511000001105", SUPPLIER_NAME: "GlaxoSmithKline UK Ltd",
  UNIT_OF_MEASURE: "dose", GENERIC_BNF_EQUIVALENT_CODE: "0302000N0AABABA", GENERIC_BNF_EQUIVALENT_NAME: "Fluticasone 125micrograms/dose inhaler CFC free",
  BNF_CHEMICAL_SUBSTANCE_CODE: "0302000N0", BNF_CHEMICAL_SUBSTANCE: "Fluticasone propionate (Inhalation)", BNF_PARAGRAPH_CODE: "030200",
  BNF_PARAGRAPH: "Corticosteroids (respiratory)", BNF_SECTION_CODE: "0302", BNF_SECTION: "Corticosteroids (respiratory)", BNF_CHAPTER_CODE: "03",
  BNF_CHAPTER: "Respiratory System", PREP_CLASS: "03", PRESCRIBED_PREP_CLASS: "02", ITEMS: "3", TOTAL_QUANTITY: "3", NIC: "63.78",
  PHARMACY_ADVANCED_SERVICE: "Not applicable",
};

function row(headers: readonly string[], values: Readonly<Record<string, string>>): string[] {
  return headers.map((header) => values[header] ?? "");
}

test("EPD parser preserves organisation geography, source identifiers and all governed measures", () => {
  const record = parseEpdRecord(epdHeaders, row(epdHeaders, epdValues), 2);
  assert.equal(record.monthKey, "2026-06");
  assert.equal(record.sourceYearMonth, "2026-06");
  assert.equal(record.practiceCode, "B83628");
  assert.equal(record.postcode, "BD1 3DN");
  assert.equal(record.snomedCode, "694311000001104");
  assert.equal(typeof record.snomedCode, "string");
  assert.deepEqual([record.quantity, record.items, record.totalQuantity, record.adqUsage, record.nic, record.actualCost], [20, 1, 20, 0, 23.8, 21.4632]);
  assert.equal(record.unidentified, false);
});

test("EPD parser never turns an unidentified blank practice into a real practice", () => {
  const unidentified = { ...epdValues, PRACTICE_NAME: "", PRACTICE_CODE: "", UNIDENTIFIED: "Y" };
  const record = parseEpdRecord(epdHeaders, row(epdHeaders, unidentified), 3);
  assert.equal(record.practiceCode, null);
  assert.equal(record.practiceName, null);
  assert.equal(record.unidentified, true);
  assert.throws(() => parseEpdRecord(epdHeaders, row(epdHeaders, { ...unidentified, UNIDENTIFIED: "N" }), 4), /no practice identity/iu);
});

test("EPD parser accepts the publisher dash postcode only for explicitly unidentified rows", () => {
  const publisherSentinel = {
    ...epdValues,
    REGIONAL_OFFICE_NAME: "UNIDENTIFIED",
    REGIONAL_OFFICE_CODE: "-",
    ICB_NAME: "UNIDENTIFIED",
    ICB_CODE: "-",
    PCO_NAME: "UNIDENTIFIED",
    PCO_CODE: "-",
    PRACTICE_NAME: "UNIDENTIFIED DOCTORS",
    PRACTICE_CODE: "-",
    ADDRESS_1: "-",
    ADDRESS_2: "-",
    ADDRESS_3: "-",
    ADDRESS_4: "-",
    POSTCODE: "-",
    UNIDENTIFIED: "Y",
  };
  const record = parseEpdRecord(epdHeaders, row(epdHeaders, publisherSentinel), 5);
  assert.equal(record.postcodeRaw, "-");
  assert.equal(record.postcode, null);
  assert.equal(record.practiceCode, null);
  assert.equal(record.practiceName, null);
  assert.equal(record.icbCode, null);
  assert.equal(record.icbName, null);
  assert.deepEqual(record.address, [null, null, null, null]);
  assert.equal(record.unidentified, true);
  assert.throws(
    () => parseEpdRecord(epdHeaders, row(epdHeaders, { ...publisherSentinel, UNIDENTIFIED: "N" }), 6),
    /UK postcode is invalid/iu,
  );
});

test("EPD parser retains authoritative geography for an unidentified aggregate practice", () => {
  const regionalAggregate = {
    ...epdValues,
    PRACTICE_NAME: "UNIDENTIFIED DOCTORS",
    PRACTICE_CODE: "36J998",
    POSTCODE: "",
    UNIDENTIFIED: "Y",
  };
  const record = parseEpdRecord(epdHeaders, row(epdHeaders, regionalAggregate), 7);
  assert.equal(record.icbCode, "QWO");
  assert.equal(record.pcoCode, "36J00");
  assert.equal(record.practiceCode, "36J998");
  assert.equal(record.practiceName, null);
  assert.equal(record.unidentified, true);
});

test("PCA parser keeps community dispensing separate and normalises its compact month", () => {
  const record = parsePcaRecord(pcaHeaders, row(pcaHeaders, pcaValues), 2);
  assert.equal(record.monthKey, "2026-06");
  assert.equal(record.snomedCode, "398511000001105");
  assert.equal(typeof record.snomedCode, "string");
  assert.equal(record.supplierName, "GlaxoSmithKline UK Ltd");
  assert.deepEqual([record.items, record.totalQuantity, record.nic], [3, 3, 63.78]);
  assert.equal("actualCost" in record, false);
});

test("SCMD maps both the pre-change and announced post-July-2026 contracts", () => {
  const previousHeaders = [...schemaContracts.scmdBeforeJuly2026.required];
  const previous = parseScmdRecord(previousHeaders, row(previousHeaders, {
    YEAR_MONTH: "2026-06", ODS_CODE: "R1A", VMP_SNOMED_CODE: "123456789", VMP_PRODUCT_NAME: "Governed example",
    UNIT_OF_MEASURE_IDENTIFIER: "258682000", UNIT_OF_MEASURE_NAME: "milligram", TOTAL_QUANITY_IN_VMP_UNIT: "25", INDICATIVE_COST: "12.40",
  }), 2);
  assert.equal(scmdSchemaVariant(previousHeaders), "pre-july-2026");
  assert.equal(previous.quantity, 25);
  assert.equal(previous.vmpSnomedCode, "123456789");

  const currentHeaders = [...schemaContracts.scmdFromJuly2026.required, ...(schemaContracts.scmdFromJuly2026.optional ?? [])];
  const current = parseScmdRecord(currentHeaders, row(currentHeaders, {
    YEAR_MONTH: "2026-07", ODS_CODE: "R1A", VMP_SNOMED_CODE: "123456789", VMP_PRODUCT_NAME: "Governed example",
    VMP_UDFS_UNIT_OF_MEASURE_IDENTIFIER: "258682000", VMP_UDFS_UNIT_OF_MEASURE_NAME: "milligram",
    TOTAL_QUANTITY_IN_VMP_UDFS_UNIT_OF_MEASURE: "25", VMP_UNIT_DOSE_UNIT_OF_MEASURE_IDENTIFIER: "258682000",
    VMP_UNIT_DOSE_UNIT_OF_MEASURE_NAME: "milligram", TOTAL_QUANTITY_IN_VMP_UNIT_DOSE_UNIT_OF_MEASURE: "25", INDICATIVE_COST: "12.40",
  }), 2);
  assert.equal(scmdSchemaVariant(currentHeaders), "announced-july-2026");
  assert.equal(current.unitDoseQuantity, 25);
});

test("schema drift remains a controlled review state", () => {
  const result = validateSchema(schemaContracts.epd, epdHeaders.filter((header) => header !== "SNOMED_CODE"));
  assert.equal(result.status, "schema_review_required");
  assert.deepEqual(result.missingColumns, ["SNOMED_CODE"]);
  assert.throws(() => parseEpdRecord(epdHeaders, row(epdHeaders, { ...epdValues, SNOMED_CODE: "1.2345E+17" }), 2), /invalid SNOMED_CODE/iu);
});

test("Prescriber Details creates a practice master record without retaining clinician identity", () => {
  const headers = [...schemaContracts.prescriber.required];
  const values: Readonly<Record<string, string>> = {
    PROVIDER_SICBL_CODE: "00L00", PROVIDER_SICBL_NAME: "00L - NORTH EAST AND NORTH CUMBRIA ICB",
    PRACTICE_CODE: "A84002", PRACTICE_NAME: "Npc Rothbury", PRESCRIBER_CODE: "01C1121E",
    PRESCRIBER_TITLE: "MRS", PRESCRIBER_NAME: "Mcglade J", PRESCRIBER_TYPE: "NIP", DATE_JOINED: "01/04/2022",
    ADDRESS_FIELD1: "Whitton Bank Road", ADDRESS_FIELD2: "Rothbury", ADDRESS_FIELD3: "Morpeth",
    ADDRESS_FIELD4: "Northumberland", POSTCODE: "NE65 7RW", PRACTICE_TYPE: "GP",
  };
  const record = parsePrescriberPracticeRecord(headers, row(headers, values), 2);
  assert.equal(record.practiceCode, "A84002");
  assert.equal(record.providerSicblCode, "00L00");
  assert.equal(record.postcode, "NE65 7RW");
  assert.equal(record.postcodeKind, "uk");
  assert.equal("prescriberName" in record, false);
  assert.equal("prescriberCode" in record, false);
});

test("Prescriber Details preserves governed overseas BFPO identities without inventing UK geography", () => {
  const headers = [...schemaContracts.prescriber.required];
  const values: Readonly<Record<string, string>> = {
    PROVIDER_SICBL_CODE: "27MCP", PROVIDER_SICBL_NAME: "OVERSEAS", PRACTICE_CODE: "A91193",
    PRACTICE_NAME: "Sennelager Med Ctr", PRESCRIBER_CODE: "690765", PRESCRIBER_TITLE: "Dr",
    PRESCRIBER_NAME: "Source clinician excluded from output", PRESCRIBER_TYPE: "GP", DATE_JOINED: "01/06/2026",
    ADDRESS_FIELD1: "Sennelager Med Ctr", ADDRESS_FIELD2: "", ADDRESS_FIELD3: "", ADDRESS_FIELD4: "Sennelager",
    POSTCODE: "BFP O16", PRACTICE_TYPE: "OTHER",
  };
  const record = parsePrescriberPracticeRecord(headers, row(headers, values), 2);
  assert.equal(record.postcode, "BFPO 16");
  assert.equal(record.postcodeKind, "bfpo");
  assert.equal("prescriberName" in record, false);
});
