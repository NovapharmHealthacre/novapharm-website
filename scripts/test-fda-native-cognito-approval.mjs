import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
const t=JSON.parse(readFileSync(new URL("../infra/aws/fda-native-cognito-approval.cfn.json",import.meta.url),"utf8"));
const required=[
 "OwnerProductionSignoff","NativeIdentityApproved","NativeCallbacksApproved",
 "BoardGovernanceApproved","IndependentSecurityApproved","SourceRightsApproved"
];
const identities=["IosBundleId","AndroidPackageId","IosRedirectUri","AndroidRedirectUri"];
test("no native identity resources can be created by default",()=>{
 for(const k of required){
  assert.equal(t.Parameters[k].Default,"false",k);
  assert.deepEqual(t.Parameters[k].AllowedValues,["false","true"]);
 }
 for(const k of identities)assert.equal(t.Parameters[k].Default,"UNAPPROVED");
 assert.equal(t.Conditions.CreateNativeFDAIdentity["Fn::And"].length,10);
 for(const k of required)
  assert.ok(t.Conditions.CreateNativeFDAIdentity["Fn::And"].some(x=>
    x["Fn::Equals"]?.[0]?.Ref===k&&x["Fn::Equals"]?.[1]==="true"),k);
 for(const k of identities)
  assert.ok(t.Conditions.CreateNativeFDAIdentity["Fn::And"].some(x=>
    x["Fn::Not"]?.[0]?.["Fn::Equals"]?.[0]?.Ref===k),k);
 for(const resource of Object.values(t.Resources))
  assert.equal(resource.Condition,"CreateNativeFDAIdentity");
 assert.equal(t.Outputs.NativeIdentityReleaseStatus.Value["Fn::If"][2],"disabled_zero_resources");
});
test("native OAuth uses separate public PKCE app clients with exact registered callbacks",()=>{
 for(const [name,callback] of [
  ["FDAiOSPublicClient","IosRedirectUri"],["FDAAndroidPublicClient","AndroidRedirectUri"]
 ]){
  const item=t.Resources[name];assert.equal(item.Type,"AWS::Cognito::UserPoolClient");
  assert.equal(item.DependsOn,"FDAResourceServer");
  assert.equal(item.Properties.GenerateSecret,false);
  assert.equal(item.Properties.AllowedOAuthFlowsUserPoolClient,true);
  assert.deepEqual(item.Properties.AllowedOAuthFlows,["code"]);
  assert.deepEqual(item.Properties.CallbackURLs,[{Ref:callback}]);
  assert.deepEqual(item.Properties.AllowedOAuthScopes,["openid","profile","novapharm/fda.read"]);
  assert.equal(item.Properties.EnableTokenRevocation,true);
  assert.equal(item.Properties.PreventUserExistenceErrors,"ENABLED");
  assert.deepEqual(item.Properties.SupportedIdentityProviders,["COGNITO"]);
  assert.ok(!JSON.stringify(item).includes("ClientSecret"));
  assert.ok(!JSON.stringify(item).includes("implicit"));
 }
});
test("dedicated scope and empty board group do not grant any member access",()=>{
 const server=t.Resources.FDAResourceServer;
 assert.equal(server.Type,"AWS::Cognito::UserPoolResourceServer");
 assert.equal(server.Properties.Identifier,"novapharm");
 assert.deepEqual(server.Properties.Scopes,[{
  ScopeName:"fda.read",ScopeDescription:"Official US FDA research, approved board only"
 }]);
 const group=t.Resources.FDABoardGroup;
 assert.equal(group.Type,"AWS::Cognito::UserPoolGroup");
 assert.equal(group.Properties.GroupName,"board-reviewers");
 assert.ok(!Object.values(t.Resources).some(x=>x.Type==="AWS::Cognito::UserPoolUserToGroupAttachment"));
});
test("native clients do not create a protected API route or override existing users",()=>{
 assert.equal(t.Parameters.UserPoolId.Default,"eu-north-1_jBL6hCUE2");
 assert.deepEqual(Object.values(t.Resources).map(x=>x.Type).sort(),[
  "AWS::Cognito::UserPoolClient",
  "AWS::Cognito::UserPoolClient",
  "AWS::Cognito::UserPoolGroup",
  "AWS::Cognito::UserPoolResourceServer"
 ].sort());
 assert.ok(!Object.values(t.Resources).some(x=>/ApiGateway|Lambda|DynamoDB/u.test(x.Type)));
});

test("iOS and Android accept only the production Cognito tenant, not an AWS regional suffix",()=>{
 const hostname="novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com";
 const ios=readFileSync(new URL("../native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift",import.meta.url),"utf8");
 const android=readFileSync(new URL("../native/novapharm-intelligence-mobile/NativeFdaOidcCore.ts",import.meta.url),"utf8");
 assert.ok(ios.includes('authorizeURL.host == "'+hostname+'"'),"iOS must pin the exact Cognito tenant");
 assert.ok(!ios.includes("authorizeURL.host?.hasSuffix"),"iOS must not trust a regional suffix");
 assert.ok(android.includes('const expectedHost="'+hostname+'";'),"Android must pin the same Cognito tenant");
 assert.ok(android.includes("domain.hostname===expectedHost"),"Android must enforce exact tenant match");
 assert.ok(!android.includes("domain.hostname.endsWith("),"Android must not trust a regional suffix");
});

test("iOS Cognito token response is streamed with a byte and resource-time bound",()=>{
 const ios=readFileSync(new URL("../native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift",import.meta.url),"utf8");
 assert.ok(ios.includes("session.bytes(for:req)"),"iOS must stream before buffering");
 assert.ok(!ios.includes("session.data(for:req)"),"iOS may not collect an unbounded token response");
 assert.ok(ios.includes("guard data.count<16*1024"),"iOS must stop before buffering an oversized token");
 assert.ok(ios.includes("configuration.timeoutIntervalForResource=10"),"iOS must bound total resource time");
 assert.ok(ios.includes("session.invalidateAndCancel()"),"iOS must cancel/clean up the token session");
});
