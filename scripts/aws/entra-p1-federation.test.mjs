import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=JSON.parse(readFileSync("infra/aws/entra-p1-cognito-federation-candidate.json","utf8"));
const clone=x=>JSON.parse(JSON.stringify(x));
function validate(t) {
  const p=t.Parameters, idp=t.Resources.EntraP1IdentityProvider.Properties;
  const client=t.Resources.EntraOnlyPortalClient.Properties;
  assert.deepEqual(p.PoolId.AllowedValues,["eu-north-1_dZRAEzkYa"]);
  assert.ok(p.EntraTenantId.AllowedPattern.includes("{12}"));
  assert.ok(p.EntraClientId.AllowedPattern.includes("{12}"));
  assert.equal(idp.ProviderName,"EntraP1");
  assert.equal(idp.ProviderType,"OIDC");
  assert.deepEqual(idp.ProviderDetails.oidc_issuer,{"Fn::Sub":"https://login.microsoftonline.com/"+"$"+"{EntraTenantId}/v2.0"});
  assert.match(idp.ProviderDetails.client_secret,/^\{\{resolve:secretsmanager:novapharm\/staging\/entra-p1-oidc:/);
  assert.deepEqual(client.SupportedIdentityProviders,["EntraP1"],"local passwords must remain inaccessible");
  assert.equal(client.GenerateSecret,false);
  assert.deepEqual(client.AllowedOAuthFlows,["code"],"no implicit OAuth");
  assert.deepEqual(client.AllowedOAuthScopes,["openid","email","profile"]);
  assert.deepEqual(client.CallbackURLs,[{Ref:"PortalCallback"}]);
  assert.deepEqual(p.PortalCallback.AllowedValues,["https://portal.novapharmhealthcare.com/auth/callback"]);
  assert.ok(t.Rules.RegionLock.Assertions[0].AssertDescription.includes("eu-north-1"));
  assert.equal(client.PreventUserExistenceErrors,"ENABLED");
  assert.equal(client.EnableTokenRevocation,true);
  return true;
}
test("single-tenant P1 candidate is external OIDC-only",()=>assert.equal(validate(source),true));
test("refuses local Cognito password fallback",()=>{
  const x=clone(source);x.Resources.EntraOnlyPortalClient.Properties.SupportedIdentityProviders.push("COGNITO");
  assert.throws(()=>validate(x));
});
test("refuses multi-tenant Microsoft issuer",()=>{
  const x=clone(source);x.Resources.EntraP1IdentityProvider.Properties.ProviderDetails.oidc_issuer="https://login.microsoftonline.com/common/v2.0";
  assert.throws(()=>validate(x));
});
test("refuses implicit grant",()=>{
  const x=clone(source);x.Resources.EntraOnlyPortalClient.Properties.AllowedOAuthFlows=["implicit"];
  assert.throws(()=>validate(x));
});
test("refuses unapproved callback origin",()=>{
  const x=clone(source);x.Parameters.PortalCallback.AllowedValues=["https://example.com/auth/callback"];
  assert.throws(()=>validate(x));
});
test("refuses embedded credentials",()=>{
  const x=clone(source);x.Resources.EntraP1IdentityProvider.Properties.ProviderDetails.client_secret="hardcoded-secret";
  assert.throws(()=>validate(x));
});
