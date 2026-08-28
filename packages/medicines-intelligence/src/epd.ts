import { normalisePostcode } from "./geography.ts";
import { sourceIdentifier, sourceMonth, sourceNumber, sourceRow, sourceText } from "./source-records.ts";

export interface EpdRecord {
  readonly sourceYearMonth: string;
  readonly monthKey: string;
  readonly regionalOfficeName: string | null;
  readonly regionalOfficeCode: string | null;
  readonly icbName: string | null;
  readonly icbCode: string | null;
  readonly pcoName: string | null;
  readonly pcoCode: string | null;
  readonly practiceName: string | null;
  readonly practiceCode: string | null;
  readonly address: readonly (string | null)[];
  readonly postcodeRaw: string | null;
  readonly postcode: string | null;
  readonly bnfChemicalSubstanceCode: string | null;
  readonly bnfChemicalSubstance: string | null;
  readonly bnfPresentationCode: string | null;
  readonly bnfPresentationName: string | null;
  readonly bnfChapterPlusCode: string | null;
  readonly snomedCode: string | null;
  readonly quantity: number;
  readonly items: number;
  readonly totalQuantity: number;
  readonly adqUsage: number;
  readonly nic: number;
  readonly actualCost: number;
  readonly unidentified: boolean;
}

const source = "EPD";

function unidentifiedValue(value: string | null, rowNumber: number): boolean {
  if (value === "Y") return true;
  if (value === "N") return false;
  throw new Error(`EPD row ${rowNumber} has invalid UNIDENTIFIED.`);
}

export function parseEpdRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): EpdRecord {
  const row = sourceRow(headers, cells, rowNumber, source);
  const month = sourceMonth(row, "YEAR_MONTH", rowNumber, source);
  const unidentified = unidentifiedValue(sourceText(row, "UNIDENTIFIED", rowNumber, source, { maximum: 1, required: true }), rowNumber);
  const postcodeRaw = sourceText(row, "POSTCODE", rowNumber, source, { maximum: 16 });
  const organisationText = (field: string): string | null => {
    const value = sourceText(row, field, rowNumber, source);
    return unidentified && (value === "-" || /^UNIDENTIFIED(?:\s+DOCTORS)?$/iu.test(value ?? "")) ? null : value;
  };
  const organisationIdentifier = (field: string): string | null => {
    const value = sourceIdentifier(row, field, rowNumber, source);
    return unidentified && value === "-" ? null : value;
  };
  const record = {
    sourceYearMonth: month.sourceValue,
    monthKey: month.monthKey,
    regionalOfficeName: organisationText("REGIONAL_OFFICE_NAME"),
    regionalOfficeCode: organisationIdentifier("REGIONAL_OFFICE_CODE"),
    icbName: organisationText("ICB_NAME"),
    icbCode: organisationIdentifier("ICB_CODE"),
    pcoName: organisationText("PCO_NAME"),
    pcoCode: organisationIdentifier("PCO_CODE"),
    practiceName: organisationText("PRACTICE_NAME"),
    practiceCode: organisationIdentifier("PRACTICE_CODE"),
    address: Object.freeze([1, 2, 3, 4].map((index) => organisationText(`ADDRESS_${index}`))),
    postcodeRaw,
    postcode: postcodeRaw && !(unidentified && postcodeRaw === "-") ? normalisePostcode(postcodeRaw) : null,
    bnfChemicalSubstanceCode: sourceIdentifier(row, "BNF_CHEMICAL_SUBSTANCE_CODE", rowNumber, source),
    bnfChemicalSubstance: sourceText(row, "BNF_CHEMICAL_SUBSTANCE", rowNumber, source),
    bnfPresentationCode: sourceIdentifier(row, "BNF_PRESENTATION_CODE", rowNumber, source),
    bnfPresentationName: sourceText(row, "BNF_PRESENTATION_NAME", rowNumber, source),
    bnfChapterPlusCode: sourceText(row, "BNF_CHAPTER_PLUS_CODE", rowNumber, source, { maximum: 120 }),
    snomedCode: sourceIdentifier(row, "SNOMED_CODE", rowNumber, source, { maximum: 40 }),
    quantity: sourceNumber(row, "QUANTITY", rowNumber, source, { required: true }) as number,
    items: sourceNumber(row, "ITEMS", rowNumber, source, { required: true }) as number,
    totalQuantity: sourceNumber(row, "TOTAL_QUANTITY", rowNumber, source, { required: true }) as number,
    adqUsage: sourceNumber(row, "ADQ_USAGE", rowNumber, source, { required: true }) as number,
    nic: sourceNumber(row, "NIC", rowNumber, source, { required: true }) as number,
    actualCost: sourceNumber(row, "ACTUAL_COST", rowNumber, source, { required: true }) as number,
    unidentified,
  } satisfies EpdRecord;
  if (!record.unidentified && (!record.practiceCode || record.practiceCode === "-" || !record.practiceName || /^UNIDENTIFIED/iu.test(record.practiceName))) {
    throw new Error(`EPD row ${rowNumber} has no practice identity and is not marked unidentified.`);
  }
  return Object.freeze(record);
}
