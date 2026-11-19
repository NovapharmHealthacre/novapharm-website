import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const t = JSON.parse(readFileSync("infra/aws/customer-approval-ledger-staging.json", "utf8"));
const resources = t.Resources;
const item = resources.CustomerAccountLedger;
const p = item.Properties;

test("private staging customer ledger cannot expose accounts automatically", () => {
  assert.deepEqual(Object.keys(resources), ["CustomerAccountLedger"]);
  assert.equal(item.Type, "AWS::DynamoDB::Table");
  assert.equal(item.DeletionPolicy, "Retain");
  assert.equal(item.UpdateReplacePolicy, "Retain");
  assert.equal(p.TableName, "novapharm-staging-customer-approval-ledger");
  assert.equal(p.DeletionProtectionEnabled, true);
  assert.equal(p.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled, true);
  assert.equal(p.SSESpecification.SSEEnabled, true);
  assert.equal(p.BillingMode, "PAY_PER_REQUEST");
  assert.equal(p.Tags.find(x => x.Key === "access")?.Value, "private-default-deny");
  assert.equal(p.TimeToLiveSpecification.Enabled, true);
  assert.deepEqual(p.KeySchema, [{ AttributeName:"pk",KeyType:"HASH" },{ AttributeName:"sk",KeyType:"RANGE" }]);
  assert.ok(!JSON.stringify(t).includes("AWS::ApiGateway"));
  assert.ok(!JSON.stringify(t).includes("AWS::IAM::Role"));
  assert.ok(!JSON.stringify(t).includes("ALLOW_USER_PASSWORD_AUTH"));
});
