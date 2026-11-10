import assert from "node:assert/strict";
import test from "node:test";
import { discoverOfficialOpenData } from "../src/core/intelligence-official-open-data-discovery.mjs";

const release = { verifiedServerSide: true, metadataDiscoveryApproved: true };
const response = (payload) => ({ ok: true, json: async () => payload });

test("never issue publisher requests before release approval", async () => {
  let called = 0;
  const fetchImpl = async () => { called += 1; return response({}); };
  await assert.rejects(discoverOfficialOpenData({ sourceId: "nhsbsa_english_prescribing", fetchImpl }), /unavailable/);
  await assert.rejects(discoverOfficialOpenData({ sourceId: "ons_population", release: { ...release, verifiedServerSide: false }, fetchImpl }), /unavailable/);
  await assert.rejects(discoverOfficialOpenData({ sourceId: "https://evil.example/", release, fetchImpl }), /unavailable/);
  assert.equal(called, 0);
});

test("NHSBSA discovery uses fixed official origin and does not certify market observations", async () => {
  const result = await discoverOfficialOpenData({
    sourceId: "nhsbsa_english_prescribing", release,
    fetchImpl: async (url, options) => {
      assert.equal(new URL(url).hostname, "opendata.nhsbsa.net");
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "error");
      return response({ success: true, result: {
        id: "epd", title: "English Prescribing Dataset", license_id: "ogl", url: "https://evil.example/redirect",
      } });
    },
  });
  assert.equal(result.records[0].sourceUrl, result.discoveryUrl);
  assert.equal(result.records[0].license, "ogl");
  assert.equal(result.observedMedicineMetricsAvailable, false);
  assert.equal(result.dataRightsVerified, false);
  assert.equal(result.readyForCustomerInsights, false);
});

test("ONS dataset discovery is bounded and does not invent licences or numeric observations", async () => {
  const result = await discoverOfficialOpenData({
    sourceId: "ons_population", release,
    fetchImpl: async (url) => {
      assert.equal(new URL(url).hostname, "api.beta.ons.gov.uk");
      return response({ items: Array.from({ length: 30 }, (_, i) => ({ id: "dataset" + i, title: "Data" + i })) });
    },
  });
  assert.equal(result.records.length, 5);
  assert.equal(result.records[0].license, null);
  assert.equal(result.observedMedicineMetricsAvailable, false);
  assert.equal(result.dataRightsVerified, false);
});

test("unexpected upstream schema and HTTP errors fail closed", async () => {
  await assert.rejects(discoverOfficialOpenData({
    sourceId: "nhsbsa_english_prescribing", release, fetchImpl: async () => response({ success: false }),
  }), /unavailable/);
  await assert.rejects(discoverOfficialOpenData({
    sourceId: "ons_population", release, fetchImpl: async () => ({ ok: false }),
  }), /unavailable/);
});
