import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

const path = "infra/aws/distribution-evidence-ledger-staging.json";
const infrastructure = JSON.parse(readFileSync(path, "utf8"));
const resources = Object.entries(infrastructure.Resources ?? {});
const table = resource => resource.Type === "AWS::DynamoDB::Table";

test("no public API, IAM writers, functions, network or payment gateway", () => {
  assert.equal(resources.length, 2);
  assert.ok(resources.every(([, resource]) => table(resource)));
  assert.deepEqual(infrastructure.Parameters.Environment.AllowedValues, ["staging"]);
  assert.equal(infrastructure.Parameters.Environment.Default, "staging");
  assert.doesNotMatch(JSON.stringify(infrastructure), /AWS::(?:Lambda|ApiGateway|IAM|Events|SQS|SNS)::|AWS::StepFunctions::/);
});

for (const [name, resource] of resources) {
  test(name + " private encrypted, recoverable and deletion-protected", () => {
    const props = resource.Properties;
    assert.equal(resource.DeletionPolicy, "Retain");
    assert.equal(resource.UpdateReplacePolicy, "Retain");
    assert.equal(props.BillingMode, "PAY_PER_REQUEST");
    assert.equal(props.SSESpecification.SSEEnabled, true);
    assert.equal(props.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled, true);
    assert.equal(props.DeletionProtectionEnabled, true);
    assert.deepEqual(props.AttributeDefinitions, [
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" }
    ]);
    assert.deepEqual(props.KeySchema, [
      { AttributeName: "pk", KeyType: "HASH" },
      { AttributeName: "sk", KeyType: "RANGE" }
    ]);
    assert.equal(props.TableName["Fn::Sub"], "${AWS::StackName}-" + (name === "DistributionEvidenceLedger" ? "evidence" : "events"));
    const tags = Object.fromEntries(props.Tags.map(({ Key, Value }) => [Key, Value]));
    assert.equal(tags.application, "novapharm-distribution");
    assert.equal(tags.access, "private-no-writers");
    assert.equal(tags.regulatedSupplyEnabled, "false");
    assert.equal(tags.dataClassification, "synthetic-only");
    assert.deepEqual(tags.environment, { Ref: "Environment" });
    assert.equal(props.TimeToLiveSpecification, undefined, "No automatic expiry of quality records");
  });
}

test("no code path represents the storage as production authority", () => {
  const policy = infrastructure.Outputs.ActivationPolicy.Value;
  assert.match(policy, /no execution role\/API\/writer/i);
  assert.match(policy, /no .*medicine release/i);
  assert.match(policy, /independent UK regulatory\/quality approval required/i);
});

console.log("Distribution staging evidence store: private, encrypted, no public writer or commerce activation.");
