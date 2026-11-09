import assert from "node:assert/strict";
import { test } from "node:test";
import { searchOpenFdaLabels } from "../src/core/regulatory/openfda-labels.mjs";

const board = { accessScopes: ["board"] };
const sourcePayload = {
  meta: { results: { total: 10 } },
  results: [{
    id: "fda-fixture-id",
    set_id: "source-set-id",
    effective_time: "20261015",
    openfda: {
      generic_name: ["APIXABAN"],
      brand_name: ["Example brand"],
      application_number: ["NDA123456"],
      product_type: ["HUMAN PRESCRIPTION DRUG"],
    },
    warnings: ["Do not transmit free-text label sections into the commercial decision platform."],
  }],
};

test("US public labels reject customer and unauthenticated actors before network access", async () => {
  const neverFetch = () => { throw Error("should never invoke a provider"); };
  await assert.rejects(() => searchOpenFdaLabels("apixaban", { accessScopes: ["customer"] }, { fetchImpl: neverFetch }), (error) => error.statusCode === 403);
  await assert.rejects(() => searchOpenFdaLabels("apixaban", {}, { fetchImpl: neverFetch }), (error) => error.statusCode === 403);
});

test("FDA query is fixed-host read-only and outputs minimal source-labelled records", async () => {
  let requested = false;
  const fakeFetch = async (url, options) => {
    requested = true;
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.fda.gov");
    assert.equal(parsed.pathname, "/drug/label.json");
    assert.equal(parsed.searchParams.get("search"), 'openfda.generic_name:"apixaban"');
    assert.equal(parsed.searchParams.get("limit"), "5");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Accept, "application/json");
    return { ok: true, status: 200, json: async () => sourcePayload };
  };
  const result = await searchOpenFdaLabels("apixaban", board, { fetchImpl: fakeFetch });
  assert.equal(requested, true);
  assert.equal(result.sourceId, "us.fda.openfda-labels");
  assert.equal(result.jurisdiction, "United States");
  assert.equal(result.dataState, "public_source_observations");
  assert.equal(result.truncated, true);
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.records[0].genericNames, ["APIXABAN"]);
  assert.equal(JSON.stringify(result).includes("Do not transmit"), false);
  assert.equal(JSON.stringify(result).includes("approvalStatus"), false);
});

test("FDA request rejects search grammar injection and handles official empty and unavailable states", async () => {
  await assert.rejects(() => searchOpenFdaLabels('apixaban" OR user:admin', board), (error) => error.statusCode === 400);
  const missing = await searchOpenFdaLabels("apixaban", board, { fetchImpl: async () => ({ status: 404, ok: false }) });
  assert.equal(missing.dataState, "no_source_matches");
  assert.deepEqual(missing.records, []);
  for (const status of [429, 500]) {
    await assert.rejects(() => searchOpenFdaLabels("apixaban", board, { fetchImpl: async () => ({ status, ok: false }) }), (error) => error.statusCode === 503);
  }
  await assert.rejects(() => searchOpenFdaLabels("apixaban", board, { fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({ results: null }) }) }), (error) => error.statusCode === 503);
});
