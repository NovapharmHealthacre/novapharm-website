import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const template = JSON.parse(readFileSync(
  new URL("../infra/aws/intelligence-private-evidence-storage.json", import.meta.url),
  "utf8"
));
const resources = template.Resources;
const bucket = resources.EvidenceBucket;
const props = bucket.Properties;
const policy = resources.EvidenceBucketPolicy.Properties.PolicyDocument;

test("Intelligence evidence storage only provisions a closed bucket and its deny policy", () => {
  assert.deepEqual(Object.keys(resources).sort(), ["EvidenceBucket", "EvidenceBucketPolicy"]);
  assert.equal(bucket.Type, "AWS::S3::Bucket");
  assert.equal(bucket.DeletionPolicy, "Retain");
  assert.equal(bucket.UpdateReplacePolicy, "Retain");
  assert.equal(props.BucketName, "novapharm-intelligence-evidence-250675045172-eu-north-1");
});

test("public access and object ACLs are denied at the source of truth", () => {
  assert.deepEqual(props.PublicAccessBlockConfiguration, {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true
  });
  assert.deepEqual(props.OwnershipControls, {
    Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }]
  });
  assert.deepEqual(props.VersioningConfiguration, { Status: "Enabled" });
});

test("server-side encryption and HTTPS-only object access are required", () => {
  assert.deepEqual(props.BucketEncryption.ServerSideEncryptionConfiguration, [{
    ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" }
  }]);
  assert.equal(resources.EvidenceBucketPolicy.Properties.Bucket.Ref, "EvidenceBucket");
  assert.equal(policy.Version, "2012-10-17");
  assert.equal(policy.Statement.length, 2, "TLS enforcement and commerce writer isolation must both be present");
  const deny = policy.Statement.find(statement => statement.Sid === "DenyInsecureTransport");
  assert.ok(deny, "TLS deny statement is mandatory");
  assert.equal(deny.Sid, "DenyInsecureTransport");
  assert.equal(deny.Effect, "Deny");
  assert.equal(deny.Principal, "*");
  assert.equal(deny.Action, "s3:*");
  assert.equal(deny.Condition.Bool["aws:SecureTransport"], "false");
  assert.equal(deny.Resource.length, 2, "Bucket and all object ARNs must deny insecure transport");
  const commerceDeny = policy.Statement.find(statement => statement.Sid === "DenyCommerceWorkloadWritesToIntelligenceEvidence");
  assert.ok(commerceDeny, "Commerce-to-Intelligence object write protection is mandatory");
  assert.equal(commerceDeny.Effect, "Deny");
  assert.equal(commerceDeny.Principal, "*");
  assert.deepEqual([...commerceDeny.Action].sort(), [
    "s3:DeleteObject", "s3:DeleteObjectTagging", "s3:DeleteObjectVersion",
    "s3:PutObject", "s3:PutObjectTagging"
  ].sort());
  assert.deepEqual(commerceDeny.Resource["Fn::Join"][1][1], "/intelligence/*");
  const principalArn = commerceDeny.Condition.ArnEquals["aws:PrincipalArn"]["Fn::Sub"];
  assert.match(principalArn, /^arn:\$\{AWS::Partition\}:iam::\$\{AWS::AccountId\}:role\/novapharm-production-commerce-evidence-/u);
});

test("empty candidate retention and no publication grants are explicit", () => {
  assert.deepEqual(props.LifecycleConfiguration.Rules, [{
    Id: "AbortIncompleteMultipartAfter7Days",
    Status: "Enabled",
    AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }
  }]);
  const tags = Object.fromEntries(props.Tags.map(({ Key, Value }) => [Key, Value]));
  assert.equal(tags.Project, "NovaPharmIntelligence");
  assert.equal(tags.Environment, "production-candidate");
  assert.equal(tags.DataClassification, "metadata-only-until-admission");
  assert.equal(tags.Publication, "denied");
});
