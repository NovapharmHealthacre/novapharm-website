export interface BnfCurrentRecord {
  readonly yearMonth: string;
  readonly chapter: string;
  readonly chapterCode: string;
  readonly section: string;
  readonly sectionCode: string;
  readonly paragraph: string;
  readonly paragraphCode: string;
  readonly subparagraph: string;
  readonly subparagraphCode: string;
  readonly chemicalSubstance: string;
  readonly chemicalSubstanceCode: string;
  readonly product: string;
  readonly productCode: string;
  readonly presentation: string;
  readonly presentationCode: string;
}

export interface BnfHierarchyNode {
  readonly code: string;
  readonly name: string;
  readonly level: number;
  readonly parentCode: string | null;
}

const fields = Object.freeze([
  ["YEAR_MONTH", "yearMonth", 7],
  ["BNF_CHAPTER", "chapter", 500],
  ["BNF_CHAPTER_CODE", "chapterCode", 2],
  ["BNF_SECTION", "section", 500],
  ["BNF_SECTION_CODE", "sectionCode", 4],
  ["BNF_PARAGRAPH", "paragraph", 500],
  ["BNF_PARAGRAPH_CODE", "paragraphCode", 6],
  ["BNF_SUBPARAGRAPH", "subparagraph", 500],
  ["BNF_SUBPARAGRAPH_CODE", "subparagraphCode", 7],
  ["BNF_CHEMICAL_SUBSTANCE", "chemicalSubstance", 500],
  ["BNF_CHEMICAL_SUBSTANCE_CODE", "chemicalSubstanceCode", 9],
  ["BNF_PRODUCT", "product", 500],
  ["BNF_PRODUCT_CODE", "productCode", 11],
  ["BNF_PRESENTATION", "presentation", 1_000],
  ["BNF_PRESENTATION_CODE", "presentationCode", 15],
] as const);

const allowedCodeLengths: Readonly<Record<string, ReadonlySet<number>>> = Object.freeze({
  chapterCode: new Set([2]),
  sectionCode: new Set([4]),
  paragraphCode: new Set([4, 6]),
  subparagraphCode: new Set([4, 7]),
  chemicalSubstanceCode: new Set([4, 9]),
  productCode: new Set([11]),
  presentationCode: new Set([11, 15]),
});

function cleanText(value: string, field: string, maximum: number, rowNumber: number): string {
  const result = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!result) throw new Error(`BNF row ${rowNumber} is missing ${field}.`);
  if (result.length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(result)) throw new Error(`BNF row ${rowNumber} has invalid ${field}.`);
  return result;
}

export function parseBnfCurrentRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): BnfCurrentRecord {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error("BNF source row number is invalid.");
  if (cells.length !== headers.length) throw new Error(`BNF row ${rowNumber} has ${cells.length} columns; ${headers.length} were expected.`);
  const index = new Map(headers.map((header, position) => [header, position]));
  const result: Record<string, string> = {};
  for (const [sourceField, targetField, maximum] of fields) {
    const position = index.get(sourceField);
    if (position === undefined) throw new Error(`BNF schema is missing ${sourceField}.`);
    result[targetField] = cleanText(cells[position] ?? "", sourceField, maximum, rowNumber);
  }
  if (!/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/u.test(result["yearMonth"] ?? "")) throw new Error(`BNF row ${rowNumber} has an invalid YEAR_MONTH.`);
  for (const [, targetField] of fields.filter(([, target]) => String(target).endsWith("Code"))) {
    const code = result[targetField] ?? "";
    const allowed = allowedCodeLengths[targetField];
    if (!/^[A-Z0-9]+$/iu.test(code) || !allowed?.has(code.length)) throw new Error(`BNF row ${rowNumber} has an invalid ${targetField}.`);
  }
  const chain = [result["chapterCode"], result["sectionCode"], result["paragraphCode"], result["subparagraphCode"], result["chemicalSubstanceCode"], result["productCode"], result["presentationCode"]] as const;
  for (let position = 1; position < chain.length; position += 1) {
    if (!String(chain[position]).startsWith(String(chain[position - 1]))) throw new Error(`BNF row ${rowNumber} has a broken hierarchy at ${chain[position]}.`);
  }
  return Object.freeze(result as unknown as BnfCurrentRecord);
}

export function bnfHierarchy(record: BnfCurrentRecord): readonly BnfHierarchyNode[] {
  const values = [
    [record.chapterCode, record.chapter],
    [record.sectionCode, record.section],
    [record.paragraphCode, record.paragraph],
    [record.subparagraphCode, record.subparagraph],
    [record.chemicalSubstanceCode, record.chemicalSubstance],
    [record.productCode, record.product],
    [record.presentationCode, record.presentation],
  ] as const;
  const collapsed = values.filter(([code], index) => index === 0 || code !== values[index - 1]?.[0]);
  return Object.freeze(collapsed.map(([code, name], index) => Object.freeze({ code, name, level: code.length, parentCode: index ? collapsed[index - 1]?.[0] ?? null : null })));
}
