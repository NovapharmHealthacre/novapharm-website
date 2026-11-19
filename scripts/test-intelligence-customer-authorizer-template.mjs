import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildPrivateCustomerAuthorizerTemplate } from "./build-intelligence-customer-authorizer-template.mjs";

test("private production authorizer infrastructure is reviewed, reproducible and default-deny", () => {
  const tpl = buildPrivateCustomerAuthorizerTemplate();
  const resources = tpl.Resources;
  const f = resources.Function.Properties;
  assert.equal(f.Environment.Variables.NPI_CUSTOMER_ACCESS_ENABLED, "false");
  assert.equal(f.Environment.Variables.NPI_CUSTOMER_ACCESS_TABLE, "novapharm-intelligence-customer-access");
  assert.equal(f.Handler, "index.handler");
  assert.equal(f.Runtime, "python3.12");
  assert.equal(f.Code.ZipFile, readFileSync(new URL("../infra/aws/intelligence-customer-authorizer.py", import.meta.url), "utf8"));
  assert.equal(resources.Logs.Properties.RetentionInDays, 30);
  assert.equal(Object.keys(resources).sort().join(","), "Function,Logs,Role");
  const policy = resources.Role.Properties.Policies[0].PolicyDocument.Statement;
  assert.deepEqual(policy[0].Action, ["dynamodb:GetItem"]);
  assert.equal(policy[0].Resource["Fn::Sub"].includes(":table/novapharm-intelligence-customer-access"), true);
  assert.deepEqual(policy[1].Action, ["logs:CreateLogStream", "logs:PutLogEvents"]);
  assert.equal(JSON.stringify(tpl).includes("dynamodb:PutItem"), false);
  assert.equal(JSON.stringify(tpl).includes("apigateway"), false);
  assert.equal(f.FunctionUrlConfig, undefined);
});
