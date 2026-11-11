import test from "node:test";
import assert from "node:assert/strict";
import { discoverUkTenderNotices } from "../src/core/intelligence-uk-tender-discovery.mjs";

const board = { accessScopes: ["board"] };
const now = new Date("2026-11-11T06:30:00.000Z");
const release = {
  releases: [
    { id: "087111-2026", ocid: "ocds-example-1", date: "2026-11-10T14:00:00Z", tender: { title: "Apixaban oral medicines", description: "UK procurement", status: "active" } },
    { id: "invalid-external-url", ocid: "ocds-example-2", tender: { title: "Apixaban supplies", description: "Example", status: "active" } },
    { id: "087112-2026", tender: { title: "Cleaning services" } },
  ],
  links: { next: "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?cursor=xyz" },
};
const response = (body) => ({
  ok: true,
  headers: { get: (key) => key === "content-type" ? "application/json" : null },
  text: async () => JSON.stringify(body),
});

test("only scoped board and admin identities can inspect tender discovery", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response(release); };
  await assert.rejects(discoverUkTenderNotices("apixaban", { accessScopes: ["customer"] }, { fetchImpl, now }), { statusCode: 403 });
  await assert.rejects(discoverUkTenderNotices("apixaban", { accessScopes: ["employee"] }, { fetchImpl, now }), { statusCode: 403 });
  assert.equal(calls, 0);
  const answer = await discoverUkTenderNotices("apixaban", { accessScopes: ["admin"] }, { fetchImpl, now });
  assert.equal(answer.decisionReady, false);
  assert.equal(answer.customerAvailable, false);
});

test("source is a bounded official 7-day sample without false eligibility or exhaustive claims", async () => {
  let calledUrl;
  const result = await discoverUkTenderNotices("Apixaban", board, {
    now,
    fetchImpl: async (url) => { calledUrl = new URL(url); return response(release); },
  });
  assert.equal(calledUrl.hostname, "www.find-tender.service.gov.uk");
  assert.equal(calledUrl.searchParams.get("limit"), "50");
  assert.equal(calledUrl.searchParams.get("updatedFrom"), "2026-11-04T06:30:00");
  assert.equal(result.matches.length, 2);
  assert.equal(result.examinedReleases, 3);
  assert.equal(result.matches[0].noticeUrl, "https://www.find-tender.service.gov.uk/Notice/087111-2026");
  assert.equal(result.matches[1].noticeUrl, null);
  assert.equal(result.truncated, true);
  assert.equal(result.automaticApplication, false);
  assert.match(result.coverage, /Not a complete tender search/);
});

test("zero sampled matches must not be presented as no UK opportunities", async () => {
  const result = await discoverUkTenderNotices("ondansetron", board, { now, fetchImpl: async () => response(release) });
  assert.deepEqual(result.matches, []);
  assert.match(result.limitations[0], /not proof/);
});

test("invalid queries and untrusted upstream fail closed", async () => {
  for (const q of ["x", "https://bad.example", "<script>", "a".repeat(81)]) {
    await assert.rejects(discoverUkTenderNotices(q, board, { now, fetchImpl: async () => response(release) }), { statusCode: 400 });
  }
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now, fetchImpl: async () => ({ ok: true, headers: { get: () => "text/html" }, text: async () => "hello" }),
  }), { statusCode: 503 });
  await assert.rejects(discoverUkTenderNotices("apixaban", board, { now, fetchImpl: async () => { throw new Error("private socket details"); } }), { statusCode: 503 });
});
