import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stack = JSON.parse(readFileSync("infra/aws/portal-staging-service.json", "utf8"));
const svc = stack.Resources.PrivatePortalService.Properties;
const smoke = JSON.parse(readFileSync("infra/aws/portal-task-staging.json", "utf8"));
test("staging ECS service is never public or automatically charged for Fargate tasks", () => {
  assert.equal(stack.Parameters.DesiredCount.Default, 0);
  assert.equal(stack.Parameters.DesiredCount.MaxValue, 1);
  assert.equal(svc.DesiredCount.Ref, "DesiredCount");
  assert.equal(svc.LaunchType, "FARGATE");
  assert.equal(svc.EnableExecuteCommand, false);
  assert.equal(svc.NetworkConfiguration.AwsvpcConfiguration.SecurityGroups[0].Ref, "PortalSecurityGroupId");
  assert.equal(svc.NetworkConfiguration.AwsvpcConfiguration.AssignPublicIp, "ENABLED", "Public IP is egress-only, never permission for inbound traffic");
  assert.deepEqual(smoke.Resources.PortalSecurityGroup.Properties.SecurityGroupIngress, []);
  assert.equal(svc.DeploymentConfiguration.DeploymentCircuitBreaker.Rollback, true);
  assert.equal(svc.DeploymentConfiguration.DeploymentCircuitBreaker.Enable, true);
  assert.ok(!Object.values(stack.Resources).some(x => /LoadBalancer|Listener|TargetGroup|Route53|CloudFront/.test(x.Type)), "No website/DNS or public service activation is allowed");
});
test("staging service pins exact existing task family and synthetic data boundary", () => {
  assert.match(stack.Parameters.TaskDefinitionArn.Default, /^arn:aws:ecs:eu-north-1:250675045172:task-definition\/novapharm-staging-portal-smoke:\d+$/);
  assert.equal(svc.TaskDefinition.Ref, "TaskDefinitionArn");
  assert.ok(svc.Tags.some(x => x.Key === "data-classification" && x.Value === "synthetic-only"));
  assert.ok(!("LoadBalancers" in svc));
  assert.ok(!("ServiceRegistries" in svc));
});
