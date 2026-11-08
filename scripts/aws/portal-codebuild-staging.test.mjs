import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const template = JSON.parse(readFileSync("infra/aws/portal-codebuild-staging.json", "utf8"));
const p = template.Resources.PortalImageBuild.Properties;
const role = template.Resources.BuildRole.Properties.Policies[0].PolicyDocument.Statement;
test("staging portal builds from a single pinned GitHub source", () => {
  assert.equal(p.Source.Type, "GITHUB");
  assert.equal(p.Source.Location, "https://github.com/NovapharmHealthacre/novapharm-website.git");
  assert.equal(p.Source.Auth.Type, "CODECONNECTIONS");
  assert.match(p.Source.BuildSpec, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(p.Source.BuildSpec, /docker push/);
  assert.match(p.Source.BuildSpec, /\/novapharm\/staging\/portal:\$EXPECTED_SHA/);
  assert.doesNotMatch(p.Source.BuildSpec, /amazonaws\.com\/novapharm\/production/);
  assert.equal(p.Environment.EnvironmentVariables[0].Value, "UNSET");
  assert.equal(p.Environment.PrivilegedMode, true);
  assert.equal(p.ConcurrentBuildLimit, 1);
});
test("build role is restricted to the staging ECR repo and exact GitHub source", () => {
  const auth = role.find(s => s.Action === "codeconnections:UseConnection");
  assert.equal(auth.Condition.StringEquals["codeconnections:FullRepositoryId"], "NovapharmHealthacre/novapharm-website");
  assert.equal(auth.Condition.StringEquals["codeconnections:ProviderAction"], "GitPull");
  const ecr = role.find(s => Array.isArray(s.Action) && s.Action.includes("ecr:PutImage"));
  assert.equal(ecr.Resource, "arn:aws:ecr:eu-north-1:250675045172:repository/novapharm/staging/portal");
  assert.ok(!role.some(s => s.Action === "*" || s.Resource === "*" && s.Action !== "ecr:GetAuthorizationToken"));
});
