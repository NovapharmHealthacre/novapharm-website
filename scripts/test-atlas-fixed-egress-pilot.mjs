import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const t = JSON.parse(readFileSync("infra/aws/atlas-staging-fixed-egress-pilot.json", "utf8"));

test("pilot is blocked by default on all independent spending/security gates", () => {
  for (const name of ["PilotActivation","MonthlyOperatingCostApproval","SecurityReview"]) {
    assert.equal(t.Parameters[name].Default,"BLOCKED");
    assert.deepEqual(t.Parameters[name].AllowedValues,["BLOCKED","APPROVED"]);
  }
  assert.equal(t.Parameters.CostApprovalReference.Default,"");
  const approval = JSON.stringify(t.Conditions.ProvisionPilot);
  for (const name of ["PilotActivation","MonthlyOperatingCostApproval","SecurityReview","CostApprovalReference","AWS::Region"]) {
    assert.ok(approval.includes(name), `Missing opt-in ${name}`);
  }
  assert.ok(approval.includes("eu-north-1"));
});

test("every potentially billable resource requires the same explicit opt-in condition", () => {
  const resources = Object.entries(t.Resources);
  assert.ok(resources.length >= 10);
  for (const [name, value] of resources) {
    assert.equal(value.Condition, "ProvisionPilot", `${name} missing cost gate`);
  }
  const types = resources.map(([_,r])=>r.Type);
  assert.ok(types.includes("AWS::EC2::NatGateway"));
  assert.ok(types.includes("AWS::EC2::EIP"));
  assert.ok(types.includes("AWS::EC2::VPC"));
  assert.equal(types.includes("AWS::ECS::Service"),false);
  assert.equal(types.includes("AWS::Lambda::Function"),false);
});

test("network never shares production VPC or alters existing route table", () => {
  const templateText = JSON.stringify(t);
  assert.ok(!templateText.includes("vpc-0caa0618d5a29052a"));
  assert.ok(!templateText.includes("subnet-01ab9197e8e6537ed"));
  assert.ok(!templateText.includes("subnet-03165bd4b19d3a5af"));
  assert.equal(t.Resources.PilotVpc.Properties.CidrBlock,"10.91.0.0/16");
  assert.equal(t.Resources.PilotPublicSubnet.Properties.MapPublicIpOnLaunch,false);
  assert.equal(t.Resources.PilotPrivateSubnet.Properties.MapPublicIpOnLaunch,false);
  assert.deepEqual(t.Resources.PilotPrivateDefaultRoute.Properties.NatGatewayId,{Ref:"PilotNatGateway"});
});

test("private probe security group has zero ingress and limits egress to TLS service ports", () => {
  const sg=t.Resources.PilotNoIngressSecurityGroup.Properties;
  assert.deepEqual(sg.SecurityGroupIngress,[]);
  assert.deepEqual(sg.SecurityGroupEgress.map(x=>x.FromPort).sort((a,b)=>a-b),[443,27017]);
  for(const x of sg.SecurityGroupEgress) {
    assert.equal(x.IpProtocol,"tcp");
    assert.equal(x.FromPort,x.ToPort);
  }
  // A private NAT default route 0/0 is not an Atlas allowlist. No
  // Atlas project IP access-list is created or broadened by this stack.
  assert.ok(!JSON.stringify(t.Resources).includes("0.0.0.0/0\" allows access"));
  assert.equal(Object.values(t.Resources).some(x=>/MongoDB|Atlas::AccessList/.test(x.Type)),false);
});
test("outputs label the environment as staging, not production or payment", () => {
  assert.match(t.Description,/STAGING PILOT ONLY/);
  assert.match(t.Outputs.DataReleaseState.Value,/NO MEDICINE DATA RIGHTS/);
  assert.ok(t.Outputs.PilotOutboundIp.Condition==="ProvisionPilot");
});
