import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const templateUrl = new URL("../../infra/aws/public-site-foundation.json", import.meta.url);
const t = JSON.parse(readFileSync(templateUrl, "utf8"));
const bucket = t.Resources?.PublicArtifactBucket;
const distribution = t.Resources?.PublicDistribution;
const policy = t.Resources?.PrivateBucketPolicy?.Properties?.PolicyDocument?.Statement?.[0];
const cdn = distribution?.Properties?.DistributionConfig;

assert.equal(t.AWSTemplateFormatVersion, "2010-09-09");
assert.deepEqual(t.Parameters?.Environment?.AllowedValues, ["development", "staging"]);
assert.equal(bucket?.Type, "AWS::S3::Bucket");
assert.equal(bucket?.DeletionPolicy, "Retain");
assert.equal(bucket?.UpdateReplacePolicy, "Retain");
for (const flag of ["BlockPublicAcls", "BlockPublicPolicy", "IgnorePublicAcls", "RestrictPublicBuckets"]) {
  assert.equal(bucket.Properties.PublicAccessBlockConfiguration[flag], true, `Private S3 flag missing: ${flag}`);
}
assert.equal(bucket.Properties.OwnershipControls.Rules[0].ObjectOwnership, "BucketOwnerEnforced");
assert.equal(bucket.Properties.VersioningConfiguration.Status, "Enabled");
assert.equal(bucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm, "AES256");
assert.equal(distribution?.Type, "AWS::CloudFront::Distribution");
assert.equal(cdn.ViewerCertificate?.CloudFrontDefaultCertificate, true);
assert.equal(cdn.Aliases, undefined, "Custom domain/DNS must be a separate approved cutover");
assert.equal(cdn.DefaultCacheBehavior.ViewerProtocolPolicy, "redirect-to-https");
assert.deepEqual(cdn.DefaultCacheBehavior.AllowedMethods, ["GET", "HEAD"]);
assert.equal(cdn.Origins.length, 1);
assert.deepEqual(cdn.Origins[0].OriginAccessControlId, {"Fn::GetAtt": ["PublicOriginAccessControl", "Id"]});
assert.equal(t.Resources.PublicOriginAccessControl.Properties.OriginAccessControlConfig.SigningBehavior, "always");
assert.equal(policy?.Principal?.Service, "cloudfront.amazonaws.com");
assert.equal(policy?.Effect, "Allow");
assert.equal(policy?.Condition?.StringEquals?.["AWS:SourceArn"]?.["Fn::Sub"],
  "arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${PublicDistribution}");
assert.equal(cdn.DefaultCacheBehavior.FunctionAssociations[0].EventType, "viewer-request");
assert.match(t.Resources.DirectoryIndexRewrite.Properties.FunctionCode, /index\.html/);
for (const resource of [bucket, distribution]) {
  const actualTags = new Set(resource.Properties.Tags.map(tag => tag.Key));
  for (const required of ["Project", "Environment", "Owner", "Application", "CostCentre", "DataClassification"]) {
    assert.ok(actualTags.has(required), `Missing tag ${required}`);
  }
}
assert.equal(Object.values(t.Resources).filter(resource => resource.Type.startsWith("AWS::")).length, 5);
console.log("PASS: AWS public-only foundation structural checks. No AWS deployment, cloud-side validation, or live-site acceptance has been performed.");
