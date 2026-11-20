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
  const sourceAllowlist = block.indexOf("Object.hasOwn(OFFICIAL_LIVE_PROBE_PLANS, sourceId)");
  const quota = block.indexOf('rateLimit(request, "official-public-live-source-probe"');
  const fetch = block.indexOf("await probeOfficialPublicPharmaSource(sourceId)");
  assert.ok(auth >= 0);
  assert.ok(flag > auth,"Default-off feature flag must be checked after independent session validation");
  assert.ok(sourceAllowlist > flag,"Only opted-in board requests can validate source identity");
  assert.ok(quota > sourceAllowlist,"Unauthenticated, disabled or invalid-source requests cannot exhaust the scarce publisher-call quota");
  assert.ok(fetch > quota,"Official outbound fetch must remain behind a strict rate limit");
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

test("protected source gateway adds Canadian and Spanish receipts without weakening FDA/HSA guards", () => {
  const block = server.slice(begin, end);
  const gateway = readFileSync(new URL("../apps/portal/app/gateway/[...path]/route.ts", import.meta.url), "utf8");
  const canada = readFileSync(new URL("../src/core/intelligence-canada-dpd-public-live-probe.mjs", import.meta.url), "utf8");
  const spain = readFileSync(new URL("../src/core/intelligence-es-cima-public-live-probe.mjs", import.meta.url), "utf8");
  const constraints = JSON.parse(readFileSync(new URL("../config/intelligence/owner-production-constraints.json", import.meta.url), "utf8"));

  assert.ok(server.includes('import { CA_DPD_SOURCE, probeCanadianDpdPublicSource }'));
  assert.ok(server.includes('import { ES_CIMA_PROBE, probeCimaPublicMedicine }'));
  assert.ok(block.includes("sourceId !== CA_DPD_SOURCE.sourceId"));
  assert.ok(block.includes("sourceId !== ES_CIMA_PROBE.sourceId"));
  assert.ok(block.includes("await probeCanadianDpdPublicSource()"));
  assert.ok(block.includes("await probeCimaPublicMedicine()"));
  assert.ok(block.includes("await probeOfficialPublicPharmaSource(sourceId)"));

  const auth = block.indexOf('scopedAuthentication(request, response, ["board"])');
  const disabled = block.indexOf('NPI_OFFICIAL_PUBLIC_SOURCE_PROBE_ENABLED !== "true"');
  const allowlist = block.indexOf("Object.hasOwn(OFFICIAL_LIVE_PROBE_PLANS, sourceId)");
  const quota = block.indexOf('rateLimit(request, "official-public-live-source-probe"');
  const canadaCall = block.indexOf("await probeCanadianDpdPublicSource()");
  const spainCall = block.indexOf("await probeCimaPublicMedicine()");
  assert.ok(auth >= 0 && disabled > auth && allowlist > disabled && quota > allowlist);
  assert.ok(canadaCall > quota && spainCall > quota);
  assert.ok(!block.includes("response.body") && !block.includes("sourceRecords"));
  assert.ok(canada.includes('sourceId: "ca-health-canada-dpd"'));
  assert.ok(spain.includes('sourceId:"es-aemps-cima"'));
  assert.ok(canada.includes("canPublish:false") && canada.includes("rawDrugRecordsRetained:false"));
  assert.ok(spain.includes("canPublish:false") && spain.includes("rawMedicineRecordsRetained:false"));

  const exactPath = "v1/intelligence/sources/official/public-live-probe";
  assert.ok(gateway.includes(String.raw`/^v1\/intelligence\/sources\/official\/public-live-probe$/`));
  const methodGuard = gateway.indexOf('path === "' + exactPath + '") && request.method !== "GET"');
  const upstreamTarget = gateway.indexOf("target = new URL(");
  assert.ok(methodGuard > 0 && methodGuard < upstreamTarget,
    "Non-GET methods must fail before the protected gateway considers the upstream");
  assert.equal(constraints.productionSignoff, "not_granted");
  assert.equal(constraints.productionPermissions.activatePublicCustomerAccess, false);
  assert.equal(constraints.productionPermissions.admitUnapprovedMedicineData, false);
});

test("NHSBSA private probe authenticates board scope and checks default-off flag before consuming rate quota", () => {
  const start = server.indexOf('if (pathname === "/api/v1/intelligence/sources/nhsbsa/epd/private-probe" && request.method === "GET")');
  const stop = server.indexOf('if (pathname === "/api/v1/intelligence/visual/readiness" && request.method === "GET")', start);
  assert.ok(start > 0 && stop > start, "NHSBSA source route must be a separate GET-only handler");
  const block = server.slice(start, stop);
  const auth = block.indexOf('scopedAuthentication(request, response, ["board"])');
  const enabled = block.indexOf('NPI_NHSBSA_PRIVATE_API_PROBE_ENABLED !== "true"');
  const quota = block.indexOf('rateLimit(request, "nhsbsa-private-source-probe"');
  const provider = block.indexOf("await inspectNhsbsaEpdPrivateApi(");
  assert.ok(auth >= 0 && enabled > auth && quota > enabled && provider > quota,
    "Only authenticated, enabled board requests may consume quota or query NHSBSA");
  assert.ok(block.includes("if (!session) return;"));
  assert.ok(block.includes("return json(response, 429"));
  assert.ok(!block.includes("customerAccessEnabled: true"));
});
