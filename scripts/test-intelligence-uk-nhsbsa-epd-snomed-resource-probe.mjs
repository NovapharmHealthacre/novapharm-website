import assert from "node:assert/strict";
import test from "node:test";
import { NHSBSA_EPD_SNOMED_SOURCE as plan, probeNhsbsaEpdSnomedResource } from "../src/core/intelligence-uk-nhsbsa-epd-snomed-resource-probe.mjs";

const NOW = Date.parse("2026-11-20T10:00:00Z");
const fixedClock = () => NOW;
const metadata = () => ({ success: true, result: {
  id: plan.resourceId,
  name: plan.resourceName,
  package_id: "12345678-1234-1234-1234-123456789abc",
  format: "CSV",
  url: plan.datasetPage + "/resource/" + plan.resourceId + "/download/epd_snomed_202605.csv",
  metadata_modified: "2026-07-21T00:00:00"
} });
const simulated = (value = metadata(), init = {}) => new Response(JSON.stringify(value), {
  headers: { "content-type": "application/json", ...init }
});

test("UK source is current SNOMED resource metadata, not retired EPD or prescribing rows", () => {
  assert.equal(plan.country, "GB");
  assert.equal(plan.resourceName, "EPD_SNOMED_202605");
  assert.equal(plan.url, "https://opendata.nhsbsa.net/api/3/action/resource_show?id=004d6f4e-9881-4312-82dc-094f9a543885");
  assert.match(plan.registryCandidateKey, /united-kingdom-nhsbsa/);
});

test("bounded official source metadata yields a receipt with every release gate denied", async () => {
  let calls = 0;
  const receipt = await probeNhsbsaEpdSnomedResource({
    now: fixedClock,
    transport: async (url, opts) => {
      calls++;
      assert.equal(url, plan.url);
      assert.equal(opts.method, "GET");
      assert.equal(opts.redirect, "error");
      assert.equal(opts.credentials, "omit");
      return simulated();
    }
  });
  assert.equal(calls, 1);
  assert.equal(receipt.officialPublisherMetadataVerified, true);
  assert.match(receipt.metadataSha256, /^[a-f0-9]{64}$/);
  assert.equal(receipt.publisherRowsRead, 0);
  assert.equal(receipt.retiredEpdSourceUsed, false);
  for (const key of ["sourceRightsIndependentlyApproved","sourceLicenceAttributionReviewed",
    "snomedTerminologyRightsReviewed","publisherDataAdmitted","customerCountryLive",
    "clinicalDecisionReady","commercialDecisionReady","canPublish",
    "rawMetadataRetained","rawPrescribingRecordsRetained"]) assert.equal(receipt[key], false, key);
  assert.equal("result" in receipt, false);
  assert.equal("url" in receipt, false);
});

test("wrong or retired dataset identity and third-party download URL are denied", async () => {
  const bad = [
    { ...metadata(), success: false },
    { ...metadata(), result: { ...metadata().result, name: "EPD_202605" } },
    { ...metadata(), result: { ...metadata().result, id: "00000000-0000-0000-0000-000000000000" } },
    { ...metadata(), result: { ...metadata().result, format: "HTML" } },
    { ...metadata(), result: { ...metadata().result, url: "https://external.invalid/file.csv" } },
    { ...metadata(), result: { ...metadata().result, url: "http://opendata.nhsbsa.net/file.csv" } },
    { ...metadata(), result: { ...metadata().result, url: "https://attacker@opendata.nhsbsa.net/dataset/file" } }
  ];
  for (const sample of bad) {
    await assert.rejects(probeNhsbsaEpdSnomedResource({ now: fixedClock, transport: async () => simulated(sample) }), /denied/);
  }
});

test("network, protocol, oversized stream, malformed body and unsafe clock fail closed", async () => {
  await assert.rejects(probeNhsbsaEpdSnomedResource({ now: fixedClock, transport: async () => { throw Error("SECRET_DO_NOT_LOG"); } }), err => !err.message.includes("SECRET_DO_NOT_LOG"));
  for (const response of [
    new Response("server error", { status: 503, headers: { "content-type": "application/json" } }),
    new Response("<html/>", { headers: { "content-type": "text/html" } }),
    new Response("not-json", { headers: { "content-type": "application/json" } }),
    simulated(metadata(), { "content-length": "800000" }),
    new Response("x".repeat(300_000), { headers: { "content-type": "application/json" } })
  ]) await assert.rejects(probeNhsbsaEpdSnomedResource({ now: fixedClock, transport: async () => response }), /denied/);
  await assert.rejects(probeNhsbsaEpdSnomedResource({ now: () => NaN, transport: async () => { throw Error("should not call"); } }), /clock/);
});
