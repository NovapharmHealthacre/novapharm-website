import { createHash } from "node:crypto";

// Publisher metadata only. This module never follows a CSV URL or uses datastore_search.
const ENDPOINT = "https://opendata.nhsbsa.net/api/3/action/package_show?id=bnf-snomed-mapping";
const SOURCE_PAGE = "https://opendata.nhsbsa.net/dataset/bnf-snomed-mapping";
const MAX_BYTES = 512 * 1024;
const MAX_RESOURCES = 128;

function denied(reason) {
  throw new Error("NHSBSA BNF/SNOMED metadata check rejected: " + reason);
}

function validResource(value) {
  if (!value || typeof value !== "object" || value.state === "deleted") return null;
  const name = String(value.name ?? "");
  const match = name.match(/^BNF_SNOMED_MAPPING_DATA_(20\d{2})(0[1-9]|1[0-2])$/i);
  if (!match) return null;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(value.id ?? ""))) return null;
  const format = String(value.format ?? "").toLowerCase();
  if (format !== "csv" && format !== "text/csv") return null;
  return {
    resourceId: value.id,
    reportingPeriod: match[1] + "-" + match[2],
  };
}

/**
 * Strict, single official CKAN package_show GET.
 * No raw metadata, medicine rows, patient identifiers, credentials, database writes,
 * commercial licence assertions or customer-visible medicine facts are returned.
 */
export async function probeNhsbsaBnfSnomedMetadata({
  fetchImplementation = fetch,
  now = () => new Date(),
} = {}) {
  if (typeof fetchImplementation !== "function" || typeof now !== "function") denied("trusted dependencies");
  const response = await fetchImplementation(ENDPOINT, {
    method: "GET",
    redirect: "error",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response || !response.ok || response.status !== 200 || response.redirected) denied("HTTP response");
  const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) denied("content type");
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BYTES) denied("response exceeds byte cap");
  if (!response.body) denied("missing response body");

  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      denied("response exceeds byte cap");
    }
    chunks.push(Buffer.from(value));
  }
  const raw = Buffer.concat(chunks);
  let envelope;
  try { envelope = JSON.parse(raw.toString("utf8")); }
  catch { denied("invalid publisher JSON"); }

  if (envelope?.success !== true || envelope?.result?.name !== "bnf-snomed-mapping") denied("publisher dataset identity");
  const resources = envelope.result.resources;
  if (!Array.isArray(resources) || resources.length > MAX_RESOURCES) denied("resource array");
  const eligible = resources.map(validResource).filter(Boolean).sort((a, b) =>
    a.reportingPeriod.localeCompare(b.reportingPeriod)
  );
  if (!eligible.length) denied("no dated CSV metadata");
  const latest = eligible.at(-1);
  const observedAt = now();
  if (!(observedAt instanceof Date) || !Number.isFinite(observedAt.getTime())) denied("observation time");
  return Object.freeze({
    contract: "novapharm.uk.nhsbsa.bnf-snomed.metadata-only.v1",
    sourceId: "nhsbsa.bnf-snomed-map",
    jurisdiction: "GB-ENG",
    publisher: "NHS Business Services Authority",
    publisherPage: SOURCE_PAGE,
    resourceId: latest.resourceId,
    reportingPeriod: latest.reportingPeriod,
    datedCsvResourcesFound: eligible.length,
    metadataSha256: createHash("sha256").update(raw).digest("hex"),
    observedAt: observedAt.toISOString(),
    officialPublisherMetadataVerified: true,
    publisherRowsRead: 0,
    rawRecordsRetained: false,
    independentTerminologyRightsApproved: false,
    medicineDataAdmitted: false,
    customerCountryLive: false,
    canPublish: false,
  });
}
