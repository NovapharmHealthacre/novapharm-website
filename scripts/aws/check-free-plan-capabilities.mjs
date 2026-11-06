import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const unavailableFamilies = [
  "AWS::GuardDuty::",
  "AWS::SecurityHub::",
  "AWS::DMS::",
  "AWS::SSO::",
  "AWS::Shield::",
  "AWS::NetworkFirewall::",
  "AWS::Macie::",
  "AWS::Organizations::"
];

export function assertNewExperienceFreePlanTemplate(template) {
  assert.ok(template && typeof template === "object" && template.Resources, "CloudFormation resources are required");
  for (const [logicalId, resource] of Object.entries(template.Resources)) {
    const type = resource?.Type;
    assert.equal(typeof type, "string", `Missing resource type: ${logicalId}`);
    for (const family of unavailableFamilies) {
      assert.ok(!type.startsWith(family),
        `${logicalId}: ${type} is unavailable in the AWS new Free experience; never silently create, bypass or upgrade to paid/advanced features`);
    }
    assert.notEqual(type, "AWS::CloudFormation::Stack",
      "Nested stacks need separate reviewed capability and pricing boundaries; not allowed in Free-trial foundation");
    if (type === "AWS::WAFv2::WebACL") {
      assert.notEqual(resource.Properties?.Scope, "CLOUDFRONT",
        "CloudFront WAF requires global/us-east-1 scope; the selected-Region Free project cannot assume access");
    }
    if (type === "AWS::Lambda::Function") {
      const tags = JSON.stringify(resource.Properties || {});
      assert.ok(!tags.includes("us-east-1") || !tags.includes("LambdaEdge"),
        "Lambda@Edge is not supported in the new AWS experience");
    }
  }
  const allowed = template.Parameters?.Environment?.AllowedValues || [];
  assert.ok(allowed.includes("staging"), "Free-trial candidate must expose a staging environment");
  return Object.keys(template.Resources).length;
}

if (process.argv[1]?.endsWith("check-free-plan-capabilities.mjs")) {
  try {
    const filename = process.argv[2] || "infra/aws/foundation.json";
    const resourceCount = assertNewExperienceFreePlanTemplate(JSON.parse(readFileSync(filename, "utf8")));
    console.log(`PASS: ${resourceCount} AWS foundation resources contain no explicitly unsupported Free-plan CloudFormation service families. This is a static guard, NOT an AWS account capability or quota check.`);
  } catch (error) {
    console.error(error?.message || "Unknown Free-plan capability validation failure");
    process.exitCode = 1;
  }
}
