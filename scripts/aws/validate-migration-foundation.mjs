import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const template = JSON.parse(readFileSync(resolve(root, "infra/aws/foundation.json"), "utf8"));
assert.equal(template.AWSTemplateFormatVersion, "2010-09-09");
assert.deepEqual(template.Parameters.Environment.AllowedValues, ["staging", "production"]);
assert.deepEqual(template.Rules.RegionLock.Assertions[0].Assert, {
  "Fn::Equals": [{ Ref: "AWS::Region" }, "eu-north-1"]
});
const resources = template.Resources;
assert.equal(resources.Cluster.Type, "AWS::ECS::Cluster");
for (const app of ["corporate", "technology", "founder", "status", "portal", "api"]) {
  const stem = app[0].toUpperCase() + app.slice(1);
  const repo = resources[stem + "Repository"];
  assert.equal(repo.Type, "AWS::ECR::Repository");
  assert.equal(repo.Properties.ImageTagMutability, "IMMUTABLE");
  assert.equal(repo.Properties.ImageScanningConfiguration.ScanOnPush, true);
  assert.equal(resources[stem + "LogGroup"].Type, "AWS::Logs::LogGroup");
}
for (const [name, policy] of [["DocumentBucket", "DocumentBucketTlsPolicy"], ["QuarantineBucket", "QuarantineBucketTlsPolicy"]]) {
  const resource = resources[name];
  assert.equal(resource.Type, "AWS::S3::Bucket");
  assert.equal(resource.DeletionPolicy, "Retain");
  assert.equal(resource.Properties.VersioningConfiguration.Status, "Enabled");
  for (const flag of Object.values(resource.Properties.PublicAccessBlockConfiguration)) assert.equal(flag, true);
  assert.equal(resource.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm, "AES256");
  const tls = resources[policy].Properties.PolicyDocument.Statement[0];
  assert.equal(tls.Condition.Bool["aws:SecureTransport"], "false");
  assert.equal(tls.Effect, "Deny");
}
assert(!Object.values(resources).some((r) => ["AWS::ECS::Service", "AWS::RDS::DBInstance", "AWS::Route53::RecordSet"].includes(r.Type)),
  "Foundation must not create unaccepted production services, databases, or DNS records");
const dispatch = readFileSync(resolve(root, ".github/workflows/managed-production-candidate.yml"), "utf8");
assert(!dispatch.includes("gh workflow run azure-deploy.yml"), "Legacy Azure dispatch must be disabled");
const database = readFileSync(resolve(root, "src/data/database.mjs"), "utf8");
assert(database.includes('configuredProvider === "aws-rds-sql"'));
const identity = readFileSync(resolve(root, "src/core/entra-identity.mjs"), "utf8");
assert(identity.includes('environment.NOVAPHARM_CLOUD_PLATFORM === "aws"'));
const storage = readFileSync(resolve(root, "src/storage/document-store.mjs"), "utf8");
assert(storage.includes('configuredProvider !== "disabled"'));
console.log("AWS migration foundation contract passed. No AWS resources were provisioned.");
