import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign as signJwt } from "node:crypto";
import {
  intelligenceCustomerOidc,
  createCustomerLoginTransaction,
  verifyCustomerLoginTransaction,
  exchangeCustomerAuthCode,
  exchangeCustomerAuthTokens,
  verifyIntelligenceCustomerIdToken,
} from "../src/core/intelligence-customer-oidc.mjs";

const signingKey = "a_private_server_signing_secret_minimum_32_characters_no_browser_data";
const second = 1_800_000_000;
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test_rsa_1", alg: "RS256", use: "sig" };
const token = (claims, changeSignature = false, kid = jwk.kid) => {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid })).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signJwt("RSA-SHA256", Buffer.from(header + "." + body), privateKey).toString("base64url");
  return header + "." + body + "." + (changeSignature ? (signature[0] === "x" ? "y" : "x") + signature.slice(1) : signature);
};
const nonce = "abcdefghijklmnopqrstuvwxyz0123456789abcdefgh";
const validClaims = {
  iss: intelligenceCustomerOidc.issuer,
  aud: intelligenceCustomerOidc.clientId,
  token_use: "id",
  nonce,
  sub: "41fb4ecc-e9c6-4f7e-a376-17b0eddb4a8a",
  email_verified: true,
  iat: second - 30,
  auth_time: second - 60,
  acr: "urn:cognito:loa:4",
  amr: ["pwd", "otp", "mfa"],
  exp: second + 300,
};
const mockJwks = async (url, options) => {
  assert.equal(url, intelligenceCustomerOidc.issuer + "/.well-known/jwks.json");
  assert.equal(options.redirect, "error");
  return { ok: true, text: async () => JSON.stringify({ keys: [jwk] }) };
};

test("dedicated client uses code and PKCE with no access grant", () => {
  const started = createCustomerLoginTransaction({ signingKey, nowMs: second * 1000 });
  const url = new URL(started.authorizeUrl);
  assert.equal(url.origin, intelligenceCustomerOidc.domain);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("client_id"), intelligenceCustomerOidc.clientId);
  assert.equal(url.searchParams.get("redirect_uri"), intelligenceCustomerOidc.callback);
  assert.equal(url.searchParams.get("scope"), "openid email profile aws.cognito.signin.user.admin");
  assert.equal(url.searchParams.get("acr_values"), "urn:cognito:loa:4 urn:cognito:loa:1");
  assert.equal(url.searchParams.get("max_age"), "0");
  assert.equal(url.searchParams.get("prompt"), "login");
  const transaction = verifyCustomerLoginTransaction({
    signingKey, cookieValue: started.transactionCookieValue,
    state: url.searchParams.get("state"), nowMs: second * 1000 + 30_000,
  });
  assert.ok(transaction.verifier);
  assert.ok(transaction.nonce);
  assert.equal(transaction.grantsTenantAccess, false);
  assert.equal(started.grantsTenantAccess, false);
  assert.equal(intelligenceCustomerOidc.permitsPublicSignup, false);
});

test("GBP plan and billing period survive Cognito registration only as a signed, non-entitling selection", () => {
  const nowMs = second * 1000;
  for (const requestedPlan of ["starter", "professional"]) {
    for (const requestedCycle of ["monthly", "annual"]) {
      const txn = createCustomerLoginTransaction({
        signingKey, nowMs, requestedPlan, requestedCycle,
      });
      assert.equal(txn.requestedPlanBoundToSignedCookie, true);
      const url = new URL(txn.authorizeUrl);
      assert.equal(url.searchParams.has("requestedPlan"), false);
      assert.equal(url.searchParams.has("requestedCycle"), false);
      assert.equal(url.searchParams.has("price"), false);
      const verified = verifyCustomerLoginTransaction({
        signingKey, cookieValue: txn.transactionCookieValue,
        state: url.searchParams.get("state"), nowMs: nowMs + 30_000,
      });
      assert.equal(verified.requestedPlan, requestedPlan);
      assert.equal(verified.requestedCycle, requestedCycle);
      assert.equal(verified.grantsTenantAccess, false);
      assert.equal("stripeCustomerId" in verified, false);
      // Altering the signed cookie must never switch a plan or issue access.
      const modifiedCookie = txn.transactionCookieValue.replace(/^[^.]+/u, "a".repeat(64));
      assert.throws(() => verifyCustomerLoginTransaction({
        signingKey, cookieValue: modifiedCookie,
        state: url.searchParams.get("state"), nowMs: nowMs + 30_000,
      }));
    }
  }
  const defaultTxn = createCustomerLoginTransaction({ signingKey, nowMs });
  const verifiedDefault = verifyCustomerLoginTransaction({
    signingKey, cookieValue: defaultTxn.transactionCookieValue,
    state: new URL(defaultTxn.authorizeUrl).searchParams.get("state"), nowMs: nowMs + 30_000,
  });
  assert.equal(verifiedDefault.requestedPlan, null);
  assert.equal(verifiedDefault.requestedCycle, null);
  assert.equal(defaultTxn.requestedPlanBoundToSignedCookie, false);
  for (const selection of [
    { requestedPlan: "enterprise", requestedCycle: "monthly" },
    { requestedPlan: "starter", requestedCycle: "weekly" },
    { requestedPlan: "starter" },
    { requestedCycle: "annual" },
    { requestedPlan: "__proto__", requestedCycle: "annual" },
    { requestedPlan: null, requestedCycle: "monthly" },
  ]) {
    assert.throws(() => createCustomerLoginTransaction({
      signingKey, nowMs, ...selection,
    }), e => e.code === "customer_plan_selection_invalid");
  }
});

test("tampering, forged state, expired transaction and wrong key reject", () => {
  const now = second * 1000;
  const started = createCustomerLoginTransaction({ signingKey, nowMs: now });
  const state = new URL(started.authorizeUrl).searchParams.get("state");
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey, cookieValue: started.transactionCookieValue, state: "a".repeat(43), nowMs: now }));
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey, cookieValue: started.transactionCookieValue + "tampered", state, nowMs: now }));
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey: signingKey+"other", cookieValue: started.transactionCookieValue, state, nowMs: now }));
  assert.throws(() => verifyCustomerLoginTransaction({ signingKey, cookieValue: started.transactionCookieValue, state, nowMs: now + 901000 }));
});

test("first-time password rotation and TOTP enrolment fit within 15-minute signed transaction", () => {
  const startedAtMs = second * 1000;
  const transaction = createCustomerLoginTransaction({ signingKey, nowMs: startedAtMs });
  const state = new URL(transaction.authorizeUrl).searchParams.get("state");
  assert.equal(transaction.cookieMaxAgeSeconds, 900);
  const accepted = verifyCustomerLoginTransaction({
    signingKey, cookieValue: transaction.transactionCookieValue,
    state, nowMs: startedAtMs + 8 * 60_000,
  });
  assert.equal(accepted.grantsTenantAccess, false);
  assert.throws(() => verifyCustomerLoginTransaction({
    signingKey, cookieValue: transaction.transactionCookieValue,
    state, nowMs: startedAtMs + 901_000,
  }), e => e.code === "transaction_expired_or_mismatched");
  const recentMfa = { ...validClaims, auth_time: second - 8 * 60 };
  assert.ok(recentMfa.auth_time < second - 300);
});

test("server code exchange includes public client PKCE, no arbitrary token origin", async () => {
  const id = "a".repeat(100);
  const result = await exchangeCustomerAuthCode({
    code: "auth_code_abcdefghij",
    verifier: "a".repeat(64),
    fetchImpl: async (url, request) => {
      assert.equal(url, intelligenceCustomerOidc.domain + "/oauth2/token");
      assert.equal(request.method, "POST");
      assert.equal(request.headers.Authorization, undefined);
      assert.equal(request.redirect, "error");
      const body = new URLSearchParams(request.body);
      assert.equal(body.get("grant_type"), "authorization_code");
      assert.equal(body.get("client_id"), intelligenceCustomerOidc.clientId);
      assert.equal(body.get("code_verifier"), "a".repeat(64));
      return { ok: true, text: async () => JSON.stringify({ token_type: "Bearer", id_token: id, access_token: "a".repeat(210) }) };
    },
  });
  assert.equal(result, id);
  await assert.rejects(exchangeCustomerAuthCode({ code: "bad", verifier: "a".repeat(64), fetchImpl: async () => ({}) }));
});

test("OAuth exchange keeps the access token server-only for first-time MFA", async () => {
  const token = "a".repeat(220);
  const res = await exchangeCustomerAuthTokens({
    code: "auth_code_abcdefghij", verifier: "b".repeat(64),
    fetchImpl: async () => ({
      ok: true, text: async () => JSON.stringify({
        token_type: "Bearer", id_token: "c".repeat(200), access_token: token,
        refresh_token: "not_to_be_returned",
      })
    }),
  });
  assert.equal(res.accessToken, token);
  assert.equal(res.idToken.length, 200);
  assert.equal("refreshToken" in res, false);
  await assert.rejects(exchangeCustomerAuthTokens({
    code: "auth_code_abcdefghij", verifier: "b".repeat(64),
    fetchImpl: async () => ({
      ok: true, text: async () => JSON.stringify({
        token_type: "Bearer", id_token: "c".repeat(200),
      })
    }),
  }), e => e.code === "identity_response_invalid");
});

test("signed fresh founder Cognito session allows TOTP registration with or without AMR but never customer access", async () => {
  const firstLogin = { ...validClaims,
    email: "vishal@novapharmhealthcare.com",
    acr: "urn:cognito:loa:1",
    amr: ["pwd"],
  };
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(firstLogin), expectedNonce: nonce,
    fetchImpl: mockJwks, nowSeconds: second,
  }), e => e.code === "identity_mfa_level_insufficient");
  const p = await verifyIntelligenceCustomerIdToken({
    idToken: token(firstLogin), expectedNonce: nonce,
    fetchImpl: mockJwks, nowSeconds: second, purpose: "mfa_enrolment",
  });
  assert.equal(p.mfaEnrolmentOnly, true);
  assert.equal(p.verifiedCognitoSubject, validClaims.sub);
  assert.equal(p.identityVerified, false);
  assert.equal(p.mfaVerified, false);
  assert.equal(p.grantsTenantAccess, false);
  // Cognito may classify a PASSWORD sign-in with an additional factor at LOA3.
  // This is safe for first-time MFA enrolment only, NOT a customer login.
  const strongerPassword = { ...firstLogin,
    acr: "urn:cognito:loa:3", amr: ["pwd", "email_otp", "mfa"],
  };
  const strongerResult = await verifyIntelligenceCustomerIdToken({
    idToken: token(strongerPassword), expectedNonce: nonce,
    fetchImpl: mockJwks, nowSeconds: second, purpose: "mfa_enrolment",
  });
  assert.equal(strongerResult.mfaEnrolmentOnly, true);
  assert.equal(strongerResult.identityVerified, false);
  assert.equal(strongerResult.grantsTenantAccess, false);
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(strongerPassword), expectedNonce: nonce,
    fetchImpl: mockJwks, nowSeconds: second,
  }), e => e.code === "identity_mfa_level_insufficient");
  // ACR/AMR rollout is partial. Neither claim is required for the
  // founder's limited self-service *registration*, but verified Cognito
  // identity and fresh authentication are always mandatory.
  const featureNotRolledOut = { ...firstLogin };
  delete featureNotRolledOut.amr;
  delete featureNotRolledOut.acr;
  for (const firstTime of [
    featureNotRolledOut,
    { ...firstLogin, amr: [] },
    { ...firstLogin, acr: "urn:cognito:loa:2", amr: ["email_otp"] },
  ]) {
    const limited = await verifyIntelligenceCustomerIdToken({
      idToken: token(firstTime), expectedNonce: nonce,
      fetchImpl: mockJwks, nowSeconds: second, purpose: "mfa_enrolment",
    });
    assert.equal(limited.mfaEnrolmentOnly, true);
    assert.equal(limited.identityVerified, false);
    assert.equal(limited.mfaVerified, false);
    assert.equal(limited.grantsTenantAccess, false);
    await assert.rejects(verifyIntelligenceCustomerIdToken({
      idToken: token(firstTime), expectedNonce: nonce,
      fetchImpl: mockJwks, nowSeconds: second,
    }), e => e.code === "identity_mfa_level_insufficient");
  }
  for (const claims of [
    { ...firstLogin, email: "other@example.com" },
    { ...firstLogin, amr: ["fed"] },
    { ...firstLogin, amr: "pwd" },
    { ...firstLogin, acr: "urn:untrusted:loa:3" },
    { ...firstLogin, auth_time: second - 301 },
    { ...firstLogin, email_verified: false },
  ]) {
    await assert.rejects(verifyIntelligenceCustomerIdToken({
      idToken: token(claims), expectedNonce: nonce,
      fetchImpl: mockJwks, nowSeconds: second, purpose: "mfa_enrolment",
    }));
  }
  for (const [claims, code] of [
    [{ ...firstLogin, email: "unknown@example.com" }, "mfa_enrolment_founder_email_mismatch"],
    [{ ...firstLogin, amr: ["fed"] }, "mfa_enrolment_method_unrecognised"],
    [{ ...firstLogin, acr: "urn:untrusted:loa:3" }, "mfa_enrolment_acr_incompatible"],
    [{ ...firstLogin, auth_time: second - 301 }, "mfa_enrolment_auth_stale"],
  ]) {
    await assert.rejects(verifyIntelligenceCustomerIdToken({
      idToken: token(claims), expectedNonce: nonce,
      fetchImpl: mockJwks, nowSeconds: second, purpose: "mfa_enrolment",
    }), e => e.code === code);
  }
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(firstLogin, true), expectedNonce: nonce,
    fetchImpl: mockJwks, nowSeconds: second, purpose: "mfa_enrolment",
  }));
});

test("signed fresh founder without Cognito ACR/AMR permits only restricted provider identity proof", async () => {
  const withoutClaims = { ...validClaims,
    email:"vishal@novapharmhealthcare.com",
    auth_time:second - 25, iat:second - 15,
  };
  delete withoutClaims.acr;
  delete withoutClaims.amr;
  const r = await verifyIntelligenceCustomerIdToken({
    idToken:token(withoutClaims), expectedNonce:nonce,
    fetchImpl:mockJwks, nowSeconds:second, purpose:"founder_provider_identity",
  });
  assert.equal(r.founderProviderIdentityOnly,true);
  assert.equal(r.identityVerified,false);
  assert.equal(r.mfaVerifiedInSignedClaims,false);
  assert.equal(r.grantsTenantAccess,false);
  assert.equal(r.signedAuthTimeSeconds,second-25);
  assert.equal(r.signedIssuedAtSeconds,second-15);
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken:token(withoutClaims), expectedNonce:nonce,
    fetchImpl:mockJwks, nowSeconds:second,
  }), e => e.code==="identity_mfa_level_insufficient");
  for (const [name,claims] of [
    ["signed lower acr",{...withoutClaims,acr:"urn:cognito:loa:1"}],
    ["signed password-only amr",{...withoutClaims,amr:["pwd"]}],
    ["wrong founder",{...withoutClaims,email:"other@example.com"}],
    ["stale session",{...withoutClaims,auth_time:second-170}],
    ["future issue",{...withoutClaims,iat:second+65}],
    ["issue before auth",{...withoutClaims,iat:second-50}],
    ["unverified email",{...withoutClaims,email_verified:false}],
  ]) {
    await assert.rejects(verifyIntelligenceCustomerIdToken({
      idToken:token(claims), expectedNonce:nonce,
      fetchImpl:mockJwks, nowSeconds:second,
      purpose:"founder_provider_identity",
    }),name);
  }
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken:token(withoutClaims,true), expectedNonce:nonce,
    fetchImpl:mockJwks, nowSeconds:second,
    purpose:"founder_provider_identity",
  }),e=>e.code==="identity_signature_invalid");
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken:token(withoutClaims), expectedNonce:"y".repeat(44),
    fetchImpl:mockJwks, nowSeconds:second,
    purpose:"founder_provider_identity",
  }));
});

test("signed ID JWT verifies exact issuer, audience, nonce and expiry but never grants access", async () => {
  const result = await verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims), expectedNonce: nonce,
    fetchImpl: mockJwks, nowSeconds: second,
  });
  assert.equal(result.identityVerified, true);
  assert.equal(result.verifiedCognitoSubject, validClaims.sub);
  assert.equal(result.tenantOwnershipVerified, false);
  assert.equal(result.subscriptionVerified, false);
  assert.equal(result.mfaVerified, true);
  assert.equal(result.mfaSessionAttestationRequired, false);
  assert.equal(result.grantsTenantAccess, false);
});

test("Cognito standard-base64 JWKS kids containing + / = still require valid RSA signature", async () => {
  // Real Cognito signing-key identifiers can contain standard base64 symbols.
  // Previous base64url-only regex rejected them BEFORE checking AWS JWKS.
  const signerKid = "Cognito+RS256/KeyId==";
  const publishedKey = { ...jwk, kid: signerKid };
  const exactJwks = async (url) => {
    assert.equal(url, intelligenceCustomerOidc.issuer + "/.well-known/jwks.json");
    return { ok: true, text: async () => JSON.stringify({ keys: [publishedKey] }) };
  };
  const valid = token(validClaims, false, signerKid);
  const verified = await verifyIntelligenceCustomerIdToken({
    idToken: valid, expectedNonce: nonce, fetchImpl: exactJwks, nowSeconds: second,
  });
  assert.equal(verified.identityVerified, true);
  assert.equal(verified.mfaVerified, true);
  assert.equal(verified.grantsTenantAccess, false);
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims, true, signerKid),
    expectedNonce: nonce, fetchImpl: exactJwks, nowSeconds: second,
  }), (error) => error.code === "identity_signature_invalid");
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: valid, expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second,
  }), (error) => error.code === "identity_signing_key_missing");
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims, false, "another/KeyId="),
    expectedNonce: nonce, fetchImpl: exactJwks, nowSeconds: second,
  }), (error) => error.code === "identity_signing_key_missing");
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims, false, "invalid kid with spaces"),
    expectedNonce: nonce, fetchImpl: exactJwks, nowSeconds: second,
  }), (error) => error.code === "identity_signature_invalid");
});

test("first-login fresh password-plus-TOTP proof remains valid after eight minutes", async () => {
  const claims = { ...validClaims, auth_time: second - 480 };
  const result = await verifyIntelligenceCustomerIdToken({
    idToken: token(claims), expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second,
  });
  assert.equal(result.identityVerified, true);
  assert.equal(result.mfaVerified, true);
  assert.equal(result.grantsTenantAccess, false);
});

test("forged JWT, wrong nonce, email, audience or expiry cannot pass", async () => {
  for (const [name,claims] of [
    ["wrong audience", { ...validClaims, aud: "unapproved-client" }],
    ["wrong issuer", { ...validClaims, iss: "https://untrusted.example" }],
    ["wrong nonce", { ...validClaims, nonce: "A".repeat(44) }],
    ["email unverified", { ...validClaims, email_verified: false }],
    ["expired", { ...validClaims, exp: second - 1 }],
    ["wrong type", { ...validClaims, token_use: "access" }],
    ["no acr", { ...validClaims, acr: undefined }],
    ["weak acr", { ...validClaims, acr: "urn:cognito:loa:1" }],
    ["no MFA", { ...validClaims, amr: ["pwd"] }],
    ["missing TOTP", { ...validClaims, amr: ["pwd", "mfa"] }],
    ["stale auth", { ...validClaims, auth_time: second - 901 }],
    ["future auth", { ...validClaims, auth_time: second + 120 }],
    ["missing auth time", { ...validClaims, auth_time: undefined }],
  ]) {
    await assert.rejects(verifyIntelligenceCustomerIdToken({
      idToken: token(claims), expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second,
    }), name);
  }
  const emailFailure = { ...validClaims, email_verified: false };
  await assert.rejects(
    verifyIntelligenceCustomerIdToken({ idToken: token(emailFailure), expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second }),
    e => e.code === "identity_email_unverified"
  );
  const mfaFailure = { ...validClaims, amr: ["pwd"] };
  await assert.rejects(
    verifyIntelligenceCustomerIdToken({ idToken: token(mfaFailure), expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second }),
    e => e.code === "identity_mfa_level_insufficient"
  );
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims, true), expectedNonce: nonce, fetchImpl: mockJwks, nowSeconds: second,
  }));
  await assert.rejects(verifyIntelligenceCustomerIdToken({
    idToken: token(validClaims), expectedNonce: nonce,
    fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ keys: [] }) }),
    nowSeconds: second,
  }));
});
