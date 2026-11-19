import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stack = JSON.parse(readFileSync("infra/aws/customer-cognito-staging.json", "utf8"));
const pool = stack.Resources.CustomerIdentityPool.Properties;
const client = stack.Resources.CustomerStagingClient.Properties;

test("customer identity must not share workforce Entra pool or grant roles", () => {
  assert.equal(pool.UserPoolName, "novapharm-staging-customer-identity");
  assert.notEqual(pool.UserPoolName, "novapharm-staging-entra-p1-broker");
  assert.equal(pool.AdminCreateUserConfig.AllowAdminCreateUserOnly, true);
  assert.equal(pool.DeletionProtection, "ACTIVE");
  assert.equal(pool.UserPoolTags.activation, "disabled");
  assert.equal(client.UserPoolId.Ref, "CustomerIdentityPool");
  assert.equal(client.GenerateSecret, false);
  assert.equal(client.PreventUserExistenceErrors, "ENABLED");
  assert.equal(client.EnableTokenRevocation, true);
  assert.ok(!("AllowedOAuthFlowsUserPoolClient" in client));
  assert.ok(!("CallbackURLs" in client));
  assert.ok(!("HostedUI" in pool));
  assert.ok(!("Groups" in stack.Resources));
});
test("authentication requires verified email, strong password, TOTP option and limited attributes", () => {
  assert.deepEqual(pool.UsernameAttributes, ["email"]);
  assert.deepEqual(pool.AutoVerifiedAttributes, ["email"]);
  assert.deepEqual(pool.UserAttributeUpdateSettings.AttributesRequireVerificationBeforeUpdate, ["email"]);
  const policy = pool.Policies.PasswordPolicy;
  assert.equal(policy.MinimumLength, 12);
  assert.equal(policy.RequireLowercase, true);
  assert.equal(policy.RequireUppercase, true);
  assert.equal(policy.RequireNumbers, true);
  assert.equal(policy.RequireSymbols, true);
  assert.deepEqual(pool.EnabledMfas, ["SOFTWARE_TOKEN_MFA"]);
  assert.deepEqual(client.WriteAttributes, ["email"]);
  assert.deepEqual(client.ReadAttributes, ["email","email_verified"]);
});
