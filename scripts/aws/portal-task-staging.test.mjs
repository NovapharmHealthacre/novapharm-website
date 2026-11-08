import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = JSON.parse(readFileSync("infra/aws/portal-task-staging.json", "utf8"));
const group = template.Resources.PortalSecurityGroup.Properties;
const task = template.Resources.PortalTaskDefinition.Properties;
const container = task.ContainerDefinitions[0];
test("portal staging smoke cannot expose a public listener or customer identity", () => {
  assert.deepEqual(group.SecurityGroupIngress, []);
  assert.deepEqual(group.SecurityGroupEgress.map(x => [x.IpProtocol, x.FromPort, x.ToPort]), [["tcp", 443, 443]]);
  assert.equal(task.NetworkMode, "awsvpc");
  assert.deepEqual(task.RequiresCompatibilities, ["FARGATE"]);
  assert.equal(task.Cpu, "512");
  assert.equal(task.Memory, "1024");
  assert.equal(container.Name, "portal");
  assert.ok(container.Environment.some(x => x.Name === "HOSTNAME" && x.Value === "0.0.0.0"), "Next.js must bind to loopback and task ENI");
  assert.match(container.Image, /@sha256:[0-9a-f]{64}$/);
  assert.ok(container.HealthCheck.Command.some(v => v.includes("127.0.0.1:4303")));
  assert.ok(!Object.values(template.Resources).some(v => v.Type === "AWS::ECS::Service" || v.Type === "AWS::ElasticLoadBalancingV2::LoadBalancer"));
});
test("portal task execution role can only read staging ECR image and write its logs", () => {
  const stmts = template.Resources.PortalExecutionRole.Properties.Policies[0].PolicyDocument.Statement;
  const read = stmts.find(s => Array.isArray(s.Action) && s.Action.includes("ecr:GetDownloadUrlForLayer"));
  assert.equal(read.Resource, "arn:aws:ecr:eu-north-1:250675045172:repository/novapharm/staging/portal");
  assert.ok(stmts.every(s => s.Effect === "Allow"));
  assert.ok(stmts.every(s => s.Resource !== "*" || (Array.isArray(s.Action) && s.Action.length === 1 && s.Action[0] === "ecr:GetAuthorizationToken")));
});
