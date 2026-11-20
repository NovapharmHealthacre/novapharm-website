import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const template = JSON.parse(readFileSync(new URL("../infra/aws/intelligence-commerce-evidence-isolation-candidate.json", import.meta.url), "utf8"));
const resources = template.Resources;
const bucket = resources.IsolatedCommerceEvidenceBucket;
const policy = resources.IsolatedCommerceEvidenceBucketPolicy.Properties.PolicyDocument;
const statements = Object.fromEntries(policy.Statement.map((statement) => [statement.Sid, statement]));

test("candidate provisions a NEW retained bucket without touching the occupied Intelligence store", () => {
  assert.deepEqual(Object.keys(resources).sort(), ["IsolatedCommerceEvidenceBucket", "IsolatedCommerceEvidenceBucketPolicy"]);
  assert.equal(bucket.Type, "AWS::S3::Bucket");
  assert.equal(bucket.DeletionPolicy, "Retain");
  assert.equal(bucket.UpdateReplacePolicy, "Retain");
  assert.equal(bucket.Properties.BucketName, "novapharm-commerce-evidence-250675045172-eu-north-1");
  assert.notEqual(bucket.Properties.BucketName, "novapharm-intelligence-evidence-250675045172-eu-north-1");
  assert.equal(template.Outputs.CandidateCommerceEvidenceBucket.Value.Ref, "IsolatedCommerceEvidenceBucket");
});

test("isolated candidate is non-public, versioned, encrypted, owner-controlled and not live", () => {
  const props = bucket.Properties;
  assert.deepEqual(props.PublicAccessBlockConfiguration, {
    BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true
  });
  assert.deepEqual(props.OwnershipControls, { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] });
  assert.deepEqual(props.BucketEncryption.ServerSideEncryptionConfiguration, [{
    ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" }
  }]);
  assert.deepEqual(props.VersioningConfiguration, { Status: "Enabled" });
  assert.equal(props.LifecycleConfiguration.Rules[0].AbortIncompleteMultipartUpload.DaysAfterInitiation, 7);
  const tags = Object.fromEntries(props.Tags.map((tag) => [tag.Key, tag.Value]));
  assert.equal(tags.Publication, "denied");
  assert.equal(tags.TrafficCutover, "disabled");
  assert.equal(tags.Environment, "production-migration-candidate");
});

test("only a named commerce writer can survive explicit object mutation denials, without any allow grant", () => {
  const arn = template.Parameters.CommerceEvidenceWriterRoleArn.Default;
  assert.equal(arn, "arn:aws:iam::250675045172:role/novapharm-production-commerce-evidence-EvidenceRole-GNet28VHTjmN");
  assert.equal(policy.Version, "2012-10-17");
  assert.equal(policy.Statement.length, 3);
  assert(policy.Statement.every((statement) => statement.Effect === "Deny"));
  assert(policy.Statement.every((statement) => statement.Principal === "*"));
  const s = statements.DenyUnapprovedPrincipalObjectMutations;
  assert.deepEqual(s.Condition, { ArnNotEquals: { "aws:PrincipalArn": { Ref: "CommerceEvidenceWriterRoleArn" } } });
  assert.deepEqual(s.Resource, { "Fn::Join": ["", [{ "Fn::GetAtt": ["IsolatedCommerceEvidenceBucket", "Arn"] }, "/*"]] });
  for (const action of ["s3:PutObject", "s3:DeleteObject", "s3:DeleteObjectVersion", "s3:AbortMultipartUpload", "s3:ReplicateObject"]) {
    assert(s.Action.includes(action), action);
  }
  assert.deepEqual(statements.DenyMissingPrincipalIdentityObjectMutations.Condition, { Null: { "aws:PrincipalArn": "true" } });
});

test("TLS denial applies to BOTH bucket and object ARNs, without hidden publication permissions", () => {
  const deny = statements.DenyInsecureTransport;
  assert.equal(deny.Action, "s3:*");
  assert.deepEqual(deny.Condition, { Bool: { "aws:SecureTransport": "false" } });
  assert.equal(deny.Resource.length, 2);
  assert.deepEqual(deny.Resource[0], { "Fn::GetAtt": ["IsolatedCommerceEvidenceBucket", "Arn"] });
  assert.deepEqual(deny.Resource[1], { "Fn::Join": ["", [{ "Fn::GetAtt": ["IsolatedCommerceEvidenceBucket", "Arn"] }, "/*"]] });
  assert(!JSON.stringify(template).includes('"Effect": "Allow"'));
  assert(!JSON.stringify(resources).includes("AWS::Lambda::Function"));
  assert(!JSON.stringify(resources).includes("AWS::Events::Rule"));
});
