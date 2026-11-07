import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const source = readFileSync("infra/aws/contact-production/index.js", "utf8");
const template = JSON.parse(readFileSync("infra/aws/contact-production.json", "utf8"));
const valid = {
  name: "SYNTHETIC-Production-QA",
  email: "synthetic@example.com",
  company: "NovaPharm QA",
  role: "Test",
  country: "United Kingdom",
  telephone: "",
  enquiryType: "General enquiry",
  message: "SYNTHETIC DATA: production endpoint test for verified internal receipt delivery.",
  website: "",
  safetyConfirmation: "yes",
  privacyAcknowledgement: "yes"
};
function harness({ failingStorage = false, failingNotice = false, blockedRate = false } = {}) {
  const writes = [];
  const notifications = [];
  class DynamoDBClient {
    async send(command) {
      if (failingStorage) throw Error("data store unavailable");
      if (blockedRate && command.type === "UpdateItem" && command.input.Key.id.S.startsWith("RATE#")) {
        throw Object.assign(Error("rate limit"), { name: "ConditionalCheckFailedException" });
      }
      writes.push(command);
      return {};
    }
  }
  class SNSClient {
    async send(command) {
      if (failingNotice) throw Error("SNS unavailable");
      notifications.push(command.input);
      return { MessageId: "synthetic-message-id" };
    }
  }
  class Command {
    constructor(input) { this.input = input; this.type = this.constructor.name; }
  }
  const mock = {
    "@aws-sdk/client-dynamodb": {
      DynamoDBClient,
      PutItemCommand: class PutItem extends Command { constructor(input) { super(input); this.type = "PutItem"; } },
      UpdateItemCommand: class UpdateItem extends Command { constructor(input) { super(input); this.type = "UpdateItem"; } }
    },
    "@aws-sdk/client-sns": {
      SNSClient, PublishCommand: class Publish extends Command {}
    },
    "node:crypto": crypto
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, Buffer, Date,
    process: { env: {
      AWS_REGION: "eu-north-1",
      TABLE_NAME: "novapharm-production-contact-inbox",
      INTAKE_RATE_SALT: "a".repeat(64),
      NOTIFICATION_TOPIC_ARN: "arn:aws:sns:eu-north-1:250675045172:novapharm-staging-contact-receipt-alerts"
    } },
    require(path) { if (!mock[path]) throw Error("Unexpected library " + path); return mock[path]; }
  });
  return { handler: exports.handler, writes, notifications };
}
function request(payload = valid, headers = {}) {
  return {
    rawPath: "/contact",
    requestContext: { http: { method: "POST", sourceIp: "203.0.113.10" } },
    headers: { origin: "https://novapharmhealthcare.com", "content-type": "application/json", "x-novapharm-intake": "v1", ...headers },
    body: JSON.stringify(payload)
  };
}
test("reviewed handler equals inline AWS production template", () => {
  assert.equal(template.Resources.Function.Properties.Code.ZipFile, source);
  assert.equal(template.Resources.ContactInbox.Properties.TimeToLiveSpecification.Enabled, true);
  assert.equal(template.Resources.ContactInbox.Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled, true);
  assert.equal(template.Resources.Function.Properties.ReservedConcurrentExecutions, 2);
  assert.equal(template.Resources.Stage.Properties.DefaultRouteSettings.ThrottlingRateLimit, 2);
  assert.equal(template.Resources.HttpApi.Properties.CorsConfiguration.AllowOrigins.length, 2);
  assert.equal(template.Resources.ExecutionRole.Properties.Policies[0].PolicyDocument.Statement[0].Resource["Fn::GetAtt"][0], "ContactInbox");
  assert.match(JSON.stringify(template), /novapharm-staging-contact-receipt-alerts/);
});
test("health endpoint returns configured service and no private content", async () => {
  const { handler } = harness();
  const x = await handler({ rawPath: "/health", requestContext: { http: { method: "GET" } }, headers: {} });
  assert.equal(x.statusCode, 200);
  assert.equal(JSON.parse(x.body).service, "novapharm-contact-intake");
});
test("valid B2B enquiry persisted before reference-only email notification", async () => {
  const { handler, writes, notifications } = harness();
  const response = await handler(request());
  assert.equal(response.statusCode, 201);
  const body = JSON.parse(response.body);
  assert.equal(body.persisted, true);
  assert.equal(body.notificationAccepted, true);
  assert.equal(writes[0].type, "UpdateItem");
  assert.equal(writes[1].type, "PutItem");
  assert.equal(writes[1].input.Item.classification.S, "B2B_BUSINESS_ENQUIRY");
  assert.equal(writes[2].type, "UpdateItem");
  assert.equal(notifications.length, 1);
  assert.ok(notifications[0].Message.includes(body.receiptId));
  assert.ok(!notifications[0].Message.includes(valid.email));
  assert.ok(!notifications[0].Message.includes(valid.name));
  assert.ok(!notifications[0].Message.includes(valid.message));
  assert.equal(JSON.parse(response.body).ok, true);
});
for (const [label, altered, headers, code] of [
  ["unapproved origin", valid, { origin: "https://malicious.example" }, 403],
  ["missing preflight header", valid, { "x-novapharm-intake": "" }, 403],
  ["honeypot", { ...valid, website: "junk" }, {}, 422],
  ["missing privacy acknowledgement", { ...valid, privacyAcknowledgement: "no" }, {}, 422],
  ["missing safety declaration", { ...valid, safetyConfirmation: "no" }, {}, 422],
  ["unapproved extra field", { ...valid, patientId: "sample" }, {}, 422],
  ["invalid topic", { ...valid, enquiryType: "Medical advice" }, {}, 422],
  ["short message", { ...valid, message: "Hi" }, {}, 422],
  ["invalid email", { ...valid, email: "not-an-email" }, {}, 422]
]) {
  test("rejects " + label + " without storing anything", async () => {
    const { handler, writes } = harness();
    const x = await handler(request(altered, headers));
    assert.equal(x.statusCode, code);
    assert.equal(writes.length, 0);
  });
}
test("rate-limited request cannot create an enquiry", async () => {
  const { handler, writes } = harness({ blockedRate: true });
  const x = await handler(request());
  assert.equal(x.statusCode, 429);
  assert.equal(writes.length, 0);
});
test("storage outage cannot falsely issue a receipt", async () => {
  const { handler } = harness({ failingStorage: true });
  const x = await handler(request());
  assert.equal(x.statusCode, 503);
});
test("notification outage preserves durable receipt without claiming delivery", async () => {
  const { handler, writes } = harness({ failingNotice: true });
  const x = await handler(request());
  assert.equal(x.statusCode, 201);
  assert.equal(JSON.parse(x.body).notificationAccepted, false);
  assert.equal(writes.some(x => x.type === "PutItem"), true);
});
