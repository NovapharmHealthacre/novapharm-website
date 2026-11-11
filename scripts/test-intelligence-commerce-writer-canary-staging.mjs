import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const tpl = JSON.parse(readFileSync(new URL("../infra/aws/intelligence-commerce-writer-canary-staging.json", import.meta.url), "utf8"));
const res = tpl.Resources;
const role = "novapharm-production-commerce-evidence-EvidenceRole-GNet28VHTjmN";
const bucket = "novapharm-commerce-evidence-250675045172-eu-north-1";
const fn = "novapharm-commerce-evidence-isolation-canary";

test("only candidate IAM, log and private invocation resources; no exporter deployment or cutover", () => {
  assert.deepEqual(Object.keys(res).sort(), ["CanaryLogGroup", "PrivateWriterCanary", "ScopedCommerceDestinationGrant"]);
  assert.deepEqual(Object.keys(tpl.Outputs).sort(), ["CanaryFunctionName", "ExpectedEvidenceBucket", "LiveExporterUntouched"]);
  assert.equal(tpl.Outputs.LiveExporterUntouched.Value, "true");
  assert.equal(res.PrivateWriterCanary.Type, "AWS::Lambda::Function");
  assert.equal(res.PrivateWriterCanary.Properties.FunctionName, fn);
  assert.equal(res.PrivateWriterCanary.Properties.Role, "arn:aws:iam::250675045172:role/" + role);
  assert.deepEqual(res.PrivateWriterCanary.DependsOn.sort(), ["CanaryLogGroup", "ScopedCommerceDestinationGrant"]);
  const all = JSON.stringify(res);
  for (const forbidden of ["AWS::Lambda::Permission", "AWS::Events::Rule", "AWS::ApiGateway", "AWS::ApiGatewayV2", "AWS::S3::Bucket", "AWS::DynamoDB"]) {
    assert(!all.includes(forbidden), forbidden);
  }
});

test("grant is scoped to one existing producer role and exactly one new commerce prefix", () => {
  const scope = res.ScopedCommerceDestinationGrant;
  assert.equal(scope.Type, "AWS::IAM::Policy");
  assert.deepEqual(scope.Properties.Roles, [role]);
  const stmts = scope.Properties.PolicyDocument.Statement;
  assert.equal(stmts.length, 2);
  assert.deepEqual(stmts[0].Action, ["s3:PutObject"]);
  assert.equal(stmts[0].Resource, `arn:aws:s3:::${bucket}/commerce/owner-attestations/*`);
  assert.deepEqual(stmts[1].Action, ["logs:CreateLogStream", "logs:PutLogEvents"]);
  assert.equal(stmts[1].Resource, `arn:aws:logs:eu-north-1:250675045172:log-group:/aws/lambda/${fn}:*`);
  assert(!JSON.stringify(stmts).includes('"Resource":"*"'));
  assert(!JSON.stringify(stmts).includes("novapharm-intelligence-evidence-"));
  assert(!JSON.stringify(stmts).includes("s3:Delete"));
});

test("canary remains isolated with fixed bucket, no public endpoints, no email or payment actions", () => {
  const props = res.PrivateWriterCanary.Properties;
  assert.equal(props.Runtime, "python3.12");
  assert.equal(props.Handler, "index.handler");
  assert.equal(props.Environment.Variables.EVIDENCE_BUCKET, bucket);
  assert.equal(props.Timeout, 15);
  const code = props.Code.ZipFile;
  assert.match(code, /def handler\(event, context\)/);
  assert.match(code, /"verify-isolation"/);
  assert.match(code, /"commerce\/owner-attestations\/_isolation-probes\//);
  assert.match(code, /"intelligence\/_isolation-probes\//);
  assert.match(code, /"AccessDenied"/);
  assert.match(code, /IfNoneMatch="\*"/);
  assert.match(code, /ServerSideEncryption="AES256"/);
  assert.match(code, /"customer_data": False/);
  assert.match(code, /"production_exporter_cutover": False/);
  assert.doesNotMatch(code, /send_email|send_message|checkout|payment_intent|create_customer|secretsmanager|PutRolePolicy/i);
});

test("log retention and candidate release tags are bounded", () => {
  assert.equal(res.CanaryLogGroup.Type, "AWS::Logs::LogGroup");
  assert.equal(res.CanaryLogGroup.Properties.LogGroupName, "/aws/lambda/" + fn);
  assert.equal(res.CanaryLogGroup.Properties.RetentionInDays, 14);
  assert.equal(res.CanaryLogGroup.DeletionPolicy, "Retain");
  assert.deepEqual(res.PrivateWriterCanary.Properties.Tags, [
    { Key: "application", Value: "novapharm-commerce" },
    { Key: "release-boundary", Value: "private-canary-no-customer-traffic" },
  ]);
});
