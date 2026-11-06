import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyCloudTrailStaging } from "./validate-cloudtrail-staging.mjs";

const template = JSON.parse(readFileSync(
  resolve(import.meta.dirname, "../../infra/aws/cloudtrail-staging.json"), "utf8"
));
const candidate = () => structuredClone(template);
const reject = (mutate, match) => {
  const t = candidate();
  mutate(t);
  assert.throws(() => verifyCloudTrailStaging(t), match);
};

test("reviewed staging trail IaC passes strict static security contract", () => {
  assert.equal(verifyCloudTrailStaging(candidate()).scope, "single-region-staging-only");
});
test("production environment enabled without review is rejected", () =>
  reject(t => t.Parameters.Environment.AllowedValues.push("production"), /never admit production/));
test("region expansion without review is rejected", () =>
  reject(t => t.Rules.RegionLock.Assertions[0].Assert["Fn::Equals"][1] = "us-east-1", /eu-north-1/));
test("unreviewed resource including CloudTrail Lake is rejected", () =>
  reject(t => t.Resources.UnexpectedStore = { Type: "AWS::CloudTrail::EventDataStore" }, /Unexpected/));
test("incomplete S3 public access block is rejected", () =>
  reject(t => t.Resources.AuditBucket.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy = false, /public-access/));
test("bucket versioning disabled is rejected", () =>
  reject(t => t.Resources.AuditBucket.Properties.VersioningConfiguration.Status = "Suspended", /versioning/));
test("bucket encryption removed is rejected", () =>
  reject(t => t.Resources.AuditBucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm = "NONE", /encrypted/));
test("audit lifecycle extension requires review", () =>
  reject(t => t.Resources.AuditBucket.Properties.LifecycleConfiguration.Rules[0].ExpirationInDays = 730, /730 !== 365/));
test("unreviewed wildcard S3 allow statement is rejected", () =>
  reject(t => t.Resources.AuditBucketPolicy.Properties.PolicyDocument.Statement.push({
    Sid: "AllowEveryone", Effect: "Allow", Principal: "*", Action: "s3:*", Resource: "*"
  }), /unreviewed audit bucket allow/));
test("TLS deny removed is rejected", () =>
  reject(t => t.Resources.AuditBucketPolicy.Properties.PolicyDocument.Statement[0].Effect = "Allow", /'Allow' !== 'Deny'/));
test("cross-account unrestricted CloudTrail writes rejected", () =>
  reject(t => delete t.Resources.AuditBucketPolicy.Properties.PolicyDocument.Statement[2].Condition.StringEquals["aws:SourceArn"], /source-ARN|Trail write permission/));
test("disabled audit logging is rejected", () =>
  reject(t => t.Resources.AuditTrail.Properties.IsLogging = false, /Audit logging/));
test("missing log integrity validation is rejected", () =>
  reject(t => t.Resources.AuditTrail.Properties.EnableLogFileValidation = false, /integrity validation/));
test("cross-region and global-service expansion require review", () => {
  reject(t => t.Resources.AuditTrail.Properties.IsMultiRegionTrail = true, /single-region/);
  reject(t => t.Resources.AuditTrail.Properties.IncludeGlobalServiceEvents = true, /Global service/);
});
test("new chargeable data-event selectors require review", () =>
  reject(t => t.Resources.AuditTrail.Properties.EventSelectors[0].DataResources.push({
    Type: "AWS::S3::Object", Values: ["arn:aws:s3:::example/*"]
  }), /data events/));
