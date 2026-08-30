import assert from "node:assert/strict";
import test from "node:test";
import { OnsPostcodeClient } from "../src/index.ts";

test("ONS postcode client sends a bounded POST and preserves temporal geography", async () => {
  let capturedBody = "";
  const fakeFetch: typeof fetch = async (_input, init) => {
    capturedBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ features: [{ attributes: {
      PCDS: "BA2 4BQ", DOINTR: "198001", DOTERM: null, LAT: 51.38319, LONG: -2.357146,
      CTRY25CD: "E92000001", LAD25CD: "E06000022", NHSER24CD: "E40000006", ICB26CD: "E54000040",
      SICBL26CD: "E38000231", LSOA21CD: "E01014370", MSOA21CD: "E02002991", RUC21IND: "UN1",
    } }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new OnsPostcodeClient({ endpoint: "https://example.test/FeatureServer/1", fetchImplementation: fakeFetch, maxRetries: 0 });
  const result = await client.lookup(["BA24BQ", "BA2 4BQ"]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.postcode, "BA2 4BQ");
  assert.equal(result[0]?.introduced, "1980-01-01");
  assert.equal(result[0]?.icbCode, "E54000040");
  const parameters = new URLSearchParams(capturedBody);
  assert.equal(parameters.get("where"), "PCDS IN ('BA2 4BQ')");
  assert.match(parameters.get("outFields") ?? "", /ICB26CD/iu);
});

test("ONS postcode client fails closed on service errors and excessive batches", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ error: { code: 400, message: "Invalid query" } }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new OnsPostcodeClient({ endpoint: "https://example.test/FeatureServer/1", fetchImplementation: fakeFetch, maxRetries: 0 });
  await assert.rejects(() => client.lookup(["BA2 4BQ"]), /service error 400/iu);
  await assert.rejects(() => client.lookup(Array.from({ length: 201 }, (_, index) => `BA${index} 4BQ`)), /invalid|between one and 200/iu);
});

test("ONS postcode client accepts lowercase fields from the official quarterly hosted table", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ features: [{ attributes: {
    pcds: "AL10 0JP", dointr: "198001", doterm: "202301", lat: "51.763353", long: "-0.227469",
    ctry25cd: "E92000001", lad25cd: "E07000241", nhser24cd: "E40000013", icb26cd: "E54000065",
  } }] }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new OnsPostcodeClient({ endpoint: "https://example.test/FeatureServer/0", fetchImplementation: fakeFetch, maxRetries: 0 });
  const result = await client.lookup(["AL10 0JP"]);
  assert.equal(result[0]?.terminated, "2023-01-01");
  assert.equal(result[0]?.latitude, 51.763353);
});

test("ONS postcode client preserves an authoritative record without inventing missing coordinates", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ features: [{ attributes: {
    PCDS: "GY1 1FF", DOINTR: "198001", DOTERM: null, LAT: null, LONG: null, CTRY25CD: null,
  } }] }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new OnsPostcodeClient({ endpoint: "https://example.test/FeatureServer/1", fetchImplementation: fakeFetch, maxRetries: 0 });
  const result = await client.lookup(["GY1 1FF"]);
  assert.equal(result[0]?.latitude, null);
  assert.equal(result[0]?.longitude, null);
  assert.equal(result[0]?.coordinateStatus, "not_published");
});

test("ONS postcode client maps live and quarterly 100/0 no-coordinate sentinels to an absent point", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ features: [{ attributes: {
    PCDS: "GY1 1AW", DOINTR: "199405", DOTERM: null, LAT: 100, LONG: 0, CTRY25CD: "L93000001",
  } }] }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new OnsPostcodeClient({ endpoint: "https://example.test/FeatureServer/1", fetchImplementation: fakeFetch, maxRetries: 0 });
  const result = await client.lookup(["GY1 1AW"]);
  assert.equal(result[0]?.coordinateStatus, "not_published");
  assert.equal(result[0]?.latitude, null);
  assert.equal(result[0]?.longitude, null);

  const quarterlyFetch: typeof fetch = async () => new Response(JSON.stringify({ features: [{ attributes: {
    pcds: "IM4 4RF", dointr: "199405", doterm: "200703", lat: "99.999999", long: "0.000000", ctry25cd: "M83000003",
  } }] }), { status: 200, headers: { "content-type": "application/json" } });
  const quarterlyClient = new OnsPostcodeClient({ endpoint: "https://example.test/FeatureServer/0", fetchImplementation: quarterlyFetch, maxRetries: 0 });
  const quarterly = await quarterlyClient.lookup(["IM4 4RF"]);
  assert.equal(quarterly[0]?.coordinateStatus, "not_published");
  assert.equal(quarterly[0]?.latitude, null);
});

test("ONS postcode client rejects malformed or half-populated coordinates", async () => {
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ features: [{ attributes: {
    PCDS: "BA2 4BQ", LAT: "not-a-coordinate", LONG: -2.357146,
  } }] }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new OnsPostcodeClient({ endpoint: "https://example.test/FeatureServer/1", fetchImplementation: fakeFetch, maxRetries: 0 });
  await assert.rejects(() => client.lookup(["BA2 4BQ"]), /BA2 4BQ latitude is invalid/iu);
});
