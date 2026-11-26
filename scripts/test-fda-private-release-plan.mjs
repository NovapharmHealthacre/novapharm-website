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
 for(const source of [android,ios,auth]) assert.equal(source.includes("https://api.fda.gov/drug/"), false, "Native source must not contact public FDA hosts directly");
});

test("iOS Cognito client rejects alternate callback schemes and duplicate OAuth state/code",()=>{
 const ios=read("native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift");
 assert.ok(ios.includes('redirectURL.absoluteString == "novapharmintelligence://oauth/callback"'));
 assert.doesNotMatch(ios,/hasPrefix\("novapharm"\)/);
 assert.ok(ios.includes('URLQueryItem(name:"nonce",value:nonce)'));
 assert.ok(ios.includes('items.count==2'));
 assert.ok(ios.includes('items.filter({$0.name=="state"}).count==1'));
 assert.ok(ios.includes('items.filter({$0.name=="code"}).count==1'));
 assert.ok(ios.includes('callback.fragment == nil'));
 assert.ok(ios.includes('code.utf8.allSatisfy'));
 assert.ok(ios.includes('kSecAttrAccessibleWhenUnlockedThisDeviceOnly'));
 assert.ok(ios.includes('NovaNativeReleasePolicy.productionApproved'));
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

test("iOS Keychain deletion failures deny replacing or switching board credentials",()=>{
 const source=read("native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift");
 assert.ok(source.includes("func clear() -> Bool"));
 assert.ok(source.includes("status == errSecSuccess || status == errSecItemNotFound"));
 assert.ok(source.includes("guard clear() else { throw NovaFDAOIDCError.token }"));
 assert.ok(source.includes("guard store.clear() else {"));
 assert.ok(source.includes("func signOut() -> Bool"));
});
test("iOS board sign-in refuses concurrent sessions and clears stale access before new PKCE",()=>{
 const source=read("native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift");
 const start=source.indexOf("    func beginSignIn(");
 const end=source.indexOf("    private func exchange(",start);
 assert.ok(start>0 && end>start,"Expected native session implementation");
 const segment=source.slice(start,end);
 const concurrency=segment.indexOf("guard activeSession == nil else");
 const clear=segment.indexOf("store.clear()",concurrency);
 const verifier=segment.indexOf("let verifier=fdaURLSafeBase64");
 const browser=segment.indexOf("ASWebAuthenticationSession(");
 assert.ok(concurrency>=0 && concurrency<clear);
 assert.ok(clear>concurrency && clear<verifier && verifier<browser,
   "Previous board access must be cleared before OS entropy and browser launch");
 assert.ok(segment.includes("if authGeneration == attemptGeneration { _ = store.clear() }"));
});

test("iOS rejected late OAuth token exchange cannot resurrect access after sign-out",()=>{
 const source=read("native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift");
 const signOut=source.slice(source.indexOf("func signOut() -> Bool"),source.indexOf("func cachedAccessToken()"));
 assert.ok(signOut.includes("authGeneration &+= 1"),"sign-out invalidates all in-flight callbacks");
 assert.ok(signOut.indexOf("authGeneration &+= 1")<signOut.indexOf("activeSession?.cancel()"),
   "invalidate attempt before asynchronous session cancellation");
 const signIn=source.slice(source.indexOf("func beginSignIn("),source.indexOf("private func exchange("));
 assert.ok(signIn.includes("authGeneration &+= 1"),"new sign-in supersedes prior exchange");
 assert.ok(signIn.includes("let attemptGeneration=authGeneration"));
 assert.ok(signIn.includes("self.authGeneration == attemptGeneration"),
   "late callbacks cannot affect newer sessions");
 assert.ok(signIn.includes("generation:attemptGeneration"));
 assert.ok(signIn.includes("if self.authGeneration == attemptGeneration { _ = self.store.clear() }"),
   "old callbacks cannot clear newer credentials");
 const exchange=source.slice(source.indexOf("private func exchange("));
 const awaitNetwork=exchange.indexOf("try await session.bytes(for:req)");
 const boundedRead=exchange.indexOf("for try await byte in bytes");
 const generationCheck=exchange.indexOf("guard authGeneration == generation else");
 const save=exchange.indexOf("try store.save(");
 assert.ok(awaitNetwork>=0 && boundedRead>awaitNetwork && generationCheck>boundedRead && save>generationCheck,
   "after suspending for network, generation must be revalidated before token persistence");
});

test("iOS cached board token stays revoked when Keychain sign-out deletion fails",()=>{
 const source=read("native/novapharm-intelligence-ios/App/CognitoFDAAuthSession.swift");
 const signOut=source.slice(source.indexOf("func signOut() -> Bool"),source.indexOf("func cachedAccessToken()"));
 assert.ok(signOut.includes("accessRevoked=true"));
 assert.ok(signOut.indexOf("accessRevoked=true")<signOut.indexOf("store.clear()"));
 const getter=source.slice(source.indexOf("func cachedAccessToken()"),source.indexOf("func beginSignIn("));
 assert.ok(getter.includes("guard !accessRevoked &&"));
 const begin=source.slice(source.indexOf("func beginSignIn("),source.indexOf("private func exchange("));
 assert.ok(begin.includes("accessRevoked=true"));
 assert.ok(begin.indexOf("authGeneration &+= 1")<begin.indexOf("guard store.clear()"),
   "Previous in-flight callbacks must be invalidated before even a failed Keychain erase");
 assert.ok(begin.indexOf("accessRevoked=true")<begin.indexOf("guard store.clear()"));
 const exchange=source.slice(source.indexOf("private func exchange("));
 const generation=exchange.indexOf("guard authGeneration == generation else");
 const save=exchange.indexOf("try store.save(");
 const authorize=exchange.indexOf("accessRevoked=false");
 assert.ok(generation>=0 && save>generation && authorize>save,
   "Only a current successful Keychain save can re-enable board access");
});
