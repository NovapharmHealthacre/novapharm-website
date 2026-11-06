import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertNewExperienceFreePlanTemplate } from "./check-free-plan-capabilities.mjs";

const valid = JSON.parse(readFileSync(new URL("../../infra/aws/foundation.json", import.meta.url), "utf8"));
const one = type => ({ Parameters: { Environment: { AllowedValues: ["staging"] } }, Resources: { Forbidden: { Type: type } } });
test("current AWS foundation excludes unsupported Free-plan resources", () => {
  assert.ok(assertNewExperienceFreePlanTemplate(valid) > 0);
});
for (const type of [
  "AWS::GuardDuty::Detector", "AWS::SecurityHub::Hub", "AWS::DMS::ReplicationInstance",
  "AWS::SSO::PermissionSet", "AWS::Shield::Protection", "AWS::NetworkFirewall::Firewall",
  "AWS::Macie::Session", "AWS::Organizations::Organization"
]) {
  test(`explicitly unsupported service is rejected: ${type}`, () => {
    assert.throws(() => assertNewExperienceFreePlanTemplate(one(type)), /unavailable/);
  });
}
test("nested stack cannot bypass Free-plan capability gate", () => {
  assert.throws(() => assertNewExperienceFreePlanTemplate(one("AWS::CloudFormation::Stack")), /Nested stacks/);
});
test("CloudFront-scoped WAF may not be assumed available in project Region", () => {
  const x = one("AWS::WAFv2::WebACL");
  x.Resources.Forbidden.Properties = { Scope: "CLOUDFRONT" };
  assert.throws(() => assertNewExperienceFreePlanTemplate(x), /CloudFront WAF/);
});
