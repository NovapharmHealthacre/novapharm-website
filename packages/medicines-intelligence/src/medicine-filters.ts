import type { Jurisdiction, MedicineFilterState, MedicineMetric } from "./types.ts";
import { normalisePostcode } from "./geography.ts";

const metrics = new Set<MedicineMetric>(["items", "quantity", "total_quantity", "nic", "actual_cost", "adq", "items_per_1000", "quantity_per_1000", "nic_per_item", "quantity_per_item", "mom_growth", "growth_3m", "growth_6m", "yoy_growth", "cagr", "forecast_growth", "forecast_interval_width", "volatility", "seasonality", "concentration"]);
const nations = new Set<Jurisdiction>(["England", "Scotland", "Wales", "Northern Ireland", "United Kingdom"]);
const medicineKeys = new Set(["BNF_CHEMICAL_SUBSTANCE", "BNF_CHEMICAL_SUBSTANCE_CODE", "BNF_PRESENTATION_NAME", "BNF_PRESENTATION_CODE", "SNOMED_CODE", "BNF_CHAPTER", "BNF_CHAPTER_CODE", "BNF_SECTION", "BNF_SECTION_CODE", "BNF_PARAGRAPH", "BNF_PARAGRAPH_CODE", "BNF_CHAPTER_PLUS_CODE", "GENERIC_BNF_EQUIVALENT_NAME", "GENERIC_BNF_EQUIVALENT_CODE", "SUPPLIER_NAME", "UNIT_OF_MEASURE", "PREP_CLASS", "PRESCRIBED_PREP_CLASS"]);

function text(value: unknown, maximum = 160): string | null {
  if (value === null || value === undefined || value === "") return null;
  const result = String(value).trim().replace(/\s+/gu, " ");
  if (!result || result.length > maximum || /[<>\u0000-\u001F]/u.test(result)) throw new Error("Medicine filter contains invalid text.");
  return result;
}

function month(value: unknown): string | null {
  const result = text(value, 7);
  if (result && !/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/u.test(result)) throw new Error("Medicine filter month must use YYYY-MM.");
  return result;
}

export function normaliseMedicineFilters(input: Readonly<Record<string, unknown>>): MedicineFilterState {
  const metric = String(input["metric"] ?? "items") as MedicineMetric;
  if (!metrics.has(metric)) throw new Error("Medicine metric is not supported.");
  const nationValue = text(input["nation"], 32) as Jurisdiction | null;
  if (nationValue && !nations.has(nationValue)) throw new Error("Medicine jurisdiction is not supported.");
  const startMonth = month(input["startMonth"]);
  const endMonth = month(input["endMonth"]);
  if (startMonth && endMonth && startMonth > endMonth) throw new Error("Medicine filter start month must not follow the end month.");
  const radiusValue = input["radiusKm"] === null || input["radiusKm"] === undefined || input["radiusKm"] === "" ? null : Number(input["radiusKm"]);
  if (radiusValue !== null && ![1, 3, 5, 10].includes(radiusValue)) throw new Error("Medicine radius must be 1, 3, 5 or 10 km.");
  const medicineInput = input["medicine"] && typeof input["medicine"] === "object" ? input["medicine"] as Readonly<Record<string, unknown>> : {};
  const medicine: Record<string, string> = {};
  for (const [key, value] of Object.entries(medicineInput)) {
    if (!medicineKeys.has(key)) throw new Error(`Medicine filter ${key} is not supported.`);
    const normalised = text(value, 240);
    if (normalised) medicine[key] = normalised;
  }
  const postcodeText = text(input["postcode"], 12);
  return Object.freeze({
    query: text(input["query"], 240) ?? "",
    metric,
    startMonth,
    endMonth,
    nation: nationValue,
    region: text(input["region"]),
    icb: text(input["icb"]),
    practiceCode: text(input["practiceCode"], 32),
    postcode: postcodeText ? normalisePostcode(postcodeText) : null,
    radiusKm: radiusValue as 1 | 3 | 5 | 10 | null,
    medicine: Object.freeze(medicine),
  });
}

export function stableFilterKey(filters: MedicineFilterState): string {
  return JSON.stringify({ ...filters, medicine: Object.fromEntries(Object.entries(filters.medicine).toSorted(([a], [b]) => a.localeCompare(b))) });
}

export function normaliseMedicineSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-GB").replace(/[^a-z0-9]+/gu, " ").trim();
}

export function filterCount(filters: MedicineFilterState): number {
  return [filters.startMonth, filters.endMonth, filters.nation, filters.region, filters.icb, filters.practiceCode, filters.postcode, filters.radiusKm, ...Object.values(filters.medicine)].filter((value) => value !== null && value !== "").length;
}
