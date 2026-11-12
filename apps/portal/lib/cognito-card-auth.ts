/**
 * Public Cognito password + authenticator flow for the owner-approved sign-in
 * card. Credentials go over TLS straight to the pinned Cognito user-pool API.
 * Never store passwords, MFA codes, Cognito sessions or JWTs in web storage.
 *
 * Identity authentication is NOT a Medicines Terminal entitlement. The separate
 * server-owned customer-session endpoint must approve every real workspace.
 */
const endpoint = "https://cognito-idp.eu-north-1.amazonaws.com/";
const clientId = "7c76122stt76k4d8cjvd7tf6ck";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export type TotpChallenge = Readonly<{ email: string; session: string }>;
export type CardAuthResult =
  | Readonly<{ kind: "mfa"; challenge: TotpChallenge }>
  | Readonly<{ kind: "verified"; idToken: string; accessToken: string }>
  | Readonly<{ kind: "provider-required" }>;

type CognitoPayload = {
  AuthenticationResult?: { IdToken?: unknown; AccessToken?: unknown };
  ChallengeName?: unknown;
  Session?: unknown;
};

function invalid(): Error {
  return new Error("Sign-in could not be completed. Check your details or use secure sign-in.");
}

async function requestCognito(
  operation: "InitiateAuth" | "RespondToAuthChallenge",
  params: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<CognitoPayload> {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    redirect: "error",
    credentials: "omit",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${operation}`,
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw invalid();
  const raw = await response.text();
  if (raw.length > 22000) throw invalid();
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw invalid();
  return parsed as CognitoPayload;
}

function nextStep(
  reply: CognitoPayload,
  email: string,
  verifiedMfa: boolean,
): CardAuthResult {
  if (reply.AuthenticationResult) {
    const idToken = reply.AuthenticationResult.IdToken;
    const accessToken = reply.AuthenticationResult.AccessToken;
    // The pool is configured to require MFA. Deny unexpected token issuance
    // after the password alone; no client token can grant application access.
    if (!verifiedMfa || typeof idToken !== "string" ||
        !/^[A-Za-z0-9._-]{100,16000}$/u.test(idToken) ||
        typeof accessToken !== "string" ||
        !/^[A-Za-z0-9._-]{100,16000}$/u.test(accessToken)) return { kind: "provider-required" };
    return { kind: "verified", idToken, accessToken };
  }
  if (reply.ChallengeName === "SOFTWARE_TOKEN_MFA" &&
      typeof reply.Session === "string" &&
      reply.Session.length >= 20 && reply.Session.length <= 4096) {
    return { kind: "mfa", challenge: { email, session: reply.Session } };
  }
  // MFA enrollment, password rotation or any unhandled challenge stays
  // with Cognito's existing managed login. Never downgrade MFA here.
  return { kind: "provider-required" };
}

/** Username/password go to Cognito only. Neither value is persisted. */
export async function beginCognitoCardSignIn(
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CardAuthResult> {
  const username = email.trim().toLowerCase();
  if (username.length > 254 || !emailPattern.test(username) ||
      password.length < 1 || password.length > 1024) throw invalid();

  let reply = await requestCognito("InitiateAuth", {
    AuthFlow: "USER_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PREFERRED_CHALLENGE: "PASSWORD",
      PASSWORD: password,
    },
  }, fetchImpl);

  // Some Cognito clients return the password selection as an explicit
  // challenge. Respond exactly once rather than bypassing the first factor.
  if ((reply.ChallengeName === "PASSWORD" || reply.ChallengeName === "SELECT_CHALLENGE") &&
      typeof reply.Session === "string" && reply.Session.length >= 20 && reply.Session.length <= 4096) {
    const selection = reply.ChallengeName;
    reply = await requestCognito("RespondToAuthChallenge", {
      ClientId: clientId,
      ChallengeName: selection,
      Session: reply.Session,
      ChallengeResponses: selection === "PASSWORD"
        ? { USERNAME: username, PASSWORD: password }
        : { USERNAME: username, ANSWER: "PASSWORD", PASSWORD: password },
    }, fetchImpl);
  }
  return nextStep(reply, username, false);
}

/** No authentication result is accepted until Cognito has verified TOTP. */
export async function completeCognitoCardSignIn(
  challenge: TotpChallenge,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CardAuthResult> {
  if (!emailPattern.test(challenge.email) ||
      challenge.session.length < 20 || challenge.session.length > 4096 ||
      !/^\d{6}$/u.test(code)) throw invalid();
  const reply = await requestCognito("RespondToAuthChallenge", {
    ClientId: clientId,
    ChallengeName: "SOFTWARE_TOKEN_MFA",
    Session: challenge.session,
    ChallengeResponses: {
      USERNAME: challenge.email,
      SOFTWARE_TOKEN_MFA_CODE: code,
    },
  }, fetchImpl);
  return nextStep(reply, challenge.email, true);
}
