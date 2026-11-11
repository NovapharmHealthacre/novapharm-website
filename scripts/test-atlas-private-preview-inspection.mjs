import assert from "node:assert/strict";
import test from "node:test";
import { freePreviewAtlasCollections, freePreviewAtlasIndexSpecs } from "../src/data/atlas-free-preview.mjs";
import {
  freePreviewSecureParameter, inspectPrivateAtlasPreview, verifyPrivatePreviewUri,
} from "../src/data/atlas-private-preview-inspection.mjs";

const uri = "mongodb+srv://npi_preview_observer:fixture-password-only@npi-bootstrap.t9cf7ht.mongodb.net/novapharm_intelligence_preview?retryWrites=false&w=majority&appName=novapharm-intelligence-preview-observer";
const environment = Object.freeze({
  AWS_REGION: "eu-north-1",
  NPI_ATLAS_PRIVATE_INSPECTION_ENABLED: "true",
  NPI_ATLAS_PREVIEW_ONLY: "true",
  NPI_ATLAS_CUSTOMER_ACCESS_ENABLED: "false",
  NPI_ATLAS_BILLING_ENABLED: "false",
  NPI_ATLAS_PATIENT_DATA_ENABLED: "false",
});

function harness({ counts = {}, indexOverride = {}, ping = 1, fakeLeak = false } = {}) {
  const actions = { parameterReads: [], connects: 0, closes: 0, databases: [] };
  const readParameter = async options => {
    actions.parameterReads.push(options);
    return { Parameter: { Value: fakeLeak ? uri.replace("npi-bootstrap.t9cf7ht.mongodb.net", "wrong.test") : uri } };
  };
  const createClient = async (_, options) => {
    assert.equal(options.retryWrites, false);
    assert.equal(options.maxPoolSize, 3);
    return {
      async connect() { actions.connects++; },
      async close() { actions.closes++; },
      db(database) {
        actions.databases.push(database);
        return {
          async command(c) { assert.deepEqual(c, { ping: 1 }); return { ok: ping }; },
          listCollections: () => ({ toArray: async () => Object.values(freePreviewAtlasCollections).map(name => ({ name })) }),
          collection(name) {
            const expected = freePreviewAtlasIndexSpecs.find(i => i.collection === name);
            return {
              countDocuments: async filter => { assert.deepEqual(filter, {}); return counts[name] ?? 0; },
              listIndexes: () => ({ toArray: async () => [
                { name: "_id_", key: { _id: 1 } },
                indexOverride[name] ?? { name: expected.name, key: expected.keys },
              ] }),
            };
          },
        };
      },
    };
  };
  return { actions, readParameter, createClient };
}

test("operator flags fail closed before reading encrypted credentials", async () => {
  const h = harness();
  for (const bad of [
    {}, { ...environment, AWS_REGION: "us-east-1" },
    { ...environment, NPI_ATLAS_PRIVATE_INSPECTION_ENABLED: "false" },
    { ...environment, NPI_ATLAS_PREVIEW_ONLY: "false" },
    { ...environment, NPI_ATLAS_CUSTOMER_ACCESS_ENABLED: "true" },
    { ...environment, NPI_ATLAS_BILLING_ENABLED: "true" },
    { ...environment, NPI_ATLAS_PATIENT_DATA_ENABLED: "true" },
  ]) await assert.rejects(inspectPrivateAtlasPreview({ environment: bad, ...h }), /disabled/);
  assert.equal(h.actions.parameterReads.length, 0);
});

test("exact pinned SRV host, user, database and TLS required", () => {
  assert.equal(verifyPrivatePreviewUri(uri), uri);
  for (const bad of [
    uri.replace("npi-bootstrap.t9cf7ht.mongodb.net", "evil.example.com"),
    uri.replace("novapharm_intelligence_preview", "admin"),
    uri.replace("mongodb+srv", "mongodb"),
    uri.replace("npi_preview_observer", "admin"),
    uri + "&tls=false", uri + "&ssl=false", uri + "&directConnection=true",
    uri + "&authSource=other", "wrong", null,
  ]) assert.throws(() => verifyPrivatePreviewUri(bad), /Unapproved/);
});

test("private read-only ping verifies complete schema and exact index keys without granting production", async () => {
  const h = harness({ counts: { npi_source_registry_preview: 4 } });
  const result = await inspectPrivateAtlasPreview({ environment, ...h });
  assert.deepEqual(h.actions.parameterReads, [{ Name: freePreviewSecureParameter, WithDecryption: true }]);
  assert.deepEqual(h.actions.databases, ["novapharm_intelligence_preview"]);
  assert.equal(h.actions.connects, 1);
  assert.equal(h.actions.closes, 1);
  assert.equal(result.schemaPresent, true);
  assert.equal(result.counts.npi_source_registry_preview, 4);
  assert.equal(result.acceptedMedicineRows, 0);
  assert.equal(result.licensedSourceRightsVerified, false);
  assert.equal(result.customerAccessAllowed, false);
  assert.equal(result.enterpriseProductionAccepted, false);
  assert.equal(JSON.stringify(result).includes("fixture-password-only"), false);
});

test("swapped target rejects and hides the connection credential", async () => {
  const h = harness({ fakeLeak: true });
  await assert.rejects(inspectPrivateAtlasPreview({ environment, ...h }), e => {
    assert.equal(e.message, "Private Atlas connection or governance inspection unavailable.");
    assert.equal(e.message.includes("fixture-password-only"), false);
    return true;
  });
  assert.equal(h.actions.connects, 0);
});

test("changed compound index denies access and closes client", async () => {
  const h = harness({ indexOverride: {
    npi_medicine_evidence_preview: { name: "by_workspace_medicine_time", key: { medicine_identity: 1 } },
  } });
  await assert.rejects(inspectPrivateAtlasPreview({ environment, ...h }), /unavailable/);
  assert.equal(h.actions.closes, 1);
});

test("failed MongoDB ping never becomes production acceptance", async () => {
  const h = harness({ ping: 0 });
  await assert.rejects(inspectPrivateAtlasPreview({ environment, ...h }), /unavailable/);
  assert.equal(h.actions.closes, 1);
});
