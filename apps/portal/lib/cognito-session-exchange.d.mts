export interface ApprovedPortalExchange {
  token: string;
  identityNonce: string;
  accessType: "employee" | "board" | "admin";
  environment?: NodeJS.ProcessEnv;
  request?: typeof fetch;
}
export function exchangeApprovedCognitoSession(
  options: ApprovedPortalExchange,
): Promise<Readonly<{ session: string; accessType: "employee" | "board" | "admin" }>>;
