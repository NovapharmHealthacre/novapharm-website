export interface CognitoStagingSettings {
  readonly domain: string;
  readonly callback: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly transactionKey: string;
  readonly issuer: string;
}
export interface StagingTransaction {
  readonly cookieValue: string;
  readonly url: string;
  readonly state: string;
  readonly nonce: string;
  readonly verifier: string;
}
export function stagingCognitoSettings(environment?: NodeJS.ProcessEnv): CognitoStagingSettings;
export function createStagingTransaction(settings: CognitoStagingSettings, now?: number): StagingTransaction;
export function readStagingTransaction(cookieValue: string | undefined, state: string | null, settings: CognitoStagingSettings, now?: number): Readonly<{ nonce: string; verifier: string }> | null;
export function exchangeStagingCode(settings: CognitoStagingSettings, code: string | null, verifier: string, fetcher?: typeof fetch): Promise<string>;
export function verifyStagingIdentity(settings: CognitoStagingSettings, idToken: string, nonce: string, fetcher?: typeof fetch, nowSeconds?: number): Promise<Readonly<{ verified: true; issuer: string; provider: string }>>;
