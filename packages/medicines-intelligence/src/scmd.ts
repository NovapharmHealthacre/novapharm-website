import { sourceIdentifier, sourceMonth, sourceNumber, sourceRow, sourceText } from "./source-records.ts";
import { schemaContracts, validateSchema } from "./schema-contracts.ts";

export interface ScmdRecord {
  readonly sourceYearMonth: string;
  readonly monthKey: string;
  readonly odsCode: string;
  readonly vmpSnomedCode: string;
  readonly vmpProductName: string;
  readonly unitOfMeasureIdentifier: string;
  readonly unitOfMeasureName: string;
  readonly quantity: number;
  readonly unitDoseIdentifier: string | null;
  readonly unitDoseName: string | null;
  readonly unitDoseQuantity: number | null;
  readonly indicativeCost: number;
  readonly schemaVariant: "pre-july-2026" | "announced-july-2026";
}

export function scmdSchemaVariant(headers: readonly string[]): ScmdRecord["schemaVariant"] {
  const current = validateSchema(schemaContracts.scmdFromJuly2026, headers);
  if (current.status !== "schema_review_required") return "announced-july-2026";
  const previous = validateSchema(schemaContracts.scmdBeforeJuly2026, headers);
  if (previous.status !== "schema_review_required") return "pre-july-2026";
  throw new Error(`SCMD schema requires review; missing current fields: ${current.missingColumns.join(", ")}; missing previous fields: ${previous.missingColumns.join(", ")}.`);
}

export function parseScmdRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): ScmdRecord {
  const source = "SCMD";
  const variant = scmdSchemaVariant(headers);
  const row = sourceRow(headers, cells, rowNumber, source);
  const month = sourceMonth(row, "YEAR_MONTH", rowNumber, source);
  const current = variant === "announced-july-2026";
  return Object.freeze({
    sourceYearMonth: month.sourceValue,
    monthKey: month.monthKey,
    odsCode: sourceIdentifier(row, "ODS_CODE", rowNumber, source, { required: true }) as string,
    vmpSnomedCode: sourceIdentifier(row, "VMP_SNOMED_CODE", rowNumber, source, { maximum: 40, required: true }) as string,
    vmpProductName: sourceText(row, "VMP_PRODUCT_NAME", rowNumber, source, { required: true }) as string,
    unitOfMeasureIdentifier: sourceIdentifier(row, current ? "VMP_UDFS_UNIT_OF_MEASURE_IDENTIFIER" : "UNIT_OF_MEASURE_IDENTIFIER", rowNumber, source, { required: true }) as string,
    unitOfMeasureName: sourceText(row, current ? "VMP_UDFS_UNIT_OF_MEASURE_NAME" : "UNIT_OF_MEASURE_NAME", rowNumber, source, { required: true }) as string,
    quantity: sourceNumber(row, current ? "TOTAL_QUANTITY_IN_VMP_UDFS_UNIT_OF_MEASURE" : "TOTAL_QUANITY_IN_VMP_UNIT", rowNumber, source, { required: true }) as number,
    unitDoseIdentifier: current ? sourceIdentifier(row, "VMP_UNIT_DOSE_UNIT_OF_MEASURE_IDENTIFIER", rowNumber, source) : null,
    unitDoseName: current ? sourceText(row, "VMP_UNIT_DOSE_UNIT_OF_MEASURE_NAME", rowNumber, source) : null,
    unitDoseQuantity: current ? sourceNumber(row, "TOTAL_QUANTITY_IN_VMP_UNIT_DOSE_UNIT_OF_MEASURE", rowNumber, source) : null,
    indicativeCost: sourceNumber(row, "INDICATIVE_COST", rowNumber, source, { required: true }) as number,
    schemaVariant: variant,
  });
}
