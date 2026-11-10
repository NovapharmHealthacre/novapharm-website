import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const template = JSON.parse(readFileSync("infra/aws/intelligence-alb-logs.json", "utf8"));
const res = template.Resources;
const bucket = res.IntelligenceAlbLogBucket;
const properties = bucket.Properties;
const policy = res.IntelligenceAlbLogPolicy.Properties.PolicyDocument;
const statements = policy.Statement;

test("private bucket has enforced ownership, SSE-S3, no public access and retained audit history", () => {
  assert.deepEqual(properties.PublicAccessBlockConfiguration, {
    BlockPublicAcls: true,
    BlockPublicPolicy: true,
    IgnorePublicAcls: true,
    RestrictPublicBuckets: true,
  });
  assert.equal(properties.OwnershipControls.Rules[0].ObjectOwnership, "BucketOwnerEnforced");
  assert.equal(properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm, "AES256");
  assert.equal(properties.VersioningConfiguration.Status, "Enabled");
  assert.equal(bucket.DeletionPolicy, "Retain");
});

test("retention expires access logs within 90 days and old versions within 30 days", () => {
  const rule = properties.LifecycleConfiguration.Rules.find((r) => r.Status === "Enabled");
  assert.equal(rule.Filter.Prefix, "intelligence/");
  assert.equal(rule.ExpirationInDays, 90);
  assert.equal(rule.NoncurrentVersionExpiration.NoncurrentDays, 30);
  assert.equal(rule.AbortIncompleteMultipartUpload.DaysAfterInitiation, 7);
});

test("only regional same-account ALB service receives PutObject access to fixed prefix", () => {
  const grant = statements.find((s) => s.Sid === "AllowRegionalAlbLogDeliveryOnly");
  assert.deepEqual(grant.Principal, { Service: "logdelivery.elasticloadbalancing.amazonaws.com" });
  assert.equal(grant.Action, "s3:PutObject");
  assert.match(grant.Resource, /\/intelligence\/AWSLogs\/250675045172\/\*/u);
  assert.equal(grant.Condition.StringEquals["aws:SourceAccount"], "250675045172");
  assert.match(grant.Condition.ArnLike["aws:SourceArn"], /^arn:aws:elasticloadbalancing:eu-north-1:/u);
  assert.equal(statements.filter((s) => s.Effect === "Allow").length, 1);
});

test("explicitly deny HTTP; no runtime, paid ingress, customer or medical data mutation", () => {
  const deny = statements.find((s) => s.Sid === "DenyInsecureTransport");
  assert.equal(deny.Effect, "Deny");
  assert.equal(deny.Condition.Bool["aws:SecureTransport"], "false");
  assert.deepEqual(Object.values(res).map((r) => r.Type).sort(), ["AWS::S3::Bucket", "AWS::S3::BucketPolicy"]);
  assert.ok(!JSON.stringify(template).includes("COGNITO_CLIENT_SECRET"));
});
