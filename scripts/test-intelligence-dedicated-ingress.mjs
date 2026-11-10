import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const file = "infra/aws/intelligence-dedicated-ingress-candidate.json";
const template = JSON.parse(readFileSync(file, "utf8"));
const resources = template.Resources;
const condition = "ActivateAfterApproval";
const ref = (value) => value?.Ref;

test("production infrastructure cannot activate by default", () => {
  assert.equal(template.Parameters.ActivationApproval.Default, "BLOCKED");
  assert.deepEqual(template.Parameters.ActivationApproval.AllowedValues, ["BLOCKED", "APPROVED"]);
  assert.deepEqual(template.Conditions[condition], { "Fn::And": [
    { "Fn::Equals": [{ Ref: "ActivationApproval" }, "APPROVED"] },
    { "Fn::Equals": [{ Ref: "PrivateEgressAcceptance" }, "ACCEPTED"] },
  ] });
  assert.equal(template.Parameters.PrivateEgressAcceptance.Default, "BLOCKED");
  assert.deepEqual(template.Parameters.PrivateEgressAcceptance.AllowedValues, ["BLOCKED", "ACCEPTED"]);
  for (const [name, resource] of Object.entries(resources)) {
    assert.equal(resource.Condition, condition, name + " must require owner acceptance");
  }
});

test("dedicated Intelligence service does not reference staging or Nutraxin resources", () => {
  const service = resources.IntelligenceService.Properties;
  assert.equal(service.ServiceName, "novapharm-intelligence-terminal");
  assert.equal(ref(service.TaskDefinition), "ProductionTaskDefinitionArn");
  assert.equal(service.NetworkConfiguration.AwsvpcConfiguration.AssignPublicIp, "DISABLED");
  assert.equal(service.EnableExecuteCommand, false);
  assert.ok(service.DesiredCount.Ref === "DesiredCount");
  assert.equal(template.Parameters.DesiredCount.MinValue, 2);
  // The production cluster already exists; recreating it in this stack would
  // collide with the dedicated cluster and fail production deployment.
  assert.equal(resources.IntelligenceCluster, undefined);
  assert.deepEqual(
    Object.keys(resources).filter((name) => /^(?:IntelligenceCluster|IntelligenceService)$/u.test(name)),
    ["IntelligenceService"],
  );
  assert.equal(resources.IntelligenceService.Properties.Cluster.Ref, "ExistingIntelligenceClusterArn");
  assert.equal(template.Parameters.ExistingIntelligenceClusterArn.AllowedPattern,
    "^arn:aws:ecs:eu-north-1:[0-9]{12}:cluster/novapharm-intelligence-production$");
});

test("TLS-only WAF-protected ALB and private target boundaries", () => {
  const alb = resources.IntelligenceAlb.Properties;
  const listener = resources.IntelligenceHttpsListener.Properties;
  assert.equal(alb.Scheme, "internet-facing");
  assert.equal(listener.Port, 443);
  assert.equal(listener.Protocol, "HTTPS");
  assert.equal(ref(listener.Certificates[0].CertificateArn), "IssuedCertificateArn");
  assert.equal(resources.IntelligenceWaf.Properties.Scope, "REGIONAL");
  assert.equal(ref(resources.IntelligenceWafAssociation.Properties.ResourceArn), "IntelligenceAlb");
  const ingress = resources.IntelligenceAlbSecurityGroup.Properties.SecurityGroupIngress;
  assert.deepEqual(ingress.map((x) => x.FromPort), [443]);
  assert.equal(resources.IntelligenceTaskSecurityGroup.Properties.SecurityGroupIngress.length, 0);
  assert.equal(ref(resources.IntelligenceTaskFromAlbIngress.Properties.GroupId), "IntelligenceTaskSecurityGroup");
  assert.equal(ref(resources.IntelligenceTaskFromAlbIngress.Properties.SourceSecurityGroupId), "IntelligenceAlbSecurityGroup");
  assert.equal(ref(resources.IntelligenceAlbToTaskEgress.Properties.DestinationSecurityGroupId), "IntelligenceTaskSecurityGroup");
  assert.equal(resources.IntelligenceAlbToTaskEgress.Properties.ToPort, 4303);
  assert.ok(alb.LoadBalancerAttributes.some((x) => x.Key === "access_logs.s3.enabled" && x.Value === "true"));
  assert.ok(alb.LoadBalancerAttributes.some((x) => x.Key === "deletion_protection.enabled" && x.Value === "true"));
  assert.ok(resources.IntelligenceUnhealthyAlarm.Properties.Threshold === 0);
});

test("template has no credentials, DNS mutation, payment activation or unconditional charges", () => {
  assert.equal(Object.values(resources).some((x) => /Route53::|CertificateManager::Certificate|SecretsManager::Secret|Stripe/.test(x.Type)), false);
  assert.equal(Object.values(resources).some((x) => !x.Condition), false);
  assert.equal(JSON.stringify(template).includes("COGNITO_CLIENT_SECRET"), false);
});
