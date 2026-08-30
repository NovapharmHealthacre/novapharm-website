import { createHash } from "node:crypto";
import type { SchemaContractResult } from "./types.ts";

export interface SchemaContract {
  readonly source: string;
  readonly variant: string;
  readonly required: readonly string[];
  readonly optional?: readonly string[];
  readonly identifierColumns?: readonly string[];
}

const epd = ["YEAR_MONTH", "REGIONAL_OFFICE_NAME", "REGIONAL_OFFICE_CODE", "ICB_NAME", "ICB_CODE", "PCO_NAME", "PCO_CODE", "PRACTICE_NAME", "PRACTICE_CODE", "ADDRESS_1", "ADDRESS_2", "ADDRESS_3", "ADDRESS_4", "POSTCODE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_CHEMICAL_SUBSTANCE", "BNF_PRESENTATION_CODE", "BNF_PRESENTATION_NAME", "BNF_CHAPTER_PLUS_CODE", "QUANTITY", "ITEMS", "TOTAL_QUANTITY", "ADQ_USAGE", "NIC", "ACTUAL_COST", "UNIDENTIFIED", "SNOMED_CODE"] as const;
const pca = ["YEAR_MONTH", "REGION_NAME", "REGION_CODE", "ICB_NAME", "ICB_CODE", "DISPENSER_ACCOUNT_TYPE", "BNF_PRESENTATION_CODE", "BNF_PRESENTATION_NAME", "SNOMED_CODE", "SUPPLIER_NAME", "UNIT_OF_MEASURE", "GENERIC_BNF_EQUIVALENT_CODE", "GENERIC_BNF_EQUIVALENT_NAME", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_CHEMICAL_SUBSTANCE", "BNF_PARAGRAPH_CODE", "BNF_PARAGRAPH", "BNF_SECTION_CODE", "BNF_SECTION", "BNF_CHAPTER_CODE", "BNF_CHAPTER", "PREP_CLASS", "PRESCRIBED_PREP_CLASS", "ITEMS", "TOTAL_QUANTITY", "NIC", "PHARMACY_ADVANCED_SERVICE"] as const;
const bnf = ["YEAR_MONTH", "BNF_CHAPTER", "BNF_CHAPTER_CODE", "BNF_SECTION", "BNF_SECTION_CODE", "BNF_PARAGRAPH", "BNF_PARAGRAPH_CODE", "BNF_SUBPARAGRAPH", "BNF_SUBPARAGRAPH_CODE", "BNF_CHEMICAL_SUBSTANCE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_PRODUCT", "BNF_PRODUCT_CODE", "BNF_PRESENTATION", "BNF_PRESENTATION_CODE"] as const;
const bnfChanges = ["YEAR_MONTH_APPLICABLE", ...bnf.slice(1), "CHANGE_TYPE"] as const;

export const schemaContracts = Object.freeze({
  epd: Object.freeze({ source: "nhsbsa.epd", variant: "2026-current", required: epd, identifierColumns: ["REGIONAL_OFFICE_CODE", "ICB_CODE", "PCO_CODE", "PRACTICE_CODE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_PRESENTATION_CODE", "SNOMED_CODE"] }),
  pca: Object.freeze({ source: "nhsbsa.pca", variant: "2026-current", required: pca, identifierColumns: ["REGION_CODE", "ICB_CODE", "BNF_PRESENTATION_CODE", "SNOMED_CODE", "GENERIC_BNF_EQUIVALENT_CODE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_PARAGRAPH_CODE", "BNF_SECTION_CODE", "BNF_CHAPTER_CODE"] }),
  bnfCurrent: Object.freeze({ source: "nhsbsa.bnf-current", variant: "version-90", required: bnf, identifierColumns: ["BNF_CHAPTER_CODE", "BNF_SECTION_CODE", "BNF_PARAGRAPH_CODE", "BNF_SUBPARAGRAPH_CODE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_PRODUCT_CODE", "BNF_PRESENTATION_CODE"] }),
  bnfHistoric: Object.freeze({ source: "nhsbsa.bnf-historic", variant: "historic-catalogue", required: bnf, identifierColumns: ["BNF_CHAPTER_CODE", "BNF_SECTION_CODE", "BNF_PARAGRAPH_CODE", "BNF_SUBPARAGRAPH_CODE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_PRODUCT_CODE", "BNF_PRESENTATION_CODE"] }),
  bnfChanges: Object.freeze({ source: "nhsbsa.bnf-changes", variant: "cumulative-monthly-changes", required: bnfChanges, identifierColumns: ["BNF_CHAPTER_CODE", "BNF_SECTION_CODE", "BNF_PARAGRAPH_CODE", "BNF_SUBPARAGRAPH_CODE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_PRODUCT_CODE", "BNF_PRESENTATION_CODE"] }),
  scmdBeforeJuly2026: Object.freeze({ source: "nhsbsa.scmd-provisional", variant: "pre-july-2026", required: ["YEAR_MONTH", "ODS_CODE", "VMP_SNOMED_CODE", "VMP_PRODUCT_NAME", "UNIT_OF_MEASURE_IDENTIFIER", "UNIT_OF_MEASURE_NAME", "TOTAL_QUANITY_IN_VMP_UNIT", "INDICATIVE_COST"], identifierColumns: ["ODS_CODE", "VMP_SNOMED_CODE", "UNIT_OF_MEASURE_IDENTIFIER"] }),
  scmdFromJuly2026: Object.freeze({ source: "nhsbsa.scmd-provisional", variant: "announced-july-2026", required: ["YEAR_MONTH", "ODS_CODE", "VMP_SNOMED_CODE", "VMP_PRODUCT_NAME", "VMP_UDFS_UNIT_OF_MEASURE_IDENTIFIER", "VMP_UDFS_UNIT_OF_MEASURE_NAME", "TOTAL_QUANTITY_IN_VMP_UDFS_UNIT_OF_MEASURE", "VMP_UNIT_DOSE_UNIT_OF_MEASURE_NAME", "TOTAL_QUANTITY_IN_VMP_UNIT_DOSE_UNIT_OF_MEASURE", "INDICATIVE_COST"], optional: ["VMP_UNIT_DOSE_UNIT_OF_MEASURE_IDENTIFIER"], identifierColumns: ["ODS_CODE", "VMP_SNOMED_CODE", "VMP_UDFS_UNIT_OF_MEASURE_IDENTIFIER", "VMP_UNIT_DOSE_UNIT_OF_MEASURE_IDENTIFIER"] }),
  prescriber: Object.freeze({ source: "nhsbsa.prescriber-details", variant: "2026-current", required: ["PROVIDER_SICBL_CODE", "PROVIDER_SICBL_NAME", "PRACTICE_CODE", "PRACTICE_NAME", "PRESCRIBER_CODE", "PRESCRIBER_TITLE", "PRESCRIBER_NAME", "PRESCRIBER_TYPE", "DATE_JOINED", "ADDRESS_FIELD1", "ADDRESS_FIELD2", "ADDRESS_FIELD3", "ADDRESS_FIELD4", "POSTCODE", "PRACTICE_TYPE"], identifierColumns: ["PROVIDER_SICBL_CODE", "PRACTICE_CODE", "PRESCRIBER_CODE"] }),
  contractor: Object.freeze({ source: "nhsbsa.contractor-details", variant: "2026-current", required: ["YEAR_MONTH", "REGION_CODE", "REGION_NAME", "ICB_CODE", "ICB_NAME", "HWB_CODE", "HWB_NAME", "LPC_CODE", "LPC_NAME", "START_DATE", "CONTRACTOR_CODE", "CONTRACTOR_NAME", "TRADING_NAME", "ADDRESS_FIELD1", "ADDRESS_FIELD2", "ADDRESS_FIELD3", "ADDRESS_FIELD4", "POST_CODE", "PHONE_NUMBER", "PHARMACY_TYPE", "CONTRACTOR_TYPE", "DISPENSER_ACCOUNT_TYPE", "PRIVATE_CONTRACTOR", "DISTANCE_SELLING_CONTRACTOR", "100_HOUR_PHARMACY_CONTRACTOR", "OUT_OF_HRS_DISP_CONTRACTOR", "LPS_CONTRACTOR"], identifierColumns: ["REGION_CODE", "ICB_CODE", "HWB_CODE", "LPC_CODE", "CONTRACTOR_CODE"] }),
  pharmacyActivity: Object.freeze({ source: "nhsbsa.pharmacy-activity", variant: "2026-current", required: ["YEAR_MONTH", "ICB_CODE", "ICB_NAME", "HWB_CODE", "HWB_NAME", "LPC_CODE", "LPC_NAME", "PHARMACY_ACCOUNT_TYPE", "CONTRACTOR_CODE", "CONTRACTOR_NAME", "ADDRESS_1", "ADDRESS_2", "ADDRESS_3", "ADDRESS_4", "POSTCODE", "CONTENT_GROUP", "CONTENT", "VALUE"], identifierColumns: ["ICB_CODE", "HWB_CODE", "LPC_CODE", "CONTRACTOR_CODE"] }),
  practiceDispensing: Object.freeze({ source: "nhsbsa.practice-dispensing", variant: "2026-current", required: ["YEAR_MONTH", "PRACTICE_CODE", "PRACTICE_NAME", "PRACTICE_ADDRESS_1", "PRACTICE_ADDRESS_2", "PRACTICE_ADDRESS_3", "PRACTICE_ADDRESS_4", "PRACTICE_POSTCODE", "CONTRACTOR_CODE", "CONTRACTOR_NAME", "CONTRACTOR_ADDRESS_1", "CONTRACTOR_ADDRESS_2", "CONTRACTOR_ADDRESS_3", "CONTRACTOR_ADDRESS_4", "CONTRACTOR_POSTCODE", "NUMBER_OF_ITEMS", "NUMBER_OF_EPS_ITEMS"], identifierColumns: ["PRACTICE_CODE", "CONTRACTOR_CODE"] }),
  phsPrescribedDispensed: Object.freeze({ source: "phs.prescribed-dispensed", variant: "2026-quarterly", required: ["PaidDateMonth", "PrescriberLocation", "PrescriberLocationPostcode", "PrescriberLocationType", "PrescriberType", "DispenserLocation", "DispenserLocationPostcode", "DispenserLocationType", "NumberOfPaidItems"], identifierColumns: ["PrescriberLocation", "DispenserLocation"] }),
  niDispensingByContractor: Object.freeze({ source: "bso.dispensing-contractor", variant: "2026-monthly", required: ["Practice", "Practice Name", "Address 1", "Address 2", "Address 3", "Postcode", "Chemist", "Contractor Name", "Contractor Address Line 1", "Contractor Address Line 2", "Contractor Address Line 3", "Contractor Address Line 4", "Contractor Postcode", "Year", "Month", "Number of Items"], identifierColumns: ["Practice", "Chemist"] }),
  walesPracticePharmacyWorkbook: Object.freeze({ source: "nwssp.practice-pharmacy-flow", variant: "documented-four-sheet-workbook", required: ["Contractor Addresses", "Practice Addresses", "Pharmacy By Practice CCYYMM", "Practice By Pharmacy CCYYMM"] }),
  registeredPracticeTotals: Object.freeze({ source: "nhse.registered-patients", variant: "2026-monthly-practice-totals", required: ["PUBLICATION", "EXTRACT_DATE", "TYPE", "SUB_ICB_LOCATION_CODE", "ONS_SUB_ICB_LOCATION_CODE", "CODE", "POSTCODE", "SEX", "AGE", "NUMBER_OF_PATIENTS"], identifierColumns: ["SUB_ICB_LOCATION_CODE", "ONS_SUB_ICB_LOCATION_CODE", "CODE"] }),
  registeredPopulationBands: Object.freeze({ source: "nhse.registered-patients", variant: "2026-monthly-five-year-age-bands", required: ["PUBLICATION", "EXTRACT_DATE", "ORG_TYPE", "ORG_CODE", "ONS_CODE", "POSTCODE", "SEX", "AGE_GROUP_5", "NUMBER_OF_PATIENTS"], identifierColumns: ["ORG_CODE", "ONS_CODE"] }),
  registeredPracticeMapping: Object.freeze({ source: "nhse.registered-patients", variant: "2026-monthly-organisation-mapping", required: ["PUBLICATION", "EXTRACT_DATE", "PRACTICE_CODE", "PRACTICE_NAME", "PRACTICE_POSTCODE", "PCN_CODE", "PCN_NAME", "ONS_SUB_ICB_LOCATION_CODE", "SUB_ICB_LOCATION_CODE", "SUB_ICB_LOCATION_NAME", "ONS_ICB_CODE", "ICB_CODE", "ICB_NAME", "ONS_COMM_REGION_CODE", "COMM_REGION_CODE", "COMM_REGION_NAME", "SUPPLIER_NAME"], identifierColumns: ["PRACTICE_CODE", "PCN_CODE", "ONS_SUB_ICB_LOCATION_CODE", "SUB_ICB_LOCATION_CODE", "ONS_ICB_CODE", "ICB_CODE", "ONS_COMM_REGION_CODE", "COMM_REGION_CODE"] }),
} satisfies Readonly<Record<string, SchemaContract>>);

export function normaliseColumnName(value: string): string {
  return value.replace(/^\uFEFF/u, "").trim();
}

export function schemaFingerprint(columns: readonly string[]): string {
  return createHash("sha256").update([...new Set(columns.map(normaliseColumnName))].toSorted().join("\n")).digest("hex");
}

export function validateSchema(contract: SchemaContract, columns: readonly string[]): SchemaContractResult {
  const observed = [...new Set(columns.map(normaliseColumnName).filter(Boolean))];
  const observedSet = new Set(observed);
  const allowed = new Set([...contract.required, ...(contract.optional ?? [])]);
  const missing = contract.required.filter((column) => !observedSet.has(column));
  const unexpected = observed.filter((column) => !allowed.has(column));
  const status = missing.length ? "schema_review_required" : unexpected.length ? "compatible" : "exact";
  return Object.freeze({ source: contract.source, variant: contract.variant, status, requiredColumns: Object.freeze([...contract.required]), observedColumns: Object.freeze(observed), missingColumns: Object.freeze(missing), unexpectedColumns: Object.freeze(unexpected), fingerprint: schemaFingerprint(observed) });
}

export function extractCkanSchemaColumns(schema: unknown): readonly string[] {
  if (!schema) return Object.freeze([]);
  if (typeof schema === "object") {
    const fields = (schema as { fields?: unknown }).fields;
    if (!Array.isArray(fields)) return Object.freeze([]);
    return Object.freeze([...new Set(fields.flatMap((field) => {
      if (!field || typeof field !== "object") return [];
      const name = (field as { name?: unknown }).name;
      return typeof name === "string" && normaliseColumnName(name) ? [normaliseColumnName(name)] : [];
    }))]);
  }
  if (typeof schema !== "string") return Object.freeze([]);
  const fields = [...schema.matchAll(/(?:u)?["']name["']:\s*(?:u)?["']([^"']+)["']/gu)].map((match) => normaliseColumnName(match[1] ?? "")).filter(Boolean);
  return Object.freeze([...new Set(fields)]);
}

export function assertIdentifierStrings(contract: SchemaContract, fieldTypes: Readonly<Record<string, string>>): readonly string[] {
  return Object.freeze((contract.identifierColumns ?? []).filter((column) => fieldTypes[column] && !/string|text|varchar/iu.test(fieldTypes[column] ?? "")));
}
