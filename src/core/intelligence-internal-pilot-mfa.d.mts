/** Narrow Cognito account self-service, never a founder or customer session. */
export function checkInternalPilotUnenrolled(options: {
  accessToken: string;
  subject: string;
  expectedEmail: string;
  fetchImpl?: typeof fetch;
}): Promise<Readonly<{ eligible: true; customerAccessGranted: false; founderAccessGranted: false }>>;
export function createInternalPilotMfaCookie(options: {
  accessToken: string;
  subject: string;
  expectedEmail: string;
  signingKey: string;
  nowMs?: number;
}): Readonly<{ cookieValue: string; maxAgeSeconds: number; customerAccessGranted: false; founderAccessGranted: false }>;
export function verifyInternalPilotMfaCookie(options: {
  cookieValue: string;
  expectedEmail: string;
  signingKey: string;
  nowMs?: number;
}): Readonly<{ accessToken: string; subject: string; expectedEmail: string; csrf: string }>;
export function beginInternalPilotTotp(options: {
  accessToken: string;
  subject: string;
  expectedEmail: string;
  fetchImpl?: typeof fetch;
}): Promise<string>;
export function confirmInternalPilotTotp(options: {
  accessToken: string;
  subject: string;
  expectedEmail: string;
  userCode: string;
  fetchImpl?: typeof fetch;
}): Promise<Readonly<{ enrolled: true; customerAccessGranted: false; founderAccessGranted: false; identityAccepted: false; requiresFreshSignIn: true }>>;
