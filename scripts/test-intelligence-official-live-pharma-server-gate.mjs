import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const server = readFileSync(new URL("../server.mjs", import.meta.url), "utf8");
const route = '/api/v1/intelligence/sources/official/public-live-probe';
const begin = server.indexOf('if (pathname === "' + route + '" && request.method === "GET")');
const end = server.indexOf('if (pathname === "/api/v1/intelligence/sources/nhsbsa/epd/private-probe"',begin);

test("only authenticated board sessions can reach live public pharmaceutical source probe route",()=>{
  assert.ok(begin > 0,"Explicit GET-only source probe route must be installed");
  assert.ok(end > begin,"Source probe must be self-contained before existing private route");
  const block = server.slice(begin,end);
  const auth = block.indexOf('scopedAuthentication(request, response, ["board"])');
  const flag = block.indexOf('NPI_OFFICIAL_PUBLIC_SOURCE_PROBE_ENABLED !== "true"');
  const fetch = block.indexOf("await probeOfficialPublicPharmaSource(sourceId)");
  assert.ok(block.includes("rateLimit(request,"));
  assert.ok(auth >= 0);
  assert.ok(flag > auth,"Default-off feature flag must be checked after independent session validation");
  assert.ok(fetch > flag,"Network must be impossible before board auth and feature approval");
  assert.ok(block.includes("Object.hasOwn(OFFICIAL_LIVE_PROBE_PLANS, sourceId)"));
  assert.ok(block.includes("return json(response, 400"));
  assert.ok(block.includes("return json(response, 429"));
  assert.ok(block.includes("return json(response, 503"));
  assert.ok(block.includes("return json(response, 200, receipt)"));
});

test("board route returns only a nonpublishable receipt; no customer search alias or public bypass",()=>{
  const block = server.slice(begin,end);
  assert.ok(!block.includes("rawRecords"));
  assert.ok(!block.includes("data.results"));
  assert.ok(!block.includes("req.body"));
  assert.ok(!block.includes("customer"));
  assert.ok(!block.includes("published"));
  assert.ok(!block.includes("customerAccessEnabled: true"));
  assert.ok(server.includes('import { probeOfficialPublicPharmaSource, OFFICIAL_LIVE_PROBE_PLANS }'));
  assert.equal(server.split(route).length - 1, 1,"Only one route may be defined");
  assert.ok(server.includes('function json(response, status, payload, headers = {})'));
  assert.ok(server.includes('"Cache-Control": "no-store"'));
});
