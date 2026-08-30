import { parseBnfCurrentRecord, type BnfCurrentRecord } from "./bnf-current.ts";

export type BnfChangeType = "ADD" | "CHANGE" | "REMOVE";

export interface BnfChangeRecord extends BnfCurrentRecord {
  readonly changeType: BnfChangeType;
}

export function parseBnfChangeRecord(headers: readonly string[], cells: readonly string[], rowNumber: number): BnfChangeRecord {
  const changeIndex = headers.indexOf("CHANGE_TYPE");
  if (changeIndex < 0) throw new Error("BNF monthly-change schema is missing CHANGE_TYPE.");
  const value = String(cells[changeIndex] ?? "").trim().toUpperCase();
  if (value !== "ADD" && value !== "CHANGE" && value !== "REMOVE") throw new Error(`BNF monthly-change row ${rowNumber} has invalid CHANGE_TYPE.`);
  const mappedHeaders = headers.map((header) => header === "YEAR_MONTH_APPLICABLE" ? "YEAR_MONTH" : header);
  const record = parseBnfCurrentRecord(mappedHeaders, cells, rowNumber);
  return Object.freeze({ ...record, changeType: value });
}
