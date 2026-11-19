export const FOUNDER_SESSION_ORIGIN: "https://intelligence.novapharmhealthcare.com";
export function deriveFounderBridgeKey(signingKey: string): string;
export function founderSessionBridgeHeaders(options: {
  idToken: string; accessToken: string; signingKey?: string; bridgeKey?: string;
  nowSeconds?: number; nonce?: string;
}): Readonly<Record<"X-Npi-Founder-Time" | "X-Npi-Founder-Nonce" | "X-Npi-Founder-Proof", string>>;
export function requestFounderPrivateSession(options: {
  idToken: string; accessToken: string; signingKey?: string; bridgeKey?: string;
  enabled?: boolean; fetchImpl?: typeof fetch; nowSeconds?: number;
}): Promise<Readonly<{ token: string; maxAge: number; scope: "founder-shell-read-only" }> | null>;
