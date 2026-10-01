import assert from "node:assert/strict";
import test from "node:test";
import { enquiryRequest, requireEnquiryReceipt, submissionUnconfirmed } from "../lib/enquiry-receipt";

test("only a persisted lead receipt confirms an enquiry, including a deduplicated lead", async () => {
  for (const duplicate of [false, true]) {
    assert.deepEqual(await requireEnquiryReceipt(Response.json({ ok: true, lead: { id: "fixture-lead", leadNumber: "NP-LEAD-FIXTURE", duplicate } }, { status: 201 })), { id: "fixture-lead", reference: "NP-LEAD-FIXTURE" });
  }
});

test("enquiry requests have a deadline, preserve cancellation and stay same-origin", async (context) => {
  const deadline = new AbortController();
  context.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 20_000);
    return deadline.signal;
  });
  const caller = new AbortController();
  let signal: AbortSignal | undefined;
  context.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "/api/platform/contact");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.method, "POST");
    signal = options.signal as AbortSignal;
    return Response.json({ ok: true });
  });
  await enquiryRequest("/contact", { method: "POST", signal: caller.signal });
  assert.equal(signal?.aborted, false);
  caller.abort();
  assert.equal(signal?.aborted, true);
  await enquiryRequest("/contact", { method: "POST" });
  deadline.abort();
  assert.equal(signal?.aborted, true);
});

test("HTTP success without a valid persisted receipt cannot claim completion", async () => {
  for (const payload of [null, {}, { ok: false }, { ok: true }, { ok: true, lead: { id: null } }, { ok: true, lead: { id: "fixture", leadNumber: " " } }]) {
    await assert.rejects(requireEnquiryReceipt(Response.json(payload)), { message: "receipt_unconfirmed", status: 502 });
  }
  await assert.rejects(requireEnquiryReceipt(new Response("<html>Maintenance</html>")), { status: 502 });
  await assert.rejects(requireEnquiryReceipt(new Response(null, { status: 204 })), { status: 502 });
});

test("rejection status is preserved and uncertain writes remain distinct from pre-submit failure", async () => {
  await assert.rejects(requireEnquiryReceipt(Response.json({ error: "Rate limited" }, { status: 429 })), { status: 429 });
  assert.equal(submissionUnconfirmed(0, true), true);
  assert.equal(submissionUnconfirmed(503, true), true);
  assert.equal(submissionUnconfirmed(502, true), true);
  assert.equal(submissionUnconfirmed(503, false), false);
  assert.equal(submissionUnconfirmed(403, true), false);
  assert.equal(submissionUnconfirmed(429, true), false);
});
