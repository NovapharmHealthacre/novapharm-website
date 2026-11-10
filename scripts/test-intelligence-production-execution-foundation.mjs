import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const infra = JSON.parse(readFileSync("infra/aws/intelligence-production-execution-foundation.json", "utf8"));
const group = infra.Resources.IntelligenceEcsLogGroup;
const role = infra.Resources.IntelligenceExecutionRole;
const permissions = role.Properties.Policies[0].PolicyDocument.Statement;

test("no compute, ingress, API, public route or customer-payment resource is provisioned", () => {
  assert.deepEqual(Object.keys(infra.Resources).sort(), ["IntelligenceEcsLogGroup", "IntelligenceExecutionRole"]);
  assert.equal(group.Type, "AWS::Logs::LogGroup");
  assert.equal(role.Type, "AWS::IAM::Role");
  assert.equal(group.Properties.RetentionInDays, 30);
  assert.equal(group.Properties.LogGroupName, "/aws/ecs/novapharm-intelligence-production");
  assert.match(infra.Outputs.RuntimeState.Value, /FOUNDATION ONLY/);
});

test("trust policy is exclusively ECS tasks, not arbitrary IAM principals", () => {
  assert.deepEqual(role.Properties.AssumeRolePolicyDocument.Statement, [
    { Effect: "Allow", Principal: { Service: "ecs-tasks.amazonaws.com" }, Action: "sts:AssumeRole" }
  ]);
});

test("execution role pulls only dedicated production image and writes only bounded logs", () => {
  assert.deepEqual(permissions.map(statement => statement.Sid), [
    "AuthorizeEcrImageTokenOnly", "PullOnlyDedicatedIntelligenceImage", "WriteOnlyIntelligenceContainerStreams"
  ]);
  assert.deepEqual(permissions[0], {
    Sid: "AuthorizeEcrImageTokenOnly", Effect: "Allow", Action: ["ecr:GetAuthorizationToken"], Resource: "*"
  });
  assert.deepEqual(permissions[1].Resource, {
    "Fn::Sub": "arn:${AWS::Partition}:ecr:${AWS::Region}:${AWS::AccountId}:repository/novapharm/intelligence/production"
  });
  assert.deepEqual(permissions[2].Resource, { "Fn::GetAtt": ["IntelligenceEcsLogGroup", "Arn"] });
  assert.deepEqual(permissions[2].Action, ["logs:CreateLogStream", "logs:PutLogEvents"]);
});

test("no application permissions, identity change or secrets read are delegated", () => {
  const json = JSON.stringify(permissions);
  for (const forbidden of [
    "secretsmanager:", "ssm:", "dynamodb:", "kms:", "s3:", "cognito-idp:",
    "ecs:RunTask", "iam:PassRole", "ecr:PutImage", "logs:CreateLogGroup",
    "lambda:", "cloudformation:", "sts:AssumeRole"
  ]) assert.equal(json.includes(forbidden), false, forbidden);
  assert.ok(permissions.every(statement => statement.Effect === "Allow"));
  assert.equal(permissions.filter(statement => statement.Resource === "*").length, 1);
});
