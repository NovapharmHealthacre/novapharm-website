import { sourceIdentifier, sourceMonth, sourceNumber, sourceRow, sourceText } from "./source-records.ts";

export interface PcaRecord {
  readonly sourceYearMonth: string;
  readonly monthKey: string;
  readonly regionName: string | null;
  readonly regionCode: string | null;
  readonly icbName: string | null;
  readonly icbCode: string | null;
  readonly dispenserAccountType: string | null;
  readonly bnfPresentationCode: string | null;
  readonly bnfPresentationName: string | null;
  readonly snomedCode: string | null;
  readonly supplierName: string | null;
  readonly unitOfMeasure: string | null;
  readonly genericBnfEquivalentCode: string | null;
  readonly genericBnfEquivalentName: string | null;
  readonly bnfChemicalSubstanceCode: string | null;
  readonly bnfChemicalSubstance: string | null;
  readonly bnfParagraphCode: string | null;
  readonly bnfParagraph: string | null;
  readonly bnfSectionCode: string | null;
  readonly bnfSection: string | null;
  readonly bnfChapterCode: string | null;
  readonly bnfChapter: string | null;
  readonly prepClass: string | null;
  readonly prescribedPrepClass: string | null;
  readonly items: number;
  readonly totalQuantity: number;
  readonly nic: number;
  readonly pharmacyAdvancedService: string | null;
}

export function parsePcaRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): PcaRecord {
  const source = "PCA";
  const row = sourceRow(headers, cells, rowNumber, source);
  const month = sourceMonth(row, "YEAR_MONTH", rowNumber, source);
  return Object.freeze({
    sourceYearMonth: month.sourceValue,
    monthKey: month.monthKey,
    regionName: sourceText(row, "REGION_NAME", rowNumber, source),
    regionCode: sourceIdentifier(row, "REGION_CODE", rowNumber, source),
    icbName: sourceText(row, "ICB_NAME", rowNumber, source),
    icbCode: sourceIdentifier(row, "ICB_CODE", rowNumber, source),
    dispenserAccountType: sourceText(row, "DISPENSER_ACCOUNT_TYPE", rowNumber, source),
    bnfPresentationCode: sourceIdentifier(row, "BNF_PRESENTATION_CODE", rowNumber, source),
    bnfPresentationName: sourceText(row, "BNF_PRESENTATION_NAME", rowNumber, source),
    snomedCode: sourceIdentifier(row, "SNOMED_CODE", rowNumber, source, { maximum: 40 }),
    supplierName: sourceText(row, "SUPPLIER_NAME", rowNumber, source),
    unitOfMeasure: sourceText(row, "UNIT_OF_MEASURE", rowNumber, source),
    genericBnfEquivalentCode: sourceIdentifier(row, "GENERIC_BNF_EQUIVALENT_CODE", rowNumber, source),
    genericBnfEquivalentName: sourceText(row, "GENERIC_BNF_EQUIVALENT_NAME", rowNumber, source),
    bnfChemicalSubstanceCode: sourceIdentifier(row, "BNF_CHEMICAL_SUBSTANCE_CODE", rowNumber, source),
    bnfChemicalSubstance: sourceText(row, "BNF_CHEMICAL_SUBSTANCE", rowNumber, source),
    bnfParagraphCode: sourceIdentifier(row, "BNF_PARAGRAPH_CODE", rowNumber, source),
    bnfParagraph: sourceText(row, "BNF_PARAGRAPH", rowNumber, source),
    bnfSectionCode: sourceIdentifier(row, "BNF_SECTION_CODE", rowNumber, source),
    bnfSection: sourceText(row, "BNF_SECTION", rowNumber, source),
    bnfChapterCode: sourceIdentifier(row, "BNF_CHAPTER_CODE", rowNumber, source),
    bnfChapter: sourceText(row, "BNF_CHAPTER", rowNumber, source),
    prepClass: sourceText(row, "PREP_CLASS", rowNumber, source),
    prescribedPrepClass: sourceText(row, "PRESCRIBED_PREP_CLASS", rowNumber, source),
    items: sourceNumber(row, "ITEMS", rowNumber, source, { required: true }) as number,
    totalQuantity: sourceNumber(row, "TOTAL_QUANTITY", rowNumber, source, { required: true }) as number,
    nic: sourceNumber(row, "NIC", rowNumber, source, { required: true }) as number,
    pharmacyAdvancedService: sourceText(row, "PHARMACY_ADVANCED_SERVICE", rowNumber, source),
  } satisfies PcaRecord);
}
