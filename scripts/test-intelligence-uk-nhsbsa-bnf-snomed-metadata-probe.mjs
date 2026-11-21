import assert from "node:assert/strict";
import test from "node:test";
import { probeNhsbsaBnfSnomedMetadata } from "../src/core/intelligence-uk-nhsbsa-bnf-snomed-metadata-probe.mjs";

const julyId = "bafa30b6-4426-4578-a128-935d13b228e5";
const sepId = "35b93e03-6330-4a7e-9be0-1f07c1495cc5";

function packageResponse(resources, name = "bnf-snomed-mapping") {
  return new Response(JSON.stringify({
    success: true,
    result: { name, resources },
  }), { headers: { "content-type": "application/json" } });
}

test("one fixed official request returns only a nonpublishable, dated metadata receipt", async () => {
  const calls = [];
  const receipt = await probeNhsbsaBnfSnomedMetadata({
    now: () => new Date("2026-11-21T00:00:00.000Z"),
    fetchImplementation: async (url, options) => {
      calls.push({ url, options });
      return packageResponse([
        { id: julyId, name: "BNF_SNOMED_MAPPING_DATA_202607", format: "CSV" },
        { id: sepId, name: "BNF_SNOMED_MAPPING_DATA_202609", format: "text/csv" },
        { id: "not-a-uuid", name: "BNF_SNOMED_MAPPING_DATA_202610", format: "CSV" },
        { id: julyId, name: "BNF_SNOMED_MAPPING_DATA", format: "CSV" },
      ]);
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://opendata.nhsbsa.net/api/3/action/package_show?id=bnf-snomed-mapping");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(receipt.resourceId, sepId);
  assert.equal(receipt.reportingPeriod, "2026-09");
  assert.equal(receipt.datedCsvResourcesFound, 2);
  assert.equal(receipt.officialPublisherMetadataVerified, true);
  assert.equal(receipt.publisherRowsRead, 0);
  assert.equal(receipt.rawRecordsRetained, false);
  assert.equal(receipt.independentTerminologyRightsApproved, false);
  assert.equal(receipt.medicineDataAdmitted, false);
  assert.equal(receipt.customerCountryLive, false);
  assert.equal(receipt.canPublish, false);
  assert.match(receipt.metadataSha256, /^[a-f0-9]{64}$/);
  assert.equal("resources" in receipt, false);
  assert.equal(JSON.stringify(receipt).includes("SNOMED_CODE"), false);
});

test("a wrong publisher dataset, invalid data envelope and redirect fail closed", async () => {
  for (const implementation of [
    async () => packageResponse([], "unrelated"),
    async () => new Response(JSON.stringify({ success: false, result: {} }), { headers: { "content-type": "application/json" } }),
    async () => Response.redirect("https://example.org", 302),
  ]) {
    await assert.rejects(
      () => probeNhsbsaBnfSnomedMetadata({ fetchImplementation: implementation }),
      /NHSBSA BNF\/SNOMED metadata check rejected/
    );
  }
});

test("oversize and undated or unrecognised resource records fail closed", async () => {
  const large = "x".repeat(512 * 1024 + 1024);
  await assert.rejects(
    () => probeNhsbsaBnfSnomedMetadata({ fetchImplementation: async () =>
      new Response(large, { headers: { "content-type": "application/json" } }) }),
    /response exceeds byte cap/
  );
  await assert.rejects(
    () => probeNhsbsaBnfSnomedMetadata({ fetchImplementation: async () =>
      packageResponse([{ id: julyId, name: "BNF_SNOMED_MAPPING_DATA", format: "CSV" }]) }),
    /no dated CSV metadata/
  );
});
