/**
 * Source connectivity check only. One record per official API, zero returned or persisted
 * medicine facts, and no private-service or customer launch assertion.
 */
import { FDA_EVIDENCE_KINDS } from "../src/core/regulatory/openfda-evidence.mjs";

const SOURCES = Object.freeze({
  approvals: ["drugsfda.json", "products.active_ingredients.name", "metformin"],
  ndc: ["ndc.json", "generic_name", "apixaban"],
  "adverse-events": ["event.json", "patient.drug.medicinalproduct", "apixaban"],
  recalls: ["enforcement.json", "product_description", "ibuprofen"],
});
const MAX_RESPONSE_BYTES = 256 * 1024;
for (const kind of FDA_EVIDENCE_KINDS) {
  const [path, field, term] = SOURCES[kind];
  const endpoint = new URL("https://api.fda.gov/drug/" + path);
  endpoint.searchParams.set("search", field + ':"' + term + '"');
  endpoint.searchParams.set("limit", "1");
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  if (![200, 404].includes(response.status)) {
    throw new Error(kind + " publisher returned HTTP " + response.status);
  }
  if (response.status === 404) {
    console.log(kind + ": official publisher accessible, no matching public record");
    await response.body?.cancel();
    continue;
  }
  if (!/\bapplication\/json\b/i.test(response.headers.get("content-type") || "")) {
    throw new Error(kind + " publisher returned an unexpected content type");
  }
  const claim = Number(response.headers.get("content-length") || 0);
  if (claim > MAX_RESPONSE_BYTES) throw new Error(kind + " source record exceeds 256 KiB");
  if (!response.body?.getReader) throw new Error(kind + " lacks a readable response stream");
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error(kind + " response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const raw = new Uint8Array(bytes);
  let cursor = 0;
  for (const chunk of chunks) { raw.set(chunk, cursor); cursor += chunk.byteLength; }
  const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  if (!Array.isArray(data?.results) || data.results.length < 1) {
    throw new Error(kind + " did not return an expected openFDA results array");
  }
  if (!Number.isSafeInteger(data?.meta?.results?.total)) {
    throw new Error(kind + " did not return a numeric publisher result count");
  }
  // Do NOT log or persist the source results or raw body.
  console.log(kind + ": official publisher online; one record schema-confirmed; no source facts retained");
}
console.log("Publisher-only connectivity passed; not a production deployment or data-rights approval.");
