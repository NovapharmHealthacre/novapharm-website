/**
 * Static, fail-closed security contract for the *staging-only* CloudTrail template.
 * No AWS credentials, network calls, live writes, or production activation.
 * Runtime trail delivery, costs, permissions and region coverage require separate checks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourceArn = {
  "Fn::Sub": "arn:${AWS::Partition}:cloudtrail:${AWS::Region}:${AWS::AccountId}:trail/novapharm-staging-audit"
};
const bucketArn = { "Fn::GetAtt": ["AuditBucket", "Arn"] };
const objectArn = { "Fn::Sub": "${AuditBucket.Arn}/*" };

export function verifyCloudTrailStaging(template) {
  assert.equal(template?.AWSTemplateFormatVersion, "2010-09-09");
  assert.deepEqual(template.Parameters.Environment.AllowedValues, ["staging"],
    "CloudTrail staging template must never admit production");
  assert.deepEqual(template.Rules.RegionLock.Assertions[0].Assert,
    { "Fn::Equals": [{ Ref: "AWS::Region" }, "eu-north-1"] },
    "Trail staging template must stay restricted to eu-north-1");

  const resources = template.Resources;
  assert.deepEqual(Object.keys(resources).sort(), ["AuditBucket", "AuditBucketPolicy", "AuditTrail"].sort(),
    "Unexpected CloudTrail or other billable resource in staging audit template");

  const bucket = resources.AuditBucket;
  assert.equal(bucket.Type, "AWS::S3::Bucket");
  assert.equal(bucket.DeletionPolicy, "Retain");
  assert.equal(bucket.UpdateReplacePolicy, "Retain");
  assert.deepEqual(bucket.Properties.PublicAccessBlockConfiguration, {
    BlockPublicAcls: true, BlockPublicPolicy: true,
    IgnorePublicAcls: true, RestrictPublicBuckets: true
  }, "All S3 public-access-block settings must be enabled");
  assert.equal(bucket.Properties.VersioningConfiguration.Status, "Enabled",
    "Audit bucket versioning must be enabled");
  assert.equal(bucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0]
    .ServerSideEncryptionByDefault.SSEAlgorithm, "AES256", "Audit bucket must be encrypted");
  assert.equal(bucket.Properties.OwnershipControls.Rules[0].ObjectOwnership, "BucketOwnerEnforced");

  const lifecycle = bucket.Properties.LifecycleConfiguration.Rules;
  assert.equal(lifecycle.length, 1, "Audit retention must be explicitly reviewed when altered");
  assert.equal(lifecycle[0].Status, "Enabled");
  assert.equal(lifecycle[0].ExpirationInDays, 365);
  assert.equal(lifecycle[0].NoncurrentVersionExpiration.NoncurrentDays, 365);

  const policy = resources.AuditBucketPolicy;
  assert.equal(policy.Type, "AWS::S3::BucketPolicy");
  assert.deepEqual(policy.Properties.Bucket, { Ref: "AuditBucket" });
  const statements = policy.Properties.PolicyDocument.Statement;
  assert.deepEqual(statements.map(s => s.Sid).sort(),
    ["DenyInsecureTransport", "AllowCloudTrailAclCheck", "AllowCloudTrailWriteOnly"].sort(),
    "No unreviewed audit bucket allow rules");
  const bySid = Object.fromEntries(statements.map(s => [s.Sid, s]));
  assert.equal(bySid.DenyInsecureTransport.Effect, "Deny");
  assert.equal(bySid.DenyInsecureTransport.Principal, "*");
  assert.equal(bySid.DenyInsecureTransport.Action, "s3:*");
  assert.deepEqual(bySid.DenyInsecureTransport.Resource, [bucketArn, objectArn],
    "Deny non-TLS transport to both bucket and objects");
  assert.equal(bySid.DenyInsecureTransport.Condition.Bool["aws:SecureTransport"], "false");

  const acl = bySid.AllowCloudTrailAclCheck;
  assert.equal(acl.Effect, "Allow");
  assert.deepEqual(acl.Principal, { Service: "cloudtrail.amazonaws.com" });
  assert.equal(acl.Action, "s3:GetBucketAcl");
  assert.deepEqual(acl.Resource, bucketArn);
  assert.deepEqual(acl.Condition.StringEquals["aws:SourceArn"], sourceArn,
    "CloudTrail ACL check must be source-ARN bounded");

  const write = bySid.AllowCloudTrailWriteOnly;
  assert.equal(write.Effect, "Allow");
  assert.deepEqual(write.Principal, { Service: "cloudtrail.amazonaws.com" });
  assert.equal(write.Action, "s3:PutObject");
  assert.deepEqual(write.Resource,
    { "Fn::Sub": "${AuditBucket.Arn}/AWSLogs/${AWS::AccountId}/*" });
  assert.equal(write.Condition.StringEquals["s3:x-amz-acl"], "bucket-owner-full-control");
  assert.deepEqual(write.Condition.StringEquals["aws:SourceArn"], sourceArn,
    "Trail write permission must not extend to other accounts or trails");

  const trail = resources.AuditTrail;
  assert.equal(trail.Type, "AWS::CloudTrail::Trail");
  assert.equal(trail.DependsOn, "AuditBucketPolicy");
  assert.deepEqual(trail.Properties.S3BucketName, { Ref: "AuditBucket" });
  assert.equal(trail.Properties.TrailName, "novapharm-staging-audit");
  assert.equal(trail.Properties.IsLogging, true, "Audit logging must remain enabled");
  assert.equal(trail.Properties.IsMultiRegionTrail, false,
    "Staging single-region cost and coverage must not change without approval");
  assert.equal(trail.Properties.IncludeGlobalServiceEvents, false,
    "Global service event scope requires cost and coverage review");
  assert.equal(trail.Properties.EnableLogFileValidation, true,
    "CloudTrail log-file integrity validation must be enabled");
  assert.deepEqual(trail.Properties.EventSelectors, [{
    IncludeManagementEvents: true, ReadWriteType: "All", DataResources: []
  }], "New CloudTrail data events could change cost and data handling");
  return { region: "eu-north-1", managementEvents: "read-and-write",
    logFileValidation: true, scope: "single-region-staging-only" };
}

if (process.argv[1]?.endsWith("/validate-cloudtrail-staging.mjs")) {
  try {
    const path = resolve(import.meta.dirname, "../../infra/aws/cloudtrail-staging.json");
    const template = JSON.parse(readFileSync(path, "utf8"));
    console.log("PASS: static staging CloudTrail security contract",
      JSON.stringify(verifyCloudTrailStaging(template)));
  } catch (error) {
    console.error("FAIL: staging CloudTrail security contract:", error.message);
    process.exitCode = 1;
  }
}
