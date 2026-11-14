import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  checkInternalPilotUnenrolled, createInternalPilotMfaCookie,
  verifyInternalPilotMfaCookie, beginInternalPilotTotp,
  confirmInternalPilotTotp,
} from "../src/core/intelligence-internal-pilot-mfa.mjs";
import {
  intelligenceCustomerOidc, verifyIntelligenceCustomerIdToken,
} from "../src/core/intelligence-customer-oidc.mjs";

const email = "second-internal-test@example.org";
const subject = "41fb4ecc-e9c6-4f7e-a376-17b0eddb4a8a";
const accessToken = "A".repeat(160);
const signingKey = "local-only-test-secret-that-is-never-deployed-987654321";
const now = 1_800_000_000_000;
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength:2048 });
const jwk = { ...publicKey.export({format:"jwk"}), kid:"pilot-test-key", alg:"RS256", use:"sig" };
const nonce = "abcdefghijklmnopqrstuvwxyz0123456789abcdefgh";
const claims = {
  iss:intelligenceCustomerOidc.issuer,
  aud:intelligenceCustomerOidc.clientId, token_use:"id",
  nonce, sub:subject, email, email_verified:true,
  iat:Math.floor(now/1000)-20, auth_time:Math.floor(now/1000)-40,
  exp:Math.floor(now/1000)+300,
  acr:"urn:cognito:loa:1", amr:["pwd"],
};
function jwt(payload) {
  const a = Buffer.from(JSON.stringify({ alg:"RS256",kid:jwk.kid })).toString("base64url");
  const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const c = sign("RSA-SHA256",Buffer.from(a+"."+b),privateKey).toString("base64url");
  return a+"."+b+"."+c;
}
const jwks = async () => ({ ok:true, text:async()=>JSON.stringify({keys:[jwk]}) });
const data = (mfa = [], verified = true, identity = subject, addr = email) => ({
  Username:identity,
  UserAttributes:[
    {Name:"sub",Value:identity},
    {Name:"email",Value:addr},
    {Name:"email_verified",Value:verified?"true":"false"},
  ],
  UserMFASettingList:mfa,
  PreferredMfaSetting:mfa.length?"SOFTWARE_TOKEN_MFA":undefined,
});
function mock(actions, user = data()) {
  return async (url,options) => {
    assert.equal(url,"https://cognito-idp.eu-north-1.amazonaws.com/");
    assert.equal(options.method,"POST");
    assert.equal(options.redirect,"error");
    assert.equal(options.headers["Content-Type"],"application/x-amz-json-1.1");
    const op=options.headers["X-Amz-Target"].replace("AWSCognitoIdentityProviderService.","");
    actions.push(op);
    const payload=JSON.parse(options.body);
    assert.equal(payload.AccessToken, accessToken);
    const results={
      GetUser:user,
      AssociateSoftwareToken:{SecretCode:"ABCD2345EFGH2345IJKL2345"},
      VerifySoftwareToken:{Status:"SUCCESS"},
      SetUserMFAPreference:{},
    };
    return new Response(JSON.stringify(results[op]),{
      status:200,headers:{"content-type":"application/json"},
    });
  };
}

test("a signed, exact, email-verified Cognito pilot only gets a setup identity", async () => {
  const result=await verifyIntelligenceCustomerIdToken({
    idToken:jwt(claims),expectedNonce:nonce,fetchImpl:jwks,
    nowSeconds:Math.floor(now/1000),
    purpose:"internal_pilot_mfa_enrolment",pilotMfaEmail:email,
  });
  assert.equal(result.pilotMfaEnrolmentOnly,true);
  assert.equal(result.verifiedCognitoSubject,subject);
  assert.equal(result.identityVerified,false);
  assert.equal(result.grantsTenantAccess,false);
  assert.equal(result.grantsFounderAccess,false);
  assert.equal(result.mfaVerified,false);
});

test("a verified but unenrolled pilot must be offered TOTP before identity-only acknowledgement", async () => {
  // Reproduce a Cognito account whose JWT has sufficient ACR/AMR identity
  // claims but GetUser has not registered any authenticator.
  const claimsWithStrongAcr = {
    ...claims, acr: "urn:cognito:loa:4", amr: ["pwd", "otp", "mfa"],
  };
  const verified = await verifyIntelligenceCustomerIdToken({
    idToken: jwt(claimsWithStrongAcr), expectedNonce: nonce, fetchImpl: jwks,
    nowSeconds: Math.floor(now / 1000),
    purpose: "internal_pilot_mfa_enrolment", pilotMfaEmail: email,
  });
  assert.equal(verified.pilotMfaEnrolmentOnly, true);
  assert.equal(verified.grantsTenantAccess, false);
  const calls = [];
  assert.equal((await checkInternalPilotUnenrolled({
    accessToken, subject: verified.verifiedCognitoSubject, expectedEmail: email,
    fetchImpl: mock(calls, data([])),
  })).eligible, true);
  assert.deepEqual(calls, ["GetUser"]);

  const callback = readFileSync(
    new URL("../apps/portal/app/auth/callback/route.ts", import.meta.url),
    "utf8",
  );
  const exchange = callback.indexOf("const { idToken, accessToken } = await exchangeCustomerAuthTokens");
  const precheck = callback.indexOf('phase = "internal_pilot_mfa_preidentity_check"');
  const general = callback.indexOf('phase = "id_token_verification"', precheck);
  const branch = callback.slice(precheck, general);
  assert.ok(exchange >= 0 && exchange < precheck && precheck < general,
    "Pilot unenrolled check must be performed before general signed identity acceptance.");
  assert.match(branch, /checkInternalPilotUnenrolled/u);
  assert.match(branch, /purpose: "internal_pilot_mfa_enrolment"/u);
  assert.match(branch, /pilotMfaEmail: allowedEmail/u);
  assert.match(branch, /name: "__Host-npi_internal_mfa"/u);
  assert.match(branch, /name: "__Host-npi_oidc_tx"/u);
  assert.match(branch, /maxAge: 0/u);
  assert.match(branch, /return response;/u);
  assert.ok(!branch.includes("activateApprovedCustomerSession"));
  assert.ok(!branch.includes("requestFounderPrivateSession"));
});

test("wrong allowlist, unverified email, stale auth or contradictory MFA claims fail closed", async () => {
  for(const [modified,allowed] of [
    [claims,null],
    [claims,"wrong@example.org"],
    [{...claims,email_verified:false},email],
    [{...claims,auth_time:Math.floor(now/1000)-400},email],
    [{...claims,acr:"urn:untrusted:loa:4"},email],
    [{...claims,amr:["bearer"]},email],
    [{...claims,nonce:"a".repeat(43)},email],
  ]) {
    await assert.rejects(verifyIntelligenceCustomerIdToken({
      idToken:jwt(modified),expectedNonce:nonce,fetchImpl:jwks,
      nowSeconds:Math.floor(now/1000),
      purpose:"internal_pilot_mfa_enrolment",pilotMfaEmail:allowed,
    }));
  }
});

test("encrypted short-lived pilot cookie is not founder-compatible and rejects tampering", () => {
  const sealed=createInternalPilotMfaCookie({
    accessToken,subject,expectedEmail:email,signingKey,nowMs:now,
  });
  assert.equal(sealed.customerAccessGranted,false);
  assert.equal(sealed.founderAccessGranted,false);
  assert.ok(!sealed.cookieValue.includes(accessToken));
  assert.ok(!sealed.cookieValue.includes(email));
  const opened=verifyInternalPilotMfaCookie({
    cookieValue:sealed.cookieValue,signingKey,expectedEmail:email,nowMs:now+1000,
  });
  assert.equal(opened.subject,subject);
  assert.equal(opened.expectedEmail,email);
  assert.equal(opened.csrf.length,43);
  const parts = sealed.cookieValue.split(".");
  parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
  for(const params of [
    {expectedEmail:"wrong@example.org"},
    {signingKey:"invalid-secret-padding-that-must-not-work-123"},
    {nowMs:now+601000},
    {cookieValue:parts.join(".")},
  ]) assert.throws(()=>verifyInternalPilotMfaCookie({
    cookieValue:sealed.cookieValue,signingKey,expectedEmail:email,nowMs:now,...params,
  }));
});

test("only the same verified, unenrolled Cognito subject may initiate TOTP",async()=>{
  const actions=[];
  const ok=await checkInternalPilotUnenrolled({
    accessToken,subject,expectedEmail:email,fetchImpl:mock(actions),
  });
  assert.equal(ok.eligible,true);
  assert.deepEqual(actions,["GetUser"]);
  const secret=await beginInternalPilotTotp({
    accessToken,subject,expectedEmail:email,fetchImpl:mock(actions),
  });
  assert.equal(secret,"ABCD2345EFGH2345IJKL2345");
  assert.deepEqual(actions,["GetUser","GetUser","AssociateSoftwareToken"]);
  for(const user of [
    data([],false),data(["SOFTWARE_TOKEN_MFA"]),data([],true,"wrong-identity"),
    data([],true,subject,"attacker@example.org"),
  ]) {
    const calls=[];
    await assert.rejects(beginInternalPilotTotp({
      accessToken,subject,expectedEmail:email,fetchImpl:mock(calls,user),
    }));
    assert.deepEqual(calls,["GetUser"]);
  }
});

test("TOTP must be verified by Cognito and does not issue a login or access",async()=>{
  const actions=[];
  const result=await confirmInternalPilotTotp({
    accessToken,subject,expectedEmail:email,userCode:"123456",
    fetchImpl:mock(actions),
  });
  assert.deepEqual(actions,["GetUser","VerifySoftwareToken","SetUserMFAPreference"]);
  assert.equal(result.enrolled,true);
  assert.equal(result.requiresFreshSignIn,true);
  assert.equal(result.identityAccepted,false);
  assert.equal(result.customerAccessGranted,false);
  assert.equal(result.founderAccessGranted,false);
  await assert.rejects(confirmInternalPilotTotp({
    accessToken,subject,expectedEmail:email,userCode:"12345",
    fetchImpl:mock([]),
  }));
});

test("callback requires an explicit server-side opt-in, independent pilot route and no entitlements",()=>{
  const callback=readFileSync(new URL("../apps/portal/app/auth/callback/route.ts",import.meta.url),"utf8");
  const pilotStart=callback.indexOf('NPI_INTERNAL_PILOT_MFA_ENABLED');
  const providerFallback=callback.indexOf('phase = "provider_managed_mfa_identity"');
  assert.ok(pilotStart > 0 && pilotStart < providerFallback);
  assert.match(callback,/purpose: "internal_pilot_mfa_enrolment"/u);
  assert.match(callback,/checkInternalPilotUnenrolled/u);
  assert.match(callback,/__Host-npi_internal_mfa/u);
  assert.match(callback,/\/auth\/internal\/mfa\/setup/u);
  assert.match(callback,/if \(!pilotMfaOffered\)/u);
  const route=readFileSync(new URL("../apps/portal/app/auth/internal/mfa/setup/route.ts",import.meta.url),"utf8");
  assert.match(route,/NPI_INTERNAL_PILOT_MFA_ENABLED/u);
  assert.match(route,/verifyInternalPilotMfaCookie/u);
  assert.match(route,/confirmInternalPilotTotp/u);
  assert.ok(!route.includes("__Host-npi_session"));
  assert.ok(!route.includes("__Host-npi_founder"));
  const proxy = readFileSync(new URL("../apps/portal/proxy.ts", import.meta.url),"utf8");
  assert.match(proxy, /"\/auth\/internal\/mfa\/setup\/"/u,
    "The legacy portal proxy must permit the cookie-protected MFA route to execute.");
  assert.ok(!proxy.includes('"/auth/internal/"'),
    "Never bypass all internal authentication routes.");
  assert.match(route, /verifyInternalPilotMfaCookie/u,
    "The downstream page must still authenticate the user-bound encrypted MFA cookie.");
});


test("public Intelligence sign-in uses hosted Cognito for enrollment and cannot label identity-only tokens as verified MFA", () => {
  const card = readFileSync(new URL("../apps/portal/components/intelligence-sign-in.tsx", import.meta.url), "utf8");
  const flow = readFileSync(new URL("../apps/portal/lib/cognito-card-auth.ts", import.meta.url), "utf8");
  assert.match(flow, /return nextStep\(reply, username, false\);/u,
    "Password-only Cognito response must never count as authenticator verification.");
  assert.match(flow, /if \(!verifiedMfa \|\|/u);
  assert.match(card, /setPhase\("identity-only"\);/u,
    "Unapproved direct sign-ins must show an identity-only state.");
  assert.match(card, /phase === "identity-only"/u);
  assert.match(card, /if \(result\.kind === "provider-required"\)[\s\S]*?window\.location\.assign\("\/auth\/customer\/start"\)/u,
    "Cognito MFA_SETUP or other provider-required steps must hand off to hosted enrollment.");
  assert.match(card, /href="\/auth\/customer\/start"/u,
    "Identity-only users must have a secure, first-time MFA enrollment path.");
  assert.match(card, /does not confirm that an authenticator is enrolled/u);
  assert.doesNotMatch(card, /Your credentials and authenticator have been accepted/u,
    "Client-only proof must not claim server-confirmed authenticator acceptance.");
});
