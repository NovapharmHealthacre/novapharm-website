import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const plan=JSON.parse(read("infra/aws/fda-private-api-release-plan-20261121.json"));
test("planned FDA AWS route is explicit JWT-only and not an existing IAM fallback grant",()=>{
 assert.equal(plan.intendedRoute,"GET /v1/intelligence/regulatory/us/fda-research");
 assert.equal(plan.intendedAuthorizationType,"JWT");
 assert.equal(plan.currentCatchAllAuthorization,"AWS_IAM");
 assert.equal(plan.requiredCognitoScope,"novapharm/fda.read");
 assert.equal(plan.deploymentState,"source_only_not_deployed");
 assert.equal(plan.existingMobileAppClients,0);
 assert.equal(plan.zeroNewPaidInfrastructureConstraint,true);
 assert.equal(plan.ownerProductionSignoff,"not_granted");
 for(const key of [
   "nativeBundleIDApproved","androidPackageIDApproved","nativeRedirectsRegistered",
   "nativeMFADeviceAcceptance","boardGroupMappingApproved","independentTermsAcceptance",
   "dataAdmissionApproved","distributedPerPrincipalQuotaAvailable","privateLambdaImageUpdated",
   "approvedApiGatewayJWTIntegration","privateApiLiveSmokePassed"
 ]) assert.equal(plan[key],false,key);
});
test("source policy remains separate from API activation and all external writes",()=>{
 const limits=JSON.parse(read("config/intelligence/owner-production-constraints.json"));
 const manifest=JSON.parse(read("config/intelligence/us-fda-governance-source-manifest.json"));
 assert.equal(limits.productionSignoff,"not_granted");
 assert.equal(limits.productionPermissions.cutOverPortalDnsOrApiMapping,false);
 assert.equal(limits.productionPermissions.provisionNewPaidInfrastructure,false);
 assert.equal(limits.productionPermissions.admitUnapprovedMedicineData,false);
 assert.equal(manifest.admissionPermitted,false);
 assert.equal(manifest.sourceTypes.length,5);
});
test("native transport cannot provide direct public-source browser calls",()=>{
 const android=read("native/novapharm-intelligence-mobile/ProtectedFdaGateway.ts");
 const ios=read("native/novapharm-intelligence-ios/App/ProtectedFdaGateway.swift");
 const auth=read("native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift");
 assert.match(android,/mobileSessionAccepted/);
 assert.match(android,/signedAppIdentityAccepted/);
 assert.match(ios,/NovaNativeReleasePolicy\.protectedNetworkOperationsEnabled/);
 assert.match(auth,/ASWebAuthenticationSession/);
 assert.match(auth,/SecRandomCopyBytes/);
 assert.match(auth,/SHA256\.hash/);
 assert.match(auth,/openid profile novapharm\/fda\.read/);
 assert.match(auth,/kSecAttrAccessibleWhenUnlockedThisDeviceOnly/);
 for(const source of [android,ios,auth]) assert.doesNotMatch(source,/https:\/\/api\.fda\.gov\/drug/);
});

test("conditional CloudFormation route cannot activate without six independent signoffs",()=>{
 const template=JSON.parse(read("infra/aws/fda-private-jwt-route.cfn.json"));
 const required=["OwnerProductionSignoff","SourceRightsSignoff","NativeIdentitySignoff",
   "DistributedQuotaVerified","PrivateImageVerified","IndependentReleaseAcceptance"];
 for(const key of required){
   assert.equal(template.Parameters[key].Default,"false",key);
   assert.deepEqual(template.Parameters[key].AllowedValues,["false","true"]);
 }
 assert.equal(template.Conditions.AllowRoute["Fn::And"].length,required.length);
 for(const key of required)
   assert.ok(template.Conditions.AllowRoute["Fn::And"].some(item=>
     item["Fn::Equals"]?.[0]?.Ref===key && item["Fn::Equals"]?.[1]==="true"),key);
 for(const r of Object.values(template.Resources))assert.equal(r.Condition,"AllowRoute");
 const route=template.Resources.BoardOnlyFdaRoute.Properties;
 assert.equal(route.RouteKey,"GET /v1/intelligence/regulatory/us/fda-research");
 assert.equal(route.AuthorizationType,"JWT");
 assert.deepEqual(route.AuthorizationScopes,["novapharm/fda.read"]);
 assert.equal(route.AuthorizerId.Ref,"VerifiedJWTAuthorizerId");
 assert.equal(template.Resources.PrivateFdaInvokePermission.Properties.Principal,"apigateway.amazonaws.com");
});
