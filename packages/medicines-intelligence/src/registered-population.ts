import { normalisePostcode } from "./geography.ts";
import { sourceIdentifier, sourceNumber, sourceRow, sourceText } from "./source-records.ts";

export type RegisteredPopulationSex = "ALL" | "FEMALE" | "MALE";

export interface RegisteredPracticeTotalRecord {
  readonly extractDate: string;
  readonly monthKey: string;
  readonly subIcbLocationCode: string;
  readonly onsSubIcbLocationCode: string;
  readonly practiceCode: string;
  readonly postcode: string;
  readonly population: number;
}

export interface RegisteredPopulationBandRecord {
  readonly extractDate: string;
  readonly monthKey: string;
  readonly organisationType: "Comm Region" | "ICB" | "SUB_ICB_LOCATION_CODE" | "PCN" | "GP";
  readonly organisationCode: string;
  readonly onsCode: string | null;
  readonly postcode: string | null;
  readonly sex: RegisteredPopulationSex;
  readonly ageBand: string;
  readonly population: number;
}

export interface RegisteredPracticeMappingRecord {
  readonly extractDate: string;
  readonly monthKey: string;
  readonly practiceCode: string;
  readonly practiceName: string;
  readonly practicePostcode: string;
  readonly pcnCode: string | null;
  readonly pcnName: string | null;
  readonly onsSubIcbLocationCode: string;
  readonly subIcbLocationCode: string;
  readonly subIcbLocationName: string;
  readonly onsIcbCode: string;
  readonly icbCode: string;
  readonly icbName: string;
  readonly onsCommissioningRegionCode: string;
  readonly commissioningRegionCode: string;
  readonly commissioningRegionName: string;
  readonly gpSystemSupplier: string | null;
}

const monthNames: Readonly<Record<string, string>> = Object.freeze({ Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" });

function publication(row: ReadonlyMap<string, string>, rowNumber: number, source: string): void {
  if (sourceText(row, "PUBLICATION", rowNumber, source, { required: true }) !== "GP_PRAC_PAT_LIST") throw new Error(`${source} row ${rowNumber} has an unsupported publication identity.`);
}

function extractDate(value: string, rowNumber: number, source: string): Readonly<{ date: string; month: string }> {
  const iso = /^(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u.exec(value);
  if (iso) return Object.freeze({ date: value, month: `${iso[1]}-${iso[2]}` });
  const named = /^(0[1-9]|[12]\d|3[01])([A-Z][a-z]{2})(20\d{2})$/u.exec(value);
  const month = named ? monthNames[named[2] ?? ""] : undefined;
  if (!named || !month) throw new Error(`${source} row ${rowNumber} has an invalid EXTRACT_DATE.`);
  return Object.freeze({ date: `${named[3]}-${month}-${named[1]}`, month: `${named[3]}-${month}` });
}

function nonnegativeInteger(value: number | null, rowNumber: number, source: string, field: string): number {
  if (value === null || !Number.isSafeInteger(value)) throw new Error(`${source} row ${rowNumber} has a non-integer ${field}.`);
  return value;
}

function populationSex(value: string, rowNumber: number, source: string): RegisteredPopulationSex {
  if (value !== "ALL" && value !== "FEMALE" && value !== "MALE") throw new Error(`${source} row ${rowNumber} has an unsupported SEX.`);
  return value;
}

export function parseRegisteredPracticeTotalRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): RegisteredPracticeTotalRecord {
  const source = "Patients Registered at a GP Practice totals";
  const row = sourceRow(headers, cells, rowNumber, source);
  publication(row, rowNumber, source);
  if (sourceText(row, "TYPE", rowNumber, source, { required: true }) !== "GP") throw new Error(`${source} row ${rowNumber} is not a GP-practice total.`);
  if (sourceText(row, "SEX", rowNumber, source, { required: true }) !== "ALL" || sourceText(row, "AGE", rowNumber, source, { required: true }) !== "ALL") throw new Error(`${source} row ${rowNumber} is not an all-persons total.`);
  const date = extractDate(sourceText(row, "EXTRACT_DATE", rowNumber, source, { required: true }) as string, rowNumber, source);
  return Object.freeze({
    extractDate: date.date, monthKey: date.month,
    subIcbLocationCode: sourceIdentifier(row, "SUB_ICB_LOCATION_CODE", rowNumber, source, { required: true }) as string,
    onsSubIcbLocationCode: sourceIdentifier(row, "ONS_SUB_ICB_LOCATION_CODE", rowNumber, source, { required: true }) as string,
    practiceCode: sourceIdentifier(row, "CODE", rowNumber, source, { required: true }) as string,
    postcode: normalisePostcode(sourceText(row, "POSTCODE", rowNumber, source, { maximum: 16, required: true }) as string),
    population: nonnegativeInteger(sourceNumber(row, "NUMBER_OF_PATIENTS", rowNumber, source, { required: true }), rowNumber, source, "NUMBER_OF_PATIENTS"),
  });
}

export function parseRegisteredPopulationBandRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): RegisteredPopulationBandRecord {
  const source = "Patients Registered at a GP Practice age bands";
  const row = sourceRow(headers, cells, rowNumber, source);
  publication(row, rowNumber, source);
  const date = extractDate(sourceText(row, "EXTRACT_DATE", rowNumber, source, { required: true }) as string, rowNumber, source);
  const organisationType = sourceText(row, "ORG_TYPE", rowNumber, source, { maximum: 40, required: true });
  if (organisationType !== "Comm Region" && organisationType !== "ICB" && organisationType !== "SUB_ICB_LOCATION_CODE" && organisationType !== "PCN" && organisationType !== "GP") throw new Error(`${source} row ${rowNumber} has an unsupported ORG_TYPE.`);
  const ageBand = sourceText(row, "AGE_GROUP_5", rowNumber, source, { maximum: 10, required: true }) as string;
  if (ageBand !== "ALL" && !/^(?:[0-9]{1,2}_[0-9]{1,2}|95\+)$/u.test(ageBand)) throw new Error(`${source} row ${rowNumber} has an unsupported AGE_GROUP_5.`);
  const postcode = sourceText(row, "POSTCODE", rowNumber, source, { maximum: 16 });
  return Object.freeze({
    extractDate: date.date, monthKey: date.month, organisationType,
    organisationCode: sourceIdentifier(row, "ORG_CODE", rowNumber, source, { required: true }) as string,
    onsCode: sourceIdentifier(row, "ONS_CODE", rowNumber, source), postcode: postcode ? normalisePostcode(postcode) : null,
    sex: populationSex(sourceText(row, "SEX", rowNumber, source, { maximum: 10, required: true }) as string, rowNumber, source), ageBand,
    population: nonnegativeInteger(sourceNumber(row, "NUMBER_OF_PATIENTS", rowNumber, source, { required: true }), rowNumber, source, "NUMBER_OF_PATIENTS"),
  });
}

export function parseRegisteredPracticeMappingRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): RegisteredPracticeMappingRecord {
  const source = "Patients Registered at a GP Practice mapping";
  const row = sourceRow(headers, cells, rowNumber, source);
  publication(row, rowNumber, source);
  const date = extractDate(sourceText(row, "EXTRACT_DATE", rowNumber, source, { required: true }) as string, rowNumber, source);
  return Object.freeze({
    extractDate: date.date, monthKey: date.month,
    practiceCode: sourceIdentifier(row, "PRACTICE_CODE", rowNumber, source, { required: true }) as string,
    practiceName: sourceText(row, "PRACTICE_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    practicePostcode: normalisePostcode(sourceText(row, "PRACTICE_POSTCODE", rowNumber, source, { maximum: 16, required: true }) as string),
    pcnCode: sourceIdentifier(row, "PCN_CODE", rowNumber, source), pcnName: sourceText(row, "PCN_NAME", rowNumber, source, { maximum: 300 }),
    onsSubIcbLocationCode: sourceIdentifier(row, "ONS_SUB_ICB_LOCATION_CODE", rowNumber, source, { required: true }) as string,
    subIcbLocationCode: sourceIdentifier(row, "SUB_ICB_LOCATION_CODE", rowNumber, source, { required: true }) as string,
    subIcbLocationName: sourceText(row, "SUB_ICB_LOCATION_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    onsIcbCode: sourceIdentifier(row, "ONS_ICB_CODE", rowNumber, source, { required: true }) as string,
    icbCode: sourceIdentifier(row, "ICB_CODE", rowNumber, source, { required: true }) as string,
    icbName: sourceText(row, "ICB_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    onsCommissioningRegionCode: sourceIdentifier(row, "ONS_COMM_REGION_CODE", rowNumber, source, { required: true }) as string,
    commissioningRegionCode: sourceIdentifier(row, "COMM_REGION_CODE", rowNumber, source, { required: true }) as string,
    commissioningRegionName: sourceText(row, "COMM_REGION_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    gpSystemSupplier: sourceText(row, "SUPPLIER_NAME", rowNumber, source, { maximum: 200 }),
  });
}
