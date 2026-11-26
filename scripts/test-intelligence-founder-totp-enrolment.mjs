import assert from "node:assert/strict";
import test from "node:test";
import {
  cognitoUserAction, checkFounderEnrolled, checkFounderUnenrolled,
  createFounderMfaCookie, verifyFounderMfaCookie,
  beginFounderTotp, confirmFounderTotp,
  founderMfaSetupPolicy,
} from "../src/core/intelligence-founder-totp-enrolment.mjs";

const signingKey = "a_test_only_64_character_private_server_key_not_a_production_secret_123";
const subject = "12345678-1234-4123-8123-123456789abc";
const accessToken = "a".repeat(220);
const time = 1_800_000_000_000;
const attrs = [
  { Name: "sub", Value: subject },
  { Name: "email", Value: "vishal@novapharmhealthcare.com" },
  { Name: "email_verified", Value: "true" },
];
function fakeCognito({ enrolled = false, mismatch = false, status = "SUCCESS" } = {}) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, config) => {
      assert.equal(url, "https://cognito-idp.eu-north-1.amazonaws.com/");
      assert.equal(config.method, "POST");
      assert.equal(config.redirect, "error");
      assert.equal(config.headers["Content-Type"], "application/x-amz-json-1.1");
      const action = config.headers["X-Amz-Target"].split(".").at(-1);
      const data = JSON.parse(config.body);
      assert.equal(data.AccessToken, accessToken);
      calls.push({ action, params: Object.keys(data) });
      if (action === "GetUser") {
        return { ok: true, text: async () => JSON.stringify({
          UserAttributes: mismatch
            ? [{ Name: "sub", Value: "other-12345" }, ...attrs.slice(1)]
            : attrs,
          UserMFASettingList: enrolled ? ["SOFTWARE_TOKEN_MFA"] : [],
          PreferredMfaSetting: enrolled ? "SOFTWARE_TOKEN_MFA" : undefined,
        }) };
      }
      if (action === "AssociateSoftwareToken") return {
        ok: true, text: async () => JSON.stringify({ SecretCode: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" }),
      };
      if (action === "VerifySoftwareToken") {
        assert.equal(data.UserCode, "123456");
        return { ok: true, text: async () => JSON.stringify({ Status: status }) };
      }
      if (action === "SetUserMFAPreference") {
        assert.deepEqual(data.SoftwareTokenMfaSettings, { Enabled: true, PreferredMfa: true });
        return { ok: true, text: async () => "{}" };
      }
      throw Error("Unexpected action");
    },
  };
}
test("AES-GCM bootstrap is founder-only, opaque, short-lived and unforgeable", () => {
  const setup = createFounderMfaCookie({ accessToken, subject, signingKey, nowMs: time });
  assert.equal(setup.maxAgeSeconds, 600);
  assert.ok(setup.cookieValue.length < 3800);
  assert.ok(!setup.cookieValue.includes(accessToken));
  const read = verifyFounderMfaCookie({
    cookieValue: setup.cookieValue, signingKey, nowMs: time + 599_999,
  });
  assert.equal(read.subject, subject);
  assert.equal(read.accessToken, accessToken);
  assert.match(read.csrf, /^[A-Za-z0-9_-]{43}$/);
  assert.throws(() => verifyFounderMfaCookie({
    cookieValue: setup.cookieValue, signingKey, nowMs: time + 600_001,
  }));
  assert.throws(() => verifyFounderMfaCookie({
    cookieValue: setup.cookieValue, signingKey: signingKey+"wrong", nowMs: time,
  }));
  const tampered = setup.cookieValue.slice(0,-2) + "ab";
  assert.throws(() => verifyFounderMfaCookie({
    cookieValue: tampered, signingKey, nowMs: time,
  }));
  assert.throws(() => createFounderMfaCookie({
    accessToken, subject:"x", signingKey, nowMs:time,
  }));
  assert.equal(founderMfaSetupPolicy.customerAccessGranted,false);
  assert.equal(founderMfaSetupPolicy.mustReauthenticateAfterSetup,true);
});
test("Cognito GetUser requires same founder sub, verified email and no enrolled MFA", async () => {
  const provider = fakeCognito();
  assert.equal(await checkFounderUnenrolled({
    accessToken, subject, fetchImpl:provider.fetchImpl,
  }),true);
  for (const options of [{enrolled:true},{mismatch:true}]) {
    const source = fakeCognito(options);
    await assert.rejects(beginFounderTotp({
      accessToken, subject, fetchImpl:source.fetchImpl,
    }),e=>e.code==="mfa_enrolment_not_eligible");
    assert.equal(source.calls.filter(x=>x.action==="AssociateSoftwareToken").length,0);
  }
  const notAllowed=async()=>({ok:false,text:async()=>"denied"});
  await assert.rejects(checkFounderUnenrolled({
    accessToken,subject,fetchImpl:notAllowed,
  }),e=>e.code==="cognito_mfa_request_rejected");
});
test("already-enrolled founder is recognised without treating registration as session MFA",async()=>{
  const source=fakeCognito({enrolled:true});
  const result=await checkFounderEnrolled({
    accessToken,subject,fetchImpl:source.fetchImpl,
  });
  assert.deepEqual(result,{
    authenticatorRegistered:true,mfaVerifiedThisLogin:false,
    identityAccepted:false,grantsTenantAccess:false,
  });
  assert.deepEqual(source.calls.map(x=>x.action),["GetUser"]);
  for(const options of [{enrolled:false},{enrolled:true,mismatch:true}]) {
    const bad=fakeCognito(options);
    await assert.rejects(checkFounderEnrolled({
      accessToken,subject,fetchImpl:bad.fetchImpl,
    }),e=>e.code==="mfa_existing_factor_not_attested");
  }
});

test("Cognito TOTP secret is generated only after verified user and OTP is actually checked",async()=>{
  const provider=fakeCognito();
  const secret=await beginFounderTotp({
    accessToken,subject,fetchImpl:provider.fetchImpl,
  });
  assert.equal(secret,"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
  assert.deepEqual(provider.calls.map(x=>x.action),["GetUser","AssociateSoftwareToken"]);
  await assert.rejects(confirmFounderTotp({
    accessToken,userCode:"123",fetchImpl:provider.fetchImpl,
  }),e=>e.code==="invalid_totp_code");
  assert.equal(provider.calls.filter(x=>x.action==="VerifySoftwareToken").length,0);
  const result=await confirmFounderTotp({
    accessToken,userCode:"123456",fetchImpl:provider.fetchImpl,
  });
  assert.deepEqual(result,{enrolled:true,grantsTenantAccess:false,verifiedIdentity:false});
  assert.deepEqual(provider.calls.map(x=>x.action).slice(-2),[
    "VerifySoftwareToken","SetUserMFAPreference"
  ]);
  const bad=fakeCognito({status:"ERROR"});
  await assert.rejects(confirmFounderTotp({
    accessToken,userCode:"123456",fetchImpl:bad.fetchImpl,
  }),e=>e.code==="totp_not_verified");
  assert.equal(bad.calls.filter(x=>x.action==="SetUserMFAPreference").length,0);
});
test("unknown Cognito actions, malformed tokens and unauthenticated calls fail closed",async()=>{
  for(const action of ["AdminSetUserMFAPreference","DeleteUser","InitiateAuth"]){
    await assert.rejects(cognitoUserAction(action,{AccessToken:accessToken}),e=>e.code==="mfa_action_invalid");
  }
  await assert.rejects(cognitoUserAction("GetUser",{AccessToken:"fake"}),
    e=>e.code==="mfa_action_invalid");
});
