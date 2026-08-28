import assert from "node:assert/strict";
import test from "node:test";
import { bnfHierarchy, parseBnfChangeRecord, parseBnfCurrentRecord, parseCsvRows, schemaContracts, validateSchema } from "../src/index.ts";

async function rows(chunks: readonly string[]): Promise<readonly (readonly string[])[]> {
  async function* source(): AsyncGenerator<string> { for (const chunk of chunks) yield chunk; }
  const result: (readonly string[])[] = [];
  for await (const row of parseCsvRows(source())) result.push(row);
  return result;
}

test("streaming CSV preserves commas, newlines and escaped quotes across chunks", async () => {
  assert.deepEqual(await rows(["\uFEFFcode,name\r\n01,\"A,", " B\"\r\n02,\"line 1\nline ", "2 and \"\"quoted\"\"\"\r\n"]), [
    ["code", "name"],
    ["01", "A, B"],
    ["02", "line 1\nline 2 and \"quoted\""],
  ]);
});

test("streaming CSV fails closed on malformed quotation and field limits", async () => {
  await assert.rejects(() => rows(["a,b\n1,\"unfinished"]), /inside a quoted field/u);
  await assert.rejects(() => rows(["a,b\n1,\"closed\"suffix"]), /text after a closing quote/u);
  async function* source(): AsyncGenerator<string> { yield "a,b\n1,too-long"; }
  const consume = async (): Promise<void> => { for await (const _row of parseCsvRows(source(), { maximumFieldLength: 4 })) void _row; };
  await assert.rejects(consume, /approved length/u);
});

test("BNF current records retain the complete governed hierarchy", () => {
  const headers = schemaContracts.bnfCurrent.required;
  const record = parseBnfCurrentRecord(headers, [
    "2026-07", "Gastro-Intestinal System", "01", "Dyspepsia", "0101", "Antacids", "010101",
    "Antacids and simeticone", "0101010", "Alexitol sodium", "0101010A0", "Actal", "0101010A0BB",
    "Actal 360mg tablets", "0101010A0BBAAAA",
  ], 2);
  const hierarchy = bnfHierarchy(record);
  assert.equal(record.presentationCode, "0101010A0BBAAAA");
  assert.deepEqual(hierarchy.map((node) => node.level), [2, 4, 6, 7, 9, 11, 15]);
  assert.equal(hierarchy.at(-1)?.parentCode, "0101010A0BB");
});

test("BNF appliance records preserve the official collapsed hierarchy without duplicate nodes", () => {
  const headers = schemaContracts.bnfCurrent.required;
  const record = parseBnfCurrentRecord(headers, [
    "2026-07", "Dressings", "20", "Absorbent Cottons", "2001", "Absorbent Cottons", "2001",
    "Absorbent Cottons", "2001", "Absorbent Cottons", "2001", "Absorbent cotton BP 1988", "20010000101",
    "Absorbent cotton BP 1988", "20010000101",
  ], 2);
  assert.deepEqual(bnfHierarchy(record).map((node) => [node.code, node.parentCode]), [
    ["20", null], ["2001", "20"], ["20010000101", "2001"],
  ]);
});

test("BNF current records reject numeric truncation and broken hierarchy", () => {
  const headers = schemaContracts.bnfCurrent.required;
  const values = ["2026-07", "Chapter", "01", "Section", "0101", "Paragraph", "010101", "Sub", "0101010", "Chemical", "0101010A0", "Product", "0101010A0AA", "Presentation", "9101010A0AAAAAA"];
  assert.throws(() => parseBnfCurrentRecord(headers, values, 2), /broken hierarchy/u);
});

test("BNF monthly changes retain the applicable month and controlled change type", () => {
  const headers = [...schemaContracts.bnfChanges.required];
  const values: Readonly<Record<string, string>> = {
    YEAR_MONTH_APPLICABLE: "2026-01", BNF_CHAPTER: "Cardiovascular System", BNF_CHAPTER_CODE: "02",
    BNF_SECTION: "Anticoagulants and protamine", BNF_SECTION_CODE: "0208", BNF_PARAGRAPH: "Oral anticoagulants",
    BNF_PARAGRAPH_CODE: "020802", BNF_SUBPARAGRAPH: "Oral anticoagulants", BNF_SUBPARAGRAPH_CODE: "0208020",
    BNF_CHEMICAL_SUBSTANCE: "Apixaban", BNF_CHEMICAL_SUBSTANCE_CODE: "0208020Z0", BNF_PRODUCT: "Apixaban",
    BNF_PRODUCT_CODE: "0208020Z0AA", BNF_PRESENTATION: "Apixaban 1mg/ml oral suspension sugar free",
    BNF_PRESENTATION_CODE: "0208020Z0AAACAC", CHANGE_TYPE: "ADD",
  };
  const schema = validateSchema(schemaContracts.bnfChanges, headers);
  assert.equal(schema.status, "exact");
  const record = parseBnfChangeRecord(headers, headers.map((header) => values[header] ?? ""), 2);
  assert.equal(record.yearMonth, "2026-01");
  assert.equal(record.changeType, "ADD");
  assert.equal(record.presentationCode, "0208020Z0AAACAC");
  assert.throws(() => parseBnfChangeRecord(headers, headers.map((header) => header === "CHANGE_TYPE" ? "RENAME" : values[header] ?? ""), 3), /invalid CHANGE_TYPE/iu);
});
