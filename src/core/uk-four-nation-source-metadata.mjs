import { createHash } from "node:crypto";
import { parseReportingPeriod } from "../../packages/medicines-intelligence/src/resource-discovery.ts";

/**
 * UK four-nation official-source metadata health checks.
 * This is NOT medical data ingestion, a regulatory API, a source licence, or customer access.
 * Every URL is a literal, code-reviewed public publisher location; no discovered URL is fetched.
 */
export const FOUR_NATION_SOURCES = Object.freeze([
  Object.freeze({
    sourceId: "nhsbsa.epd", nation: "England", jurisdiction: "GB-ENG",
    kind: "ckan", expectedPeriodPrecision: "month",
    url: "https://opendata.nhsbsa.net/api/3/action/package_show?id=english-prescribing-dataset-epd-with-snomed-code",
    packageName: "english-prescribing-dataset-epd-with-snomed-code",
  }),
  Object.freeze({
    sourceId: "phs.prescribed-dispensed", nation: "Scotland", jurisdiction: "GB-SCT",
    kind: "ckan", expectedPeriodPrecision: "quarter",
    url: "https://www.opendata.nhs.scot/api/3/action/package_show?id=prescribed-dispensed",
    packageName: "prescribed-dispensed",
  }),
  Object.freeze({
    sourceId: "nwssp.practice-pharmacy-flow", nation: "Wales", jurisdiction: "GB-WLS",
    kind: "publisher_page", expectedPeriodPrecision: null,
    url: "https://nwssp.nhs.wales/ourservices/primary-care-services/general-information/data-and-publications/pharmacy-practice-dispensing-data/",
    packageName: null,
  }),
  Object.freeze({
    sourceId: "bso.dispensing-contractor", nation: "Northern Ireland", jurisdiction: "GB-NIR",
    kind: "ckan", expectedPeriodPrecision: "month",
    url: "https://admin.opendatani.gov.uk/api/3/action/package_show?id=dispensing-by-contractor",
    packageName: "dispensing-by-contractor",
  }),
]);

const MAX_METADATA_BYTES = 2 * 1024 * 1024;
const MAX_RESOURCES = 256;
const resourceIdPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
function deny(reason) { throw new Error("UK official-source metadata probe failed closed: " + reason); }

async function boundedOfficialGet(url, fetchImplementation) {
  const response = await fetchImplementation(url, {
    method: "GET", redirect: "error",
    headers: { Accept: "application/json, text/html;q=0.5" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response || response.status !== 200 || !response.ok || response.redirected)
    deny("unexpected publisher HTTP response");
  if (!response.body) deny("missing response body");
  return response;
}
function receiptBase(source, checkedAt) {
  return {
    contract: "novapharm.uk.four-nation.publisher-metadata.v1",
    nation: source.nation,
    jurisdiction: source.jurisdiction,
    sourceId: source.sourceId,
    checkedAt,
    sourceRightsIndependentlyApproved: false,
    rawMedicineRowsRead: 0,
    medicineDataAdmitted: false,
    customerCountryLive: false,
    canPublish: false,
  };
}

export async function probeUkNationPublisherMetadata(sourceId, {
  fetchImplementation = fetch,
  now = () => new Date(),
} = {}) {
  const source = FOUR_NATION_SOURCES.find(entry => entry.sourceId === sourceId);
  if (!source) deny("unrecognised source");
  if (typeof fetchImplementation !== "function" || typeof now !== "function") deny("invalid dependencies");
  const date = now();
  if (!(date instanceof Date) || !Number.isFinite(date.valueOf())) deny("invalid observation time");
  const response = await boundedOfficialGet(source.url, fetchImplementation);
  const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();

  // Wales's official NWSSP service is a webpage/workbook publisher, not a known CKAN API.
  // Confirm page reachability only; do not parse page HTML, discover links or fetch workbooks.
  if (source.kind === "publisher_page") {
    if (!contentType.includes("text/html")) deny("expected publisher page HTML");
    await response.body.cancel().catch(() => {});
    return Object.freeze({
      ...receiptBase(source, date.toISOString()),
      metadataStatus: "official_page_reachable_no_machine_readable_feed_accepted",
      latestReportingPeriod: null, datedResources: 0,
      publisherRowsRead: 0,
    });
  }

  if (!contentType.includes("application/json")) deny("expected CKAN JSON");
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_METADATA_BYTES))
    deny("declared metadata too large");
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_METADATA_BYTES) {
      await reader.cancel().catch(() => {});
      deny("streamed metadata too large");
    }
    chunks.push(Buffer.from(value));
  }
  const raw = Buffer.concat(chunks);
  let envelope;
  try { envelope = JSON.parse(raw.toString("utf8")); }
  catch { deny("unparseable JSON"); }
  if (envelope?.success !== true || envelope?.result?.name !== source.packageName)
    deny("wrong official dataset identity");
  const resources = envelope.result.resources;
  if (!Array.isArray(resources) || resources.length > MAX_RESOURCES) deny("invalid resource count");
  const found = resources.flatMap(resource => {
    if (!resource || typeof resource !== "object" || resource.state === "deleted") return [];
    const format = String(resource.format ?? "").toUpperCase();
    if (!["CSV", "ZIP", "XLSX", "XLS"].includes(format)) return [];
    if (!resourceIdPattern.test(String(resource.id ?? ""))) return [];
    const name = String(resource.name ?? "");
    const title = String(resource.title ?? "");
    const period = parseReportingPeriod(name + " " + title);
    if (!period || period.precision !== source.expectedPeriodPrecision) return [];
    return [{ id: resource.id, period: period.key, sortKey: period.sortKey }];
  }).sort((a,b) => a.sortKey - b.sortKey || a.id.localeCompare(b.id));
  if (!found.length) deny("no correctly dated publisher resources");
  return Object.freeze({
    ...receiptBase(source, date.toISOString()),
    metadataStatus: "official_ckan_metadata_validated",
    latestReportingPeriod: found.at(-1).period,
    latestResourceId: found.at(-1).id,
    datedResources: found.length,
    publisherMetadataSha256: createHash("sha256").update(raw).digest("hex"),
    publisherRowsRead: 0,
  });
}

export async function probeAllFourUkPublishers(options = {}) {
  const results = [];
  // Sequential and bounded by the four pinned official destinations.
  for (const source of FOUR_NATION_SOURCES) {
    results.push(await probeUkNationPublisherMetadata(source.sourceId, options));
  }
  if (results.length !== 4 || new Set(results.map(x => x.nation)).size !== 4)
    deny("four-nation coverage invariant");
  return Object.freeze(results);
}
