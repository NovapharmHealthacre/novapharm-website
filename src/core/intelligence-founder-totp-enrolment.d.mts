/** Server-only Cognito founder TOTP enrolment. Never an application session. */
export const founderMfaSetupPolicy: Readonly<{
  permittedScope: string;
  requiresVerifiedCognitoFounderSession: true;
  requiresPriorMfaUnenrolled: true;
  customerAccessGranted: false;
  mustReauthenticateAfterSetup: true;
}>;
export function cognitoUserAction(
  action: "GetUser" | "AssociateSoftwareToken" | "VerifySoftwareToken" | "SetUserMFAPreference",
  params: {AccessToken: string; UserCode?: string; FriendlyDeviceName?: string; SoftwareTokenMfaSettings?: {Enabled: boolean; PreferredMfa: boolean}},
  fetchImpl?: typeof fetch
): Promise<Record<string, unknown>>;
export function checkFounderUnenrolled(options: {accessToken: string; subject: string; fetchImpl?: typeof fetch}): Promise<true>;
export function createFounderMfaCookie(options: {accessToken: string; subject: string; signingKey: string; nowMs?: number}): Readonly<{cookieValue: string; maxAgeSeconds: number}>;
export function verifyFounderMfaCookie(options: {cookieValue: string; signingKey: string; nowMs?: number}): Readonly<{accessToken: string; subject: string; csrf: string}>;
export function beginFounderTotp(options: {accessToken: string; subject: string; fetchImpl?: typeof fetch}): Promise<string>;
export function confirmFounderTotp(options: {accessToken: string; userCode: string; fetchImpl?: typeof fetch}): Promise<Readonly<{enrolled: true; grantsTenantAccess: false; verifiedIdentity: false}>>;
