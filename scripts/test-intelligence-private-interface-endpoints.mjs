import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const t = JSON.parse(readFileSync("infra/aws/intelligence-private-interface-endpoints.json", "utf8"));
const r = t.Resources;
const gate = "ProvisionInterfaceEndpoints";
const services = {
  IntelligenceEcrApiEndpoint: "ecr.api",
  IntelligenceEcrDkrEndpoint: "ecr.dkr",
  IntelligenceLogsEndpoint: "logs",
  IntelligenceSecretsEndpoint: "secretsmanager"
};

test("no recurring-cost interface endpoint can provision without both approvals", () => {
  assert.equal(t.Parameters.ActivationApproval.Default, "BLOCKED");
  assert.equal(t.Parameters.OperatingCostAcceptance.Default, "BLOCKED");
  assert.deepEqual(t.Conditions[gate], {
    "Fn::And": [
      { "Fn::Equals": [{ Ref: "ActivationApproval" }, "APPROVED"] },
      { "Fn::Equals": [{ Ref: "OperatingCostAcceptance" }, "APPROVED"] }
    ]
  });
  assert.ok(Object.values(r).every(v => v.Condition === gate));
});

test("exactly four expected private AWS services, strict TLS and restricted subnets", () => {
  assert.deepEqual(Object.keys(r).sort(), [
    "IntelligenceEcrApiEndpoint", "IntelligenceEcrDkrEndpoint", "IntelligenceInterfaceEndpointSecurityGroup",
    "IntelligenceLogsEndpoint", "IntelligenceSecretsEndpoint"
  ].sort());
  for (const [name,service] of Object.entries(services)) {
    const e = r[name];
    assert.equal(e.Type, "AWS::EC2::VPCEndpoint");
    assert.deepEqual(e.Properties.ServiceName, { "Fn::Sub": "com.amazonaws.${AWS::Region}." + service });
    assert.equal(e.Properties.VpcEndpointType, "Interface");
    assert.equal(e.Properties.PrivateDnsEnabled, true);
    assert.deepEqual(e.Properties.SubnetIds, { Ref: "PrivateSubnetIds" });
    assert.deepEqual(e.Properties.SecurityGroupIds, [{ Ref: "IntelligenceInterfaceEndpointSecurityGroup" }]);
  }
  const sg = r.IntelligenceInterfaceEndpointSecurityGroup;
  assert.equal(sg.Type, "AWS::EC2::SecurityGroup");
  assert.deepEqual(sg.Properties.VpcId, { Ref: "VpcId" });
  for (const category of ["SecurityGroupIngress", "SecurityGroupEgress"]) {
    const rules = sg.Properties[category];
    assert.deepEqual(rules.map(rule => rule.CidrIp).sort(), ["10.80.10.0/24","10.80.11.0/24"]);
    assert.ok(rules.every(rule => rule.IpProtocol === "tcp" && rule.FromPort === 443 && rule.ToPort === 443));
  }
});

test("foundation cannot create a task, public ALB, NAT, user, data, secrets or billing", () => {
  const forbidden = /AWS::(?:ECS::|ElasticLoadBalancingV2::|IAM::|EC2::NATGateway|Route53::|Lambda::|SecretsManager::Secret|DynamoDB::|RDS::|KMS::)/;
  for (const [name,resource] of Object.entries(r)) assert.doesNotMatch(resource.Type, forbidden, name);
  assert.match(t.Outputs.ActivationState.Value["Fn::If"][2], /no hourly interface endpoints/);
  assert.match(t.Outputs.UsageBoundary.Value, /no general Internet/);
});
