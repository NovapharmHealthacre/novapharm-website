import test from "node:test";
import assert from "node:assert/strict";
import { discoverUkTenderNotices } from "../src/core/intelligence-uk-tender-discovery.mjs";

const board = { accessScopes: ["board"] };
const now = new Date("2026-11-11T06:30:00.000Z");
const from = "2026-11-04T06:30:00";
const to = "2026-11-11T06:30:00";
const release = (id, title = "Apixaban oral medicines") => ({
  id, ocid: "ocds-" + id, date: "2026-11-10T14:00:00Z",
  tender: { title, description: "UK procurement", status: "active" },
});
const response = (body, options = {}) => ({
  ok: true,
  headers: {
    get: (key) => key === "content-type"
      ? (options.contentType ?? "application/json")
      : key === "content-length" ? (options.contentLength ?? null) : null,
  },
  text: async () => typeof body === "string" ? body : JSON.stringify(body),
});

function streamedResponse(chunks, contentLength = null) {
  let index = 0;
  let cancelled = false;
  return {
    value: {
      ok: true,
      headers: {
        get: (key) => key === "content-type" ? "application/json"
          : key === "content-length" ? contentLength : null,
      },
      body: {
        getReader: () => ({
          read: async () => index < chunks.length
            ? { done: false, value: chunks[index++] }
            : { done: true },
          cancel: async () => { cancelled = true; },
          releaseLock: () => {},
        }),
      },
    },
    wasCancelled: () => cancelled,
  };
}

test("only scoped board and admin identities can inspect tender discovery", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response({ releases: [release("087111-2026")] }); };
  await assert.rejects(discoverUkTenderNotices("apixaban", { accessScopes: ["customer"] }, { fetchImpl, now }), { statusCode: 403 });
  await assert.rejects(discoverUkTenderNotices("apixaban", { accessScopes: ["employee"] }, { fetchImpl, now }), { statusCode: 403 });
  assert.equal(calls, 0);
  const answer = await discoverUkTenderNotices("apixaban", { accessScopes: ["admin"] }, { fetchImpl, now });
  assert.equal(answer.decisionReady, false);
  assert.equal(answer.customerAvailable, false);
  assert.equal(answer.automaticApplication, false);
});

test("follows bounded same-origin official pages and preserves the seven-day window", async () => {
  let calls = 0;
  const pages = [
    {
      releases: [release("087111-2026"), release("invalid-external-url", "Apixaban supplies")],
      links: { next: "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?updatedFrom=" +
        encodeURIComponent(from) + "&updatedTo=" + encodeURIComponent(to) + "&limit=50&cursor=page-2" },
    },
    { releases: [release("087112-2026", "Cleaning services"), release("087111-2026")], links: {} },
  ];
  const result = await discoverUkTenderNotices("Apixaban", board, {
    now,
    fetchImpl: async (address) => {
      calls++;
      const url = new URL(address);
      assert.equal(url.protocol, "https:");
      assert.equal(url.origin, "https://www.find-tender.service.gov.uk");
      assert.equal(url.pathname, "/api/1.0/ocdsReleasePackages");
      assert.equal(url.searchParams.get("updatedFrom"), from);
      assert.equal(url.searchParams.get("updatedTo"), to);
      assert.equal(url.searchParams.get("limit"), "50");
      if (calls === 1) assert.equal(url.searchParams.has("cursor"), false);
      if (calls === 2) assert.equal(url.searchParams.get("cursor"), "page-2");
      return response(pages[calls - 1]);
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.pageCount, 2);
  assert.equal(result.examinedReleases, 4);
  assert.equal(result.matches.length, 2);
  assert.equal(result.matches[0].noticeUrl, "https://www.find-tender.service.gov.uk/Notice/087111-2026");
  assert.equal(result.matches[1].noticeUrl, null);
  assert.equal(result.truncated, false);
  assert.equal(result.automaticApplication, false);
  assert.equal(result.decisionReady, false);
  assert.match(result.coverage, /bounded sample, not a complete tender search/);
});

test("pagination stops after three pages and marks remaining results truncated", async () => {
  let calls = 0;
  const result = await discoverUkTenderNotices("apixaban", board, {
    now,
    fetchImpl: async (address) => {
      calls++;
      const url = new URL(address);
      assert.equal(url.hostname, "www.find-tender.service.gov.uk");
      const many = Array.from({ length: 50 }, (_, i) =>
        release("087" + String(calls).padStart(3, "0") + "-" + String(i + 1).padStart(4, "0")));
      return response({ releases: many, links: { next: "?cursor=page-" + (calls + 1) } });
    },
  });
  assert.equal(calls, 3);
  assert.equal(result.pageCount, 3);
  assert.equal(result.examinedReleases, 150);
  assert.equal(result.matches.length, 150);
  assert.equal(result.truncated, true);
  assert.equal(result.customerAvailable, false);
  assert.equal(result.automaticApplication, false);
});

test("deduplicates repeated release identifiers across pages", async () => {
  let calls = 0;
  const result = await discoverUkTenderNotices("apixaban", board, {
    now,
    fetchImpl: async () => {
      calls++;
      return response(calls === 1
        ? { releases: [release("087111-2026")], links: { next: "?cursor=next" } }
        : { releases: [release("087111-2026"), release("087112-2026")] });
    },
  });
  assert.equal(result.matches.length, 2);
});

test("rejects duplicate cursor and query parameters without following them", async () => {
  let calls = 0;
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now,
    fetchImpl: async () => {
      calls++;
      return response({
        releases: [release("087111-2026")],
        links: { next: "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?cursor=first&cursor=second" },
      });
    },
  }), { statusCode: 503 });
  assert.equal(calls, 1);
});

test("rejects cross-origin or path-changing next links without following them", async () => {
  for (const next of [
    "https://attacker.example/collect",
    "https://www.find-tender.service.gov.uk/other?cursor=page-2",
    "https://www.find-tender.service.gov.uk:8443/api/1.0/ocdsReleasePackages?cursor=page-2",
  ]) {
    let calls = 0;
    await assert.rejects(discoverUkTenderNotices("apixaban", board, {
      now,
      fetchImpl: async () => {
        calls++;
        return response({ releases: [release("087111-2026")], links: { next } });
      },
    }), { statusCode: 503 });
    assert.equal(calls, 1);
  }
});

test("rejects oversized and unexpected cursors without following them", async () => {
  for (const next of [
    "?cursor=",
    "?cursor=page-2&stages=award",
    "?cursor=page-2&updatedFrom=2026-01-01T00%3A00%3A00",
    "?limit=50",
    "?cursor=" + "x".repeat(1025),
  ]) {
    let calls = 0;
    await assert.rejects(discoverUkTenderNotices("apixaban", board, {
      now,
      fetchImpl: async () => {
        calls++;
        return response({ releases: [release("087111-2026")], links: { next } });
      },
    }), { statusCode: 503 });
    assert.equal(calls, 1);
  }
});

test("rejects malformed JSON media types and malformed content-length", async () => {
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now, fetchImpl: async () => response({ releases: [] }, { contentType: "application/notjson" }),
  }), { statusCode: 503 });
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now, fetchImpl: async () => response({ releases: [] }, { contentLength: "4MB" }),
  }), { statusCode: 503 });
});

test("UTF-8 fallback cap rejects oversized multibyte responses", async () => {
  const unicodeDescription = "🎓".repeat(1_050_000);
  const json = JSON.stringify({
    releases: [{ ...release("087111-2026"), tender: { title: "Apixaban", description: unicodeDescription } }],
  });
  assert.ok(json.length < 4_000_000, "UTF-16 length alone would wrongly pass");
  assert.ok(Buffer.byteLength(json, "utf8") > 4_000_000, "UTF-8 is over limit");
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now, fetchImpl: async () => response(json),
  }), { statusCode: 503 });
});

test("streaming byte cap cancels an oversized upstream body before buffering it", async () => {
  const streamed = streamedResponse([new Uint8Array(4_000_001)]);
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now, fetchImpl: async () => streamed.value,
  }), { statusCode: 503 });
  assert.equal(streamed.wasCancelled(), true);
});

test("zero sampled matches must not be presented as no UK opportunities", async () => {
  const result = await discoverUkTenderNotices("ondansetron", board, {
    now, fetchImpl: async () => response({ releases: [release("087111-2026")] }),
  });
  assert.deepEqual(result.matches, []);
  assert.match(result.limitations[0], /not proof/);
});

test("invalid queries and untrusted upstream fail closed", async () => {
  for (const query of ["x", "https://bad.example", "<script>", "a".repeat(81)]) {
    await assert.rejects(discoverUkTenderNotices(query, board, {
      now, fetchImpl: async () => response({ releases: [] }),
    }), { statusCode: 400 });
  }
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now, fetchImpl: async () => response("hello", { contentType: "text/html" }),
  }), { statusCode: 503 });
  await assert.rejects(discoverUkTenderNotices("apixaban", board, {
    now, fetchImpl: async () => { throw new Error("private socket details"); },
  }), { statusCode: 503 });
});
