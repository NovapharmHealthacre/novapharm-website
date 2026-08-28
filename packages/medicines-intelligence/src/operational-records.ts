import { normalisePostcode } from "./geography.ts";
import { sourceIdentifier, sourceMonth, sourceNumber, sourceRow, sourceText } from "./source-records.ts";

function address(row: ReadonlyMap<string, string>, fields: readonly string[], rowNumber: number, source: string): readonly (string | null)[] {
  return Object.freeze(fields.map((field) => sourceText(row, field, rowNumber, source, { maximum: 300 })));
}

function integer(value: number | null, rowNumber: number, source: string, field: string): number {
  if (value === null || !Number.isSafeInteger(value)) throw new Error(`${source} row ${rowNumber} has a non-integer ${field}.`);
  return value;
}

function sourceFlag(row: ReadonlyMap<string, string>, field: string, rowNumber: number, source: string): boolean {
  const value = sourceText(row, field, rowNumber, source, { maximum: 1, required: true });
  if (value !== "Y" && value !== "N") throw new Error(`${source} row ${rowNumber} has an invalid ${field}.`);
  return value === "Y";
}

function compactDate(value: string, rowNumber: number, source: string, field: string): string {
  const match = /^(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/u.exec(value);
  if (!match) throw new Error(`${source} row ${rowNumber} has an invalid ${field}.`);
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export interface ContractorRecord {
  readonly monthKey: string;
  readonly contractorCode: string;
  readonly contractorName: string;
  readonly tradingName: string | null;
  readonly postcode: string;
  readonly address: readonly (string | null)[];
  readonly phone: string | null;
  readonly startDate: string;
  readonly pharmacyType: string;
  readonly contractorType: string;
  readonly dispenserAccountType: string;
  readonly icbCode: string;
  readonly icbName: string;
  readonly flags: Readonly<Record<string, boolean>>;
}

export function parseContractorRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): ContractorRecord {
  const source = "NHSBSA Contractor Details";
  const row = sourceRow(headers, cells, rowNumber, source);
  const month = sourceMonth(row, "YEAR_MONTH", rowNumber, source);
  return Object.freeze({
    monthKey: month.monthKey, contractorCode: sourceIdentifier(row, "CONTRACTOR_CODE", rowNumber, source, { required: true }) as string,
    contractorName: sourceText(row, "CONTRACTOR_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    tradingName: sourceText(row, "TRADING_NAME", rowNumber, source, { maximum: 300 }),
    postcode: normalisePostcode(sourceText(row, "POST_CODE", rowNumber, source, { maximum: 16, required: true }) as string),
    address: address(row, ["ADDRESS_FIELD1", "ADDRESS_FIELD2", "ADDRESS_FIELD3", "ADDRESS_FIELD4"], rowNumber, source),
    phone: sourceText(row, "PHONE_NUMBER", rowNumber, source, { maximum: 60 }),
    startDate: compactDate(sourceText(row, "START_DATE", rowNumber, source, { maximum: 8, required: true }) as string, rowNumber, source, "START_DATE"),
    pharmacyType: sourceText(row, "PHARMACY_TYPE", rowNumber, source, { maximum: 100, required: true }) as string,
    contractorType: sourceText(row, "CONTRACTOR_TYPE", rowNumber, source, { maximum: 200, required: true }) as string,
    dispenserAccountType: sourceText(row, "DISPENSER_ACCOUNT_TYPE", rowNumber, source, { maximum: 200, required: true }) as string,
    icbCode: sourceIdentifier(row, "ICB_CODE", rowNumber, source, { required: true }) as string,
    icbName: sourceText(row, "ICB_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    flags: Object.freeze({ privateContractor: sourceFlag(row, "PRIVATE_CONTRACTOR", rowNumber, source), distanceSelling: sourceFlag(row, "DISTANCE_SELLING_CONTRACTOR", rowNumber, source), hundredHour: sourceFlag(row, "100_HOUR_PHARMACY_CONTRACTOR", rowNumber, source), outOfHours: sourceFlag(row, "OUT_OF_HRS_DISP_CONTRACTOR", rowNumber, source), localPharmaceuticalService: sourceFlag(row, "LPS_CONTRACTOR", rowNumber, source) }),
  });
}

export interface PharmacyActivityRecord {
  readonly monthKey: string;
  readonly contractorCode: string;
  readonly contractorName: string;
  readonly postcode: string;
  readonly contentGroup: string;
  readonly activity: string;
  readonly value: number;
  readonly icbCode: string;
}

export function parsePharmacyActivityRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): PharmacyActivityRecord {
  const source = "NHSBSA Pharmacy and appliance contractor dispensing data";
  const row = sourceRow(headers, cells, rowNumber, source);
  return Object.freeze({
    monthKey: sourceMonth(row, "YEAR_MONTH", rowNumber, source).monthKey,
    contractorCode: sourceIdentifier(row, "CONTRACTOR_CODE", rowNumber, source, { required: true }) as string,
    contractorName: sourceText(row, "CONTRACTOR_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    postcode: normalisePostcode(sourceText(row, "POSTCODE", rowNumber, source, { maximum: 16, required: true }) as string),
    contentGroup: sourceText(row, "CONTENT_GROUP", rowNumber, source, { maximum: 150, required: true }) as string,
    activity: sourceText(row, "CONTENT", rowNumber, source, { maximum: 200, required: true }) as string,
    value: sourceNumber(row, "VALUE", rowNumber, source, { required: true }) as number,
    icbCode: sourceIdentifier(row, "ICB_CODE", rowNumber, source, { required: true }) as string,
  });
}

export interface PracticeDispensingFlowRecord {
  readonly monthKey: string;
  readonly practiceCode: string;
  readonly practiceName: string;
  readonly practicePostcode: string;
  readonly contractorCode: string;
  readonly contractorName: string;
  readonly contractorPostcode: string;
  readonly items: number;
  readonly epsItems: number;
}

export function parsePracticeDispensingFlowRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): PracticeDispensingFlowRecord {
  const source = "NHSBSA Dispensing Practices dispensing data";
  const row = sourceRow(headers, cells, rowNumber, source);
  const items = integer(sourceNumber(row, "NUMBER_OF_ITEMS", rowNumber, source, { required: true }), rowNumber, source, "NUMBER_OF_ITEMS");
  const epsItems = integer(sourceNumber(row, "NUMBER_OF_EPS_ITEMS", rowNumber, source, { required: true }), rowNumber, source, "NUMBER_OF_EPS_ITEMS");
  if (epsItems > items) throw new Error(`${source} row ${rowNumber} has more EPS items than total items.`);
  return Object.freeze({
    monthKey: sourceMonth(row, "YEAR_MONTH", rowNumber, source).monthKey,
    practiceCode: sourceIdentifier(row, "PRACTICE_CODE", rowNumber, source, { required: true }) as string,
    practiceName: sourceText(row, "PRACTICE_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    practicePostcode: normalisePostcode(sourceText(row, "PRACTICE_POSTCODE", rowNumber, source, { maximum: 16, required: true }) as string),
    contractorCode: sourceIdentifier(row, "CONTRACTOR_CODE", rowNumber, source, { required: true }) as string,
    contractorName: sourceText(row, "CONTRACTOR_NAME", rowNumber, source, { maximum: 300, required: true }) as string,
    contractorPostcode: normalisePostcode(sourceText(row, "CONTRACTOR_POSTCODE", rowNumber, source, { maximum: 16, required: true }) as string),
    items, epsItems,
  });
}

export interface PrescribedDispensedFlowRecord {
  readonly monthKey: string;
  readonly prescriberCode: string;
  readonly prescriberPostcode: string;
  readonly prescriberLocationType: string;
  readonly prescriberType: string;
  readonly dispenserCode: string;
  readonly dispenserPostcode: string;
  readonly dispenserLocationType: string;
  readonly paidItems: number;
}

export function parsePhsPrescribedDispensedRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): PrescribedDispensedFlowRecord {
  const source = "Public Health Scotland Prescribed and Dispensed";
  const row = sourceRow(headers, cells, rowNumber, source);
  return Object.freeze({
    monthKey: sourceMonth(row, "PaidDateMonth", rowNumber, source).monthKey,
    prescriberCode: sourceIdentifier(row, "PrescriberLocation", rowNumber, source, { required: true }) as string,
    prescriberPostcode: normalisePostcode(sourceText(row, "PrescriberLocationPostcode", rowNumber, source, { maximum: 16, required: true }) as string),
    prescriberLocationType: sourceText(row, "PrescriberLocationType", rowNumber, source, { maximum: 150, required: true }) as string,
    prescriberType: sourceText(row, "PrescriberType", rowNumber, source, { maximum: 150, required: true }) as string,
    dispenserCode: sourceIdentifier(row, "DispenserLocation", rowNumber, source, { required: true }) as string,
    dispenserPostcode: normalisePostcode(sourceText(row, "DispenserLocationPostcode", rowNumber, source, { maximum: 16, required: true }) as string),
    dispenserLocationType: sourceText(row, "DispenserLocationType", rowNumber, source, { maximum: 150, required: true }) as string,
    paidItems: integer(sourceNumber(row, "NumberOfPaidItems", rowNumber, source, { required: true }), rowNumber, source, "NumberOfPaidItems"),
  });
}

export function parseNiDispensingByContractorRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): PracticeDispensingFlowRecord {
  const source = "BSO Northern Ireland Dispensing by Contractor";
  const row = sourceRow(headers, cells, rowNumber, source);
  const year = sourceText(row, "Year", rowNumber, source, { maximum: 4, required: true }) as string;
  const monthValue = sourceText(row, "Month", rowNumber, source, { maximum: 2, required: true }) as string;
  const month = monthValue.padStart(2, "0");
  if (!/^20\d{2}$/u.test(year) || !/^(?:0[1-9]|1[0-2])$/u.test(month)) throw new Error(`${source} row ${rowNumber} has an invalid Year or Month.`);
  return Object.freeze({
    monthKey: `${year}-${month}`,
    practiceCode: sourceIdentifier(row, "Practice", rowNumber, source, { required: true }) as string,
    practiceName: sourceText(row, "Practice Name", rowNumber, source, { maximum: 300, required: true }) as string,
    practicePostcode: normalisePostcode(sourceText(row, "Postcode", rowNumber, source, { maximum: 16, required: true }) as string),
    contractorCode: sourceIdentifier(row, "Chemist", rowNumber, source, { required: true }) as string,
    contractorName: sourceText(row, "Contractor Name", rowNumber, source, { maximum: 300, required: true }) as string,
    contractorPostcode: normalisePostcode(sourceText(row, "Contractor Postcode", rowNumber, source, { maximum: 16, required: true }) as string),
    items: integer(sourceNumber(row, "Number of Items", rowNumber, source, { required: true }), rowNumber, source, "Number of Items"),
    epsItems: 0,
  });
}
