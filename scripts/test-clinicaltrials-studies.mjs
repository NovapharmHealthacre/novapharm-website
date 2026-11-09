import assert from "node:assert/strict";
import { test } from "node:test";
import { searchClinicalTrialsStudies } from "../src/core/regulatory/clinicaltrials-studies.mjs";

const board = { accessScopes: ["board"] };
const fixture = {
  totalCount: 12,
  nextPageToken: "synthetic-not-for-reuse",
  studies: [{
    protocolSection: {
      identificationModule: { nctId: "NCT01234567", briefTitle: "Synthetic controlled registry study" },
      statusModule: { overallStatus: "RECRUITING", studyFirstPostDateStruct: { date: "2024-02-03" }, lastUpdatePostDateStruct: { date: "2026-10-04" } },
      designModule: { phases: ["PHASE3"], studyType: "INTERVENTIONAL" },
      sponsorCollaboratorsModule: { leadSponsor: { name: "Synthetic sponsor" } },
      descriptionModule: { detailedDescription: "Private or misleading free text must not be projected." },
    },
  }],
};

test("clinical study discovery denies unauthorised and malformed requests before any network activity", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw Error("must not call provider"); };
  await assert.rejects(() => searchClinicalTrialsStudies("pembrolizumab", { accessScopes: ["customer"] }, { fetchImpl }), (error) => error.statusCode === 403);
  await assert.rejects(() => searchClinicalTrialsStudies("pembrolizumab", {}, { fetchImpl }), (error) => error.statusCode === 403);
  for (const query of ["", "x", 'pembrolizumab OR sponsor:private', "drug & token=secret"]) {
    await assert.rejects(() => searchClinicalTrialsStudies(query, board, { fetchImpl }), (error) => error.statusCode === 400);
  }
  assert.equal(calls, 0);
});

test("fixed official HTTPS source and minimal study identity, status and provenance", async () => {
  let calls = 0;
  const result = await searchClinicalTrialsStudies("pembrolizumab", board, {
    fetchImpl: async (address, options) => {
      calls += 1;
      const url = new URL(address);
      assert.equal(url.origin, "https://clinicaltrials.gov");
      assert.equal(url.pathname, "/api/v2/studies");
      assert.equal(url.searchParams.get("query.intr"), "pembrolizumab");
      assert.equal(url.searchParams.get("pageSize"), "5");
      assert.equal(url.searchParams.get("countTotal"), "true");
      assert.equal(url.searchParams.has("api_key"), false);
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "error");
      assert.equal(options.cache, "no-store");
      assert.deepEqual(options.headers, { Accept: "application/json" });
      return { ok: true, json: async () => fixture };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.sourceId, "us.nlm.clinicaltrials-gov-v2");
  assert.equal(result.dataState, "public_registry_records");
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].nctId, "NCT01234567");
  assert.equal(result.records[0].sourceUrl, "https://clinicaltrials.gov/study/NCT01234567");
  assert.equal(result.records[0].lastUpdatePosted, "2026-10-04");
  assert.equal(result.productionReuseRightsCertified, false);
  assert.equal(result.truncated, true);
  assert.equal(JSON.stringify(result).includes("Private or misleading"), false);
  assert.equal(JSON.stringify(result).includes("nextPageToken"), false);
});

test("source emptiness, invalid records and unavailability never manufacture trial evidence", async () => {
  const empty = await searchClinicalTrialsStudies("apixaban", board, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ studies: [] }) }),
  });
  assert.equal(empty.dataState, "no_source_matches");
  assert.deepEqual(empty.records, []);
  const badId = await searchClinicalTrialsStudies("apixaban", board, {
    fetchImpl: async () => ({ ok: true, json: async () => ({ studies: [{ protocolSection: { identificationModule: { nctId: "malicious/path" } } }] }) }),
  });
  assert.equal(badId.records[0].sourceUrl, null);
  for (const response of [
    { ok: false, status: 429 },
    { ok: false, status: 500 },
    { ok: true, json: async () => ({ studies: "wrong" }) },
  ]) {
    await assert.rejects(
      () => searchClinicalTrialsStudies("apixaban", board, { fetchImpl: async () => response }),
      (error) => error.statusCode === 503,
    );
  }
});
