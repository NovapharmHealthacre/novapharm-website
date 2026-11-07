import test from "node:test";
import assert from "node:assert/strict";
import { SYNTHETIC_CONTACT_SCHEMA, installStagingRetention } from "./staging-schema.mjs";

test("strict synthetic-only schema rejects real users by design", () => {
  const p = SYNTHETIC_CONTACT_SCHEMA.$jsonSchema.properties;
  assert.deepEqual(p.classification.enum, ["SYNTHETIC_ONLY"]);
  assert.deepEqual(p.productionAccepted.enum, [false]);
  assert.equal(p.expiresAt.bsonType, "date");
  assert.match(p.email.pattern, /example/);
  assert.equal(SYNTHETIC_CONTACT_SCHEMA.$jsonSchema.additionalProperties, false);
  assert.deepEqual(p.notification.enum, ["disabled"]);
  assert.deepEqual(p.schemaVersion.enum, [1]);
  assert.match(p.name.pattern, /SYNTHETIC/);
  assert.match(p.message.pattern, /SYNTHETIC DATA/);
  assert.deepEqual(
    [...SYNTHETIC_CONTACT_SCHEMA.$jsonSchema.required].sort(),
    Object.keys(p).sort(),
    "Every allowed synthetic receipt field is required; no unexpected document fields"
  );
});
test("index migration only applies in staging and requires TTL", async () => {
  const commands = [];
  const indexes = [];
  const database = {
    databaseName: "novapharm_staging",
    async command(payload) { commands.push(payload); return { ok: 1 }; },
    collection(name) {
      assert.equal(name, "contact_receipts_synthetic");
      return { async createIndex(keys,opts) { indexes.push({ keys,opts }); } };
    }
  };
  const result = await installStagingRetention({ database });
  assert.equal(result.syntheticOnly, true);
  assert.equal(commands[0].validationLevel, "strict");
  assert.equal(commands[0].validationAction, "error");
  assert.deepEqual(indexes, [{ keys: { expiresAt: 1 }, opts: { name: "synthetic_ttl_24h", expireAfterSeconds: 0 } }]);
});
test("refuses production database migrations", async () => {
  await assert.rejects(installStagingRetention({ database: { databaseName: "novapharm_production", command() {} } }), /Refusing/);
});
