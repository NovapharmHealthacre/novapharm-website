import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildIntelligenceCustomerSessionTemplate } from "./build-intelligence-customer-session-api-template.mjs";

test("production customer API remains unexposed and disabled by default", () => {
  const t = buildIntelligenceCustomerSessionTemplate();
  assert.equal(t.Parameters.EnableCustomerRoutes.Default, "false");
  assert.equal(t.Parameters.CustomerLaunchAccepted.Default, "false");
  assert.deepEqual(t.Parameters.EnableCustomerRoutes.AllowedValues, ["false", "true"]);
  assert.deepEqual(t.Parameters.CustomerLaunchAccepted.AllowedValues, ["false", "true"]);
  const fun = t.Resources.Function.Properties;
  assert.equal(fun.Environment.Variables.NPI_CUSTOMER_ACCESS_ENABLED.Ref, "CustomerLaunchAccepted");
  assert.equal(fun.Environment.Variables.NPI_CUSTOMER_ACCESS_TABLE, "novapharm-intelligence-customer-access");
  assert.equal(fun.Code.ZipFile, readFileSync(new URL("../infra/aws/intelligence-customer-session-api.py", import.meta.url), "utf8"));
  assert.equal(t.Resources.GatewayIntegration.Condition, "ExposeCustomerRoutes");
  assert.equal(t.Resources.AllowGatewayInvoke.Condition, "ExposeCustomerRoutes");
  assert.equal(t.Resources.CustomerJwtAuthorizer.Condition, "ExposeCustomerRoutes");
  assert.equal(t.Resources.CreateSession.Condition, "ExposeCustomerRoutes");
  assert.equal(t.Resources.ReadSession.Condition, "ExposeCustomerRoutes");
  assert.equal(t.Resources.RevokeSession.Condition, "ExposeCustomerRoutes");
});

test("Cognito JWT is required for session issuance, other session routes validate cookies inside Lambda", () => {
  const r = buildIntelligenceCustomerSessionTemplate().Resources;
  assert.equal(r.CreateSession.Properties.AuthorizationType, "JWT");
  assert.equal(r.ReadSession.Properties.AuthorizationType, "NONE");
  assert.equal(r.RevokeSession.Properties.AuthorizationType, "NONE");
  assert.equal(r.CustomerJwtAuthorizer.Properties.AuthorizerType, "JWT");
  assert.equal(r.CustomerJwtAuthorizer.Properties.JwtConfiguration.Issuer,
    "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2");
  assert.deepEqual(r.CustomerJwtAuthorizer.Properties.JwtConfiguration.Audience,
    ["7c76122stt76k4d8cjvd7tf6ck"]);
  assert.deepEqual(r.CustomerJwtAuthorizer.Properties.IdentitySource,
    ["$request.header.Authorization"]);
  assert.equal(r.CreateSession.Properties.RouteKey, "POST /customer/session");
  assert.equal(r.ReadSession.Properties.RouteKey, "GET /customer/session");
  assert.equal(r.RevokeSession.Properties.RouteKey, "POST /customer/logout");
});

test("Lambda IAM is restricted to customer table operations and log writing", () => {
  const r = buildIntelligenceCustomerSessionTemplate().Resources;
  const statements = r.Role.Properties.Policies[0].PolicyDocument.Statement;
  assert.deepEqual(statements[0].Action,
    ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:TransactWriteItems"]);
  assert.deepEqual(statements[1].Action, ["logs:CreateLogStream", "logs:PutLogEvents"]);
  assert.ok(statements[0].Resource["Fn::Sub"].endsWith(":table/novapharm-intelligence-customer-access"));
  assert.match(statements[0].Resource["Fn::Sub"], /^arn:\$\{AWS::Partition\}:dynamodb:\$\{AWS::Region\}:/);
  assert.match(r.AllowGatewayInvoke.Properties.SourceArn["Fn::Sub"],
    /^arn:\$\{AWS::Partition\}:execute-api:\$\{AWS::Region\}:/);
  assert.equal(JSON.stringify(r).includes("cognito-idp:AdminCreateUser"), false);
  assert.equal(JSON.stringify(r).includes("ses:SendEmail"), false);
  assert.equal(JSON.stringify(r).includes("stripe"), false);
  assert.equal(r.Function.Properties.FunctionUrlConfig, undefined);
});

test("Lambda app cannot leak session secret inside JSON body, cookie-only authorization", () => {
  const source = readFileSync(new URL("../infra/aws/intelligence-customer-session-api.py", import.meta.url), "utf8");
  assert.match(source, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(source, /ConsistentRead=True/);
  assert.match(source, /transact_write_items/);
  assert.match(source, /client\.query/);
  assert.match(source, /client\.get_item/);
  assert.match(source, /approved_records/);
  assert.match(source, /gateway_event/);
  assert.match(source, /sourceRightsApproved/);
  assert.match(source, /customerLaunchAccepted/);
  assert.match(source, /revokedAt/);
});
