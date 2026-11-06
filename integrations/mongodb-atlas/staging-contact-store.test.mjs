import test from "node:test";
import assert from "node:assert/strict";
import { createSyntheticContactStore, validateSyntheticContact } from "./staging-contact-store.mjs";
import { SYNTHETIC_CONTACT_SCHEMA } from "./staging-schema.mjs";

const valid = {
  name: "SYNTHETIC-Atlas-test",
  email: "qa@example.com",
  company: "NovaPharm QA",
  message: "SYNTHETIC DATA: zero real customer information.",
  enquiryType: "General enquiry",
  acceptedSafetyNotice: true
};
function testClient({ acknowledged = true, fail = false } = {}) {
  const records = [];
  const client = {
    db(name) {
      assert.equal(name, "novapharm_staging");
      return { collection(collection) {
        assert.equal(collection, "contact_receipts_synthetic");
        return {
          async insertOne(value, options) {
            assert.deepEqual(options, { writeConcern: { w: "majority" } });
            if (fail) throw Error("Atlas unavailable");
            records.push(value);
            return { acknowledged, insertedId: value._id };
          },
          async findOne(query) { return records.find(x=>x._id === query._id && x.classification === query.classification) ?? null; }
        };
      } };
    }
  };
  return { client, records };
}
test("staging-only synthetic receipt is stored with 24-hour expiration", async () => {
  const { client, records } = testClient();
  const adapter = createSyntheticContactStore({ client });
  const receipt = await adapter.store(valid);
  assert.equal(receipt.persisted, true);
  assert.equal(receipt.live, false);
  assert.equal(receipt.notification, "disabled");
  assert.equal(records.length, 1);
  assert.equal(records[0].classification, "SYNTHETIC_ONLY");
  assert.equal(records[0].productionAccepted, false);
  assert.equal(records[0].expiresAt - records[0].createdAt, 86_400_000);
  assert.deepEqual(
    Object.keys(records[0]).sort(),
    Object.keys(SYNTHETIC_CONTACT_SCHEMA.$jsonSchema.properties).sort(),
    "The actual stored document must match the strict database field allowlist"
  );
  assert.equal(await adapter.verify(receipt.id), true);
});
test("does not report a receipt when write acknowledgement is unavailable", async () => {
  const { client } = testClient({ acknowledged: false });
  await assert.rejects(createSyntheticContactStore({ client }).store(valid), /acknowledgement/);
});
test("fails closed on actual database errors", async () => {
  const { client } = testClient({ fail: true });
  await assert.rejects(createSyntheticContactStore({ client }).store(valid), /Atlas unavailable/);
});
for (const [label, payload] of [
  ["customer name", { ...valid, name: "Real customer" }],
  ["real email", { ...valid, email: "real@novapharmhealthcare.com" }],
  ["missing consent", { ...valid, acceptedSafetyNotice: false }],
  ["unsafe message", { ...valid, message: "SYNTHETIC DATA <script>" }],
  ["bot honeypot", { ...valid, website: "spam.test" }],
  ["unreviewed metadata", { ...valid, arbitraryMetadata: "should-not-be-stored" }],
  ["production accepted flag", { ...valid, productionAccepted: true }],
  ["patient identifier", { ...valid, patientId: "fake-patient-id" }],
]) {
  test("rejects " + label, () => assert.throws(() => validateSyntheticContact(payload)));
}
test("refuses production database selection", () => {
  const {client} = testClient();
  assert.throws(() => createSyntheticContactStore({client, dbName:"novapharm_production"}));
});
