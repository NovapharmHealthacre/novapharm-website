import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = JSON.parse(readFileSync("infra/aws/intelligence-ecr-s3-gateway.json", "utf8"));
const endpoint = source.Resources.IntelligenceEcrS3LayerEndpoint;

test("source owns exactly one private S3 gateway and never creates billable compute or public ingress", () => {
  assert.deepEqual(Object.keys(source.Resources), ["IntelligenceEcrS3LayerEndpoint"]);
  assert.equal(endpoint.Type, "AWS::EC2::VPCEndpoint");
  assert.equal(endpoint.Properties.VpcEndpointType, "Gateway");
  assert.deepEqual(endpoint.Properties.VpcId, { Ref: "VpcId" });
  assert.deepEqual(endpoint.Properties.RouteTableIds, [{ Ref: "PrivateRouteTableId" }]);
  assert.deepEqual(endpoint.Properties.ServiceName, { "Fn::Sub": "com.amazonaws.${AWS::Region}.s3" });
  assert.match(source.Description, /No public ingress, NAT, task, identity, customer or payment changes/);
});

test("endpoint permits only read-only image layers from the regional AWS ECR starport bucket", () => {
  const document = endpoint.Properties.PolicyDocument;
  assert.equal(document.Version, "2012-10-17");
  assert.equal(document.Statement.length, 1);
  assert.equal(document.Statement[0].Effect, "Allow");
  assert.deepEqual(document.Statement[0].Action, ["s3:GetObject"]);
  assert.deepEqual(document.Statement[0].Resource, [
    { "Fn::Sub": "arn:${AWS::Partition}:s3:::prod-${AWS::Region}-starport-layer-bucket/*" }
  ]);
  assert.doesNotMatch(JSON.stringify(document), /PutObject|DeleteObject|s3:\*|Resource":\s*"\*"/);
});

test("never mistakes layer routing for complete production networking or customer activation", () => {
  assert.deepEqual(source.Outputs.EndpointId.Value, { Ref: "IntelligenceEcrS3LayerEndpoint" });
  assert.match(source.Outputs.Scope.Value, /ECR api\/dkr, logs, secrets, external model\/data egress/);
  assert.equal(source.Parameters.PrivateRouteTableId.Type, "String");
  assert.equal(source.Parameters.VpcId.Type, "AWS::EC2::VPC::Id");
});
