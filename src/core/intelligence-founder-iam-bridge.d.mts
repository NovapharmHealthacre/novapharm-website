export function signFounderLambdaInvoke(options: {
  body: string;
  credentials: { accessKey: string; secretKey: string; sessionToken: string };
  now?: Date;
}): Readonly<{ url: string; headers: Record<string, string> }>;
export function requestFounderPrivateIamSession(options: {
  signedFounderIdentity: {
    founderProviderIdentityOnly: true;
    identityVerified: false;
    grantsTenantAccess: false;
    mfaVerifiedInSignedClaims: false;
    verifiedIssuer: string;
    verifiedCognitoSubject: string;
    signedAuthTimeSeconds: number;
    signedIssuedAtSeconds: number;
  };
  accessToken: string;
  transactionCreatedAtMs: number;
  enabled?: boolean;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}): Promise<Readonly<{ token: string; maxAge: number; scope: "founder-shell-read-only" }> | null>;
