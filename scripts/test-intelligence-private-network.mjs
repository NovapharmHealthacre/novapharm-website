import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const template = JSON.parse(readFileSync("infra/aws/intelligence-isolated-vpc-foundation.json", "utf8"));
const resources = template.Resources;
const resourceTypes = Object.values(resources).map((r) => r.Type);

test("isolated network foundation cannot provision live or charge-bearing compute infrastructure", () => {
  const forbidden = /NATGateway|EIP|ElasticLoadBalancing|ECS::|EC2::Instance|EC2::NetworkInterface|EC2::VPCEndpoint|WAF|Route53|SecretsManager|Lambda|RDS|DynamoDB|OpenSearch/u;
  for (const resource of Object.values(resources)) {
    assert.doesNotMatch(resource.Type, forbidden, `${resource.Type} must not be provisioned by the foundation`);
  }
  assert.equal(resourceTypes.filter((type) => type === "AWS::EC2::VPC").length, 1);
});

test("public and private AZ-diverse subnets are separate, private has no NAT/IGW/default route", () => {
  const a = resources.PublicSubnetA.Properties;
  const b = resources.PublicSubnetB.Properties;
  const c = resources.PrivateSubnetA.Properties;
  const d = resources.PrivateSubnetB.Properties;
  assert.notEqual(a.AvailabilityZone, b.AvailabilityZone);
  assert.equal(a.AvailabilityZone, c.AvailabilityZone);
  assert.equal(b.AvailabilityZone, d.AvailabilityZone);
  assert.equal(new Set([a.CidrBlock, b.CidrBlock, c.CidrBlock, d.CidrBlock]).size, 4);
  for (const subnet of [a, b, c, d]) {
    assert.equal(subnet.MapPublicIpOnLaunch, false);
    assert.deepEqual(subnet.VpcId, { Ref: "IntelligenceVpc" });
  }
  assert.equal(Object.keys(resources).filter((k) => k.endsWith("DefaultRoute")).length, 1);
  assert.deepEqual(resources.PublicDefaultRoute.Properties.RouteTableId, { Ref: "PublicRouteTable" });
  assert.equal(resources.PrivateSubnetRouteA.Properties.RouteTableId.Ref, "PrivateRouteTable");
  assert.equal(resources.PrivateSubnetRouteB.Properties.RouteTableId.Ref, "PrivateRouteTable");
  assert.equal(resourceTypes.filter((x) => x === "AWS::EC2::Route").length, 1);
});

test("network is independent of customer Nutraxin and any other VPC", () => {
  for (const resource of Object.values(resources)) {
    assert.doesNotMatch(JSON.stringify(resource), /vpc-0|subnet-0|portal\.novapharm|nutraxin|customer-data/u);
  }
  assert.match(template.Outputs.OperationalReleaseState.Value, /no compute/i);
  assert.match(template.Outputs.PrivateSubnetIds.Description, /no Internet\/NAT/u);
});

test("no public ingress service or customer identity changes can occur from this template", () => {
  assert.equal(resources.InternetGatewayAttachment.Type, "AWS::EC2::VPCGatewayAttachment");
  assert.equal(resources.PublicDefaultRoute.DependsOn, "InternetGatewayAttachment");
  assert.equal(template.Resources.PrivateRouteTable.Type, "AWS::EC2::RouteTable");
  assert.equal(JSON.stringify(template).includes("COGNITO_CLIENT_SECRET"), false);
});
