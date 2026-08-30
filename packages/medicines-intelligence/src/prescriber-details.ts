import { normalisePostcode } from "./geography.ts";
import { sourceIdentifier, sourceRow, sourceText } from "./source-records.ts";

export interface PrescriberPracticeRecord {
  readonly providerSicblCode: string;
  readonly providerSicblName: string;
  readonly practiceCode: string;
  readonly practiceName: string;
  readonly practiceType: string | null;
  readonly address: readonly (string | null)[];
  readonly postcodeRaw: string;
  readonly postcode: string;
  readonly postcodeKind: "uk" | "bfpo";
}

function practicePostcode(value: string): Readonly<{ postcode: string; kind: "uk" | "bfpo" }> {
  try {
    return Object.freeze({ postcode: normalisePostcode(value), kind: "uk" });
  } catch (error) {
    const compact = value.normalize("NFKC").toUpperCase().replace(/\s+/gu, "");
    const bfpo = /^BFPO(\d{1,4})$/u.exec(compact);
    if (!bfpo) throw error;
    return Object.freeze({ postcode: `BFPO ${bfpo[1]}`, kind: "bfpo" });
  }
}

export function parsePrescriberPracticeRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): PrescriberPracticeRecord {
  const source = "Prescriber Details";
  const row = sourceRow(headers, cells, rowNumber, source);
  const postcodeRaw = sourceText(row, "POSTCODE", rowNumber, source, { maximum: 16, required: true }) as string;
  const normalisedPostcode = practicePostcode(postcodeRaw);
  return Object.freeze({
    providerSicblCode: sourceIdentifier(row, "PROVIDER_SICBL_CODE", rowNumber, source, { required: true }) as string,
    providerSicblName: sourceText(row, "PROVIDER_SICBL_NAME", rowNumber, source, { required: true }) as string,
    practiceCode: sourceIdentifier(row, "PRACTICE_CODE", rowNumber, source, { required: true }) as string,
    practiceName: sourceText(row, "PRACTICE_NAME", rowNumber, source, { required: true }) as string,
    practiceType: sourceText(row, "PRACTICE_TYPE", rowNumber, source, { maximum: 120 }),
    address: Object.freeze([1, 2, 3, 4].map((index) => sourceText(row, `ADDRESS_FIELD${index}`, rowNumber, source))),
    postcodeRaw,
    postcode: normalisedPostcode.postcode,
    postcodeKind: normalisedPostcode.kind,
  });
}
