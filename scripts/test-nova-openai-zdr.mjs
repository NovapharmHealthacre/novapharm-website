import assert from "node:assert/strict";
import { test } from "node:test";
import { createOpenAiZdrProvider } from "../src/core/ai/provider-openai-zdr.mjs";
import { configuredInternalProvider } from "../src/core/ai/model-registry.mjs";

const approved = {
  apiKey: "synthetic-project-key-not-real",
  productionApproved: true,
  euZdrApproved: true,
};
const manifest = {
  verifiedServerSide: true,
  externalAiRightsApproved: true,
  humanReviewRequired: true,
  sourceIds: ["synthetic-approved-source"],
};

test("NOVA defaults to no external model and refuses unsupported or unapproved production configuration", () => {
  assert.equal(configuredInternalProvider({ NODE_ENV: "production" }).id, "none");
  assert.throws(() => createOpenAiZdrProvider({ ...approved, productionApproved: false }), (error) => error.code === "nova_release_not_approved");
  assert.throws(() => createOpenAiZdrProvider({ ...approved, euZdrApproved: false }), (error) => error.code === "nova_release_not_approved");
  assert.throws(() => createOpenAiZdrProvider({ ...approved, endpoint: "https://attacker.invalid" }), (error) => error.code === "nova_endpoint_not_approved");
  assert.throws(() => createOpenAiZdrProvider({ ...approved, model: "unreviewed-model" }), (error) => error.code === "nova_model_not_approved");
  assert.throws(() => createOpenAiZdrProvider({ ...approved, apiKey: "" }), (error) => error.code === "nova_credentials_missing");
  assert.throws(() => configuredInternalProvider({ NODE_ENV: "production", INTERNAL_AI_PROVIDER: "openai-zdr" }), (error) => error.code === "nova_release_not_approved");
});

test("NOVA requires independent server-authorised evidence before making any provider request", async () => {
  const provider = createOpenAiZdrProvider({ ...approved, fetchImplementation: () => { throw Error("network must remain disabled"); } });
  await assert.rejects(() => provider.complete({ system: "Review sources.", prompt: "Review.", sourceManifest: { verifiedServerSide: true } }), (error) => error.code === "nova_source_rights_not_approved");
  await assert.rejects(() => provider.complete({ system: "", prompt: "Review.", sourceManifest: manifest }), (error) => error.code === "nova_input_rejected");
});

test("NOVA rejects malformed, duplicate or excessive source identifiers before external requests", async () => {
  let requests = 0;
  const provider = createOpenAiZdrProvider({
    ...approved,
    fetchImplementation: async () => {
      requests += 1;
      throw Error("Invalid evidence must never reach an external service");
    },
  });
  const rejectedIds = [
    [" "],
    [42],
    ["ok", "ok"],
    ["bad id with spaces"],
    Array.from({ length: 17 }, (_, index) => `source-${index}`),
  ];
  for (const sourceIds of rejectedIds) {
    await assert.rejects(
      () => provider.complete({
        system: "Use only approved sources.",
        prompt: "Compare evidence.",
        sourceManifest: { ...manifest, sourceIds },
      }),
      (error) => error.code === "nova_source_rights_not_approved",
    );
  }
  assert.equal(requests, 0);
});

test("NOVA rejects credential-like prompt content before provider egress", async () => {
  let requests = 0;
  const provider = createOpenAiZdrProvider({
    ...approved,
    fetchImplementation: async () => { requests += 1; throw Error("No credential egress"); },
  });
  await assert.rejects(
    () => provider.complete({
      system: "Review source.",
      prompt: "Please include api_key=synthetic-never-send in your explanation.",
      sourceManifest: manifest,
    }),
    (error) => error.code === "nova_sensitive_input_rejected",
  );
  await assert.rejects(
    () => provider.complete({
      system: "password: synthetic-secret",
      prompt: "Review the source.",
      sourceManifest: manifest,
    }),
    (error) => error.code === "nova_sensitive_input_rejected",
  );
  assert.equal(requests, 0);
});

test("NOVA EU Responses request is bounded, stateless, tool-free and never stored", async () => {
  let requestCount = 0;
  const provider = createOpenAiZdrProvider({
    ...approved,
    fetchImplementation: async (url, request) => {
      requestCount += 1;
      assert.equal(url, "https://eu.api.openai.com/v1/responses");
      assert.equal(request.method, "POST");
      assert.equal(request.redirect, "error");
      assert.equal(request.cache, "no-store");
      assert.equal(request.headers.Authorization, "Bearer synthetic-project-key-not-real");
      const body = JSON.parse(request.body);
      assert.equal(body.model, "gpt-6-luna");
      assert.equal(body.store, false);
      assert.equal(body.background, false);
      assert.equal(body.stream, false);
      assert.equal(body.max_output_tokens, 380);
      assert.equal(Object.hasOwn(body, "tools"), false);
      assert.equal(Object.hasOwn(body, "conversation"), false);
      assert.equal(Object.hasOwn(body, "previous_response_id"), false);
      return {
        ok: true,
        json: async () => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Source 1 requires further human verification." }] }] }),
      };
    },
  });
  const result = await provider.complete({ system: "Never make regulated decisions.", prompt: "Explain source 1.", sourceManifest: manifest });
  assert.equal(result, "Source 1 requires further human verification.");
  assert.equal(requestCount, 1);
  assert.equal(JSON.stringify({ result }).includes(approved.apiKey), false);
});

test("NOVA fails closed for unavailable, incomplete and empty model outputs", async () => {
  const base = { ...approved };
  const badHttp = createOpenAiZdrProvider({ ...base, fetchImplementation: async () => ({ ok: false, status: 429 }) });
  await assert.rejects(() => badHttp.complete({ system: "x", prompt: "y", sourceManifest: manifest }), (error) => error.code === "nova_upstream_unavailable");
  const incomplete = createOpenAiZdrProvider({ ...base, fetchImplementation: async () => ({ ok: true, json: async () => ({ status: "incomplete", output: [] }) }) });
  await assert.rejects(() => incomplete.complete({ system: "x", prompt: "y", sourceManifest: manifest }), (error) => error.code === "nova_incomplete_response");
  const empty = createOpenAiZdrProvider({ ...base, fetchImplementation: async () => ({ ok: true, json: async () => ({ status: "completed", output: [] }) }) });
  await assert.rejects(() => empty.complete({ system: "x", prompt: "y", sourceManifest: manifest }), (error) => error.code === "nova_empty_response");
});
