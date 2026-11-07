import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const yaml = readFileSync("infra/aws/contact-synthetic-staging.yaml", "utf8");
const handler = readFileSync("infra/aws/contact-synthetic/index.js", "utf8");

const marker = "        ZipFile: |\n";
const start = yaml.indexOf(marker);
assert.ok(start >= 0, "Inline Lambda handler is missing");
const rest = yaml.slice(start + marker.length);
const end = rest.indexOf("\n      Tags:\n");
assert.ok(end >= 0, "Unable to locate Lambda code boundary");
const embedded = rest.slice(0, end).split("\n").map(line => {
  assert.ok(line.startsWith("          "), "Invalid handler YAML indentation");
  return line.slice(10);
}).join("\n");
assert.equal(embedded.trimEnd(), handler.trimEnd(), "Deployed Lambda handler must equal reviewed source");
assert.match(handler, /SYNTHETIC_STAGING_ONLY/, "Test-only marker required");
assert.match(handler, /Staging only\. Public submissions are disabled\./, "Anonymous requests must be rejected");
assert.match(handler, /timingSafeEqual/, "Guard key comparison must use constant-time equality");
assert.match(yaml, /RegionLock:/);
assert.match(yaml, /"eu-north-1"/);
assert.match(yaml, /NoEcho: true/, "Secret must not be echoed in the CloudFormation template");
assert.match(yaml, /BillingMode: PAY_PER_REQUEST/, "Pay-as-you-go with low staging traffic only");
assert.match(yaml, /RetentionInDays: 7/);
assert.match(yaml, /ThrottlingBurstLimit: 5/);
assert.match(yaml, /ThrottlingRateLimit: 2/);
assert.match(yaml, /live, Value: "false"/);
assert.doesNotMatch(yaml, /AWS::WAFv2::|AWS::RDS::DBInstance|AWS::Cognito::UserPool/, "No unsupported or unreviewed contact infrastructure");
console.log("PASS: AWS contact staging source/template parity, synthetic-only safety, rate limits and region lock");
