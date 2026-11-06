import test from "node:test";
import assert from "node:assert/strict";
import { verifyFoundation } from "./verify-staging-foundation.mjs";

const types = [
  ["Cluster", "AWS::ECS::Cluster"],
  ...["Corporate", "Api", "Founder", "Technology", "Portal", "Status"].flatMap(x => [
    [x + "Repository", "AWS::ECR::Repository"], [x + "LogGroup", "AWS::Logs::LogGroup"]
  ]),
  ["DocumentBucket", "AWS::S3::Bucket"],
  ["QuarantineBucket", "AWS::S3::Bucket"],
  ["DocumentBucketTlsPolicy", "AWS::S3::BucketPolicy"],
  ["QuarantineBucketTlsPolicy", "AWS::S3::BucketPolicy"]
];
const names = ["corporate", "api", "founder", "technology", "portal", "status"];
const fixture = () => [
  { StackResources: types.map(([LogicalResourceId, ResourceType]) => ({ LogicalResourceId, ResourceType, ResourceStatus: "CREATE_COMPLETE" })) },
  { repositories: names.map(n => ({ repositoryName: `novapharm/staging/${n}`, imageTagMutability: "IMMUTABLE", imageScanningConfiguration: {scanOnPush: true}, encryptionConfiguration: {encryptionType:"AES256"} })) },
  { logGroups: names.map(n => ({logGroupName: `/novapharm/staging/${n}`, retentionInDays: 30})) },
  { clusterArns: ["arn:aws:ecs:eu-north-1:123456789012:cluster/novapharm-staging"] }
];
test("correct foundation is accepted", () => assert.equal(verifyFoundation(...fixture()).resourceCount, 17));
test("invalid resource status is rejected", () => {
  const x=fixture(); x[0].StackResources[0].ResourceStatus="CREATE_IN_PROGRESS";
  assert.throws(() => verifyFoundation(...x), /not CREATE_COMPLETE/);
});
test("missing resource is rejected", () => {
  const x=fixture(); x[0].StackResources.pop();
  assert.throws(() => verifyFoundation(...x), /unexpected resource count/);
});
test("mutable ECR tags are rejected", () => {
  const x=fixture(); x[1].repositories[0].imageTagMutability="MUTABLE";
  assert.throws(() => verifyFoundation(...x), /mutable tags/);
});
test("disabled ECR scanning is rejected", () => {
  const x=fixture(); x[1].repositories[0].imageScanningConfiguration.scanOnPush=false;
  assert.throws(() => verifyFoundation(...x), /scan-on-push/);
});
test("missing log retention is rejected", () => {
  const x=fixture(); x[2].logGroups[0].retentionInDays=undefined;
  assert.throws(() => verifyFoundation(...x), /Logging retention/);
});
test("wrong workload region is rejected", () =>
  assert.throws(() => verifyFoundation(...fixture(), "us-east-1"), /eu-north-1/)
);
test("missing cluster is rejected", () => {
  const x=fixture(); x[3].clusterArns=[];
  assert.throws(() => verifyFoundation(...x), /one ECS/);
});
