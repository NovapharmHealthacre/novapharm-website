import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const original = readFileSync("infra/aws/contact-synthetic/index.js", "utf8");
const key = "a".repeat(64);
function harness() {
  const records = [];
  const exports = {};
  class DynamoDBClient {
    async send(command) {
      records.push(command.input);
      return {};
    }
  }
  class PutItemCommand {
    constructor(input) { this.input = input; }
  }
  const sandbox = {
    exports,
    Buffer,
    Date,
    process: { env: { STAGING_TEST_KEY: key, TABLE_NAME: "novapharm-staging-contact-test" } },
    require(name) {
      if (name === "node:crypto") return crypto;
      if (name === "@aws-sdk/client-dynamodb") return { DynamoDBClient, PutItemCommand };
      throw Error("Unexpected module " + name);
    },
  };
  vm.runInNewContext(original, sandbox);
  return { handler: exports.handler, records };
}
const valid = {
  name: "SYNTHETIC-Sample",
  email: "qa@example.com",
  company: "NovaPharm QA",
  enquiryType: "General enquiry",
  message: "SYNTHETIC DATA: automated test with no personal or clinical data",
  acceptedSafetyNotice: true,
};
function request(data = valid, headers = {}) {
  return {
    rawPath: "/contact",
    requestContext: { http: { method: "POST" } },
    headers: { origin: "https://novapharmhealthcare.com", "content-type": "application/json", "x-novapharm-staging-key": key, ...headers },
    body: JSON.stringify(data),
  };
}
test("health identifies staging and does not claim public acceptance", async () => {
  const { handler } = harness();
  const x = await handler({ rawPath: "/health", requestContext: { http: { method: "GET" } } });
  assert.equal(x.statusCode, 200);
  assert.equal(JSON.parse(x.body).live, false);
  assert.equal(JSON.parse(x.body).acceptingPublicSubmissions, false);
});
test("only synthetic business data receives a stored receipt", async () => {
  const { handler, records } = harness();
  const x = await handler(request());
  assert.equal(x.statusCode, 201);
  assert.equal(JSON.parse(x.body).persisted, true);
  assert.equal(JSON.parse(x.body).live, false);
  assert.equal(records.length, 1);
  assert.equal(records[0].Item.classification.S, "SYNTHETIC_STAGING_ONLY");
});
test("anonymous public submission cannot store a record", async () => {
  const { handler, records } = harness();
  const x = await handler(request(valid, { "x-novapharm-staging-key": "" }));
  assert.equal(x.statusCode, 403);
  assert.equal(records.length, 0);
});
for (const [label, data] of [
  ["real email", { ...valid, email: "customer@realbusiness.com" }],
  ["non-synthetic name", { ...valid, name: "Real Customer" }],
  ["no safety consent", { ...valid, acceptedSafetyNotice: false }],
  ["unrecognized topic", { ...valid, enquiryType: "Medical advice" }],
  ["bot honeypot", { ...valid, website: "spam.site" }],
]) {
  test("rejects " + label, async () => {
    const { handler, records } = harness();
    const x = await handler(request(data));
    assert.equal(x.statusCode, 422);
    assert.equal(records.length, 0);
  });
}
test("rejects unauthorized web origin", async () => {
  const { handler, records } = harness();
  const x = await handler(request(valid, { origin: "https://attacker.test" }));
  assert.equal(x.statusCode, 403);
  assert.equal(records.length, 0);
});
test("fails closed if storage is unavailable", async () => {
  const exports = {};
  class DynamoDBClient { async send() { throw Error("disk/backend unavailable"); } }
  class PutItemCommand { constructor(input) { this.input = input; } }
  vm.runInNewContext(original, {
    exports, Buffer, Date,
    process: { env: { STAGING_TEST_KEY: key, TABLE_NAME: "novapharm-staging-contact-test" } },
    require: name => name === "node:crypto" ? crypto : { DynamoDBClient, PutItemCommand },
  });
  const x = await exports.handler(request());
  assert.equal(x.statusCode, 503);
  assert.equal(JSON.parse(x.body).ok, undefined);
});
