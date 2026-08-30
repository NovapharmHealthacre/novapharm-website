import { createHash } from "node:crypto";
import type { CkanResource, DiscoveredResource, ReportingPeriod } from "./types.ts";

const monthNames: Readonly<Record<string, number>> = Object.freeze({
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
});

export function parseReportingPeriod(value: string): ReportingPeriod | null {
  const text = value.trim();
  const financialQuarter = text.match(/((?:19|20)\d{2})(\d{2})Q([1-4])/i);
  if (financialQuarter) {
    const startYear = Number(financialQuarter[1]);
    const endYear = Number(financialQuarter[2]);
    const quarter = Number(financialQuarter[3]);
    return Object.freeze({ key: `${startYear}/${String(endYear).padStart(2, "0")}-Q${quarter}`, precision: "quarter", sortKey: startYear * 100 + quarter * 3, sourceText: financialQuarter[0] });
  }
  const compactMonth = [...text.matchAll(/((?:19|20)\d{2})(0[1-9]|1[0-2])(?!\d)/g)].at(-1);
  if (compactMonth) {
    const year = Number(compactMonth[1]);
    const month = Number(compactMonth[2]);
    return Object.freeze({ key: `${year}-${String(month).padStart(2, "0")}`, precision: "month", sortKey: year * 100 + month, sourceText: compactMonth[0] });
  }
  const separatedMonth = [...text.matchAll(/((?:19|20)\d{2})[-_/](0?[1-9]|1[0-2])(?!\d)/g)].at(-1);
  if (separatedMonth) {
    const year = Number(separatedMonth[1]);
    const month = Number(separatedMonth[2]);
    return Object.freeze({ key: `${year}-${String(month).padStart(2, "0")}`, precision: "month", sortKey: year * 100 + month, sourceText: separatedMonth[0] });
  }
  const namedMonth = text.match(new RegExp(`\\b(${Object.keys(monthNames).join("|")})\\b[^0-9]{0,12}((?:19|20)\\d{2})`, "i"));
  if (namedMonth) {
    const month = monthNames[namedMonth[1]?.toLowerCase() ?? ""];
    const year = Number(namedMonth[2]);
    if (month) return Object.freeze({ key: `${year}-${String(month).padStart(2, "0")}`, precision: "month", sortKey: year * 100 + month, sourceText: namedMonth[0] });
  }
  const quarter = text.match(/((?:19|20)\d{2})[^0-9]{0,5}Q([1-4])/i);
  if (quarter) {
    const year = Number(quarter[1]);
    const value = Number(quarter[2]);
    return Object.freeze({ key: `${year}-Q${value}`, precision: "quarter", sortKey: year * 100 + value * 3, sourceText: quarter[0] });
  }
  const yearMatch = [...text.matchAll(/\b((?:19|20)\d{2})\b/g)].at(-1);
  if (!yearMatch) return null;
  const year = Number(yearMatch[1]);
  return Object.freeze({ key: String(year), precision: "year", sortKey: year * 100, sourceText: yearMatch[0] });
}

export function resourceFingerprint(resource: CkanResource): string {
  return createHash("sha256").update(JSON.stringify({
    id: resource.id,
    name: resource.name,
    url: resource.url,
    size: resource.size ?? null,
    hash: resource.sha256 || resource.hash || null,
    schema: resource.schema ?? null,
    modified: resource.last_modified || resource.metadata_modified || resource.created || null,
  })).digest("hex");
}

export function discoverResources(resources: readonly CkanResource[]): readonly DiscoveredResource[] {
  return Object.freeze(resources.flatMap((resource): DiscoveredResource[] => {
    if (resource.state && resource.state !== "active") return [];
    const format = String(resource.format ?? "").toUpperCase();
    if (format && !["CSV", "ZIP", "XLSX", "XLS"].includes(format)) return [];
    const period = parseReportingPeriod(`${resource.name} ${resource.title ?? ""} ${resource.url}`);
    return period ? [{ resource, period, fingerprint: resourceFingerprint(resource) }] : [];
  }).toSorted((left, right) => left.period.sortKey - right.period.sortKey || left.resource.name.localeCompare(right.resource.name)));
}

export function revisedPeriods(previous: readonly DiscoveredResource[], current: readonly DiscoveredResource[]): readonly string[] {
  const prior = new Map(previous.map((entry) => [entry.period.key, entry.fingerprint]));
  return Object.freeze(current.filter((entry) => prior.has(entry.period.key) && prior.get(entry.period.key) !== entry.fingerprint).map((entry) => entry.period.key));
}
