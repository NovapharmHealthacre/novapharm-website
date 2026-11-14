/**
 * Presentation-only parser for a verified same-origin /customer/session response.
 * This does not grant a trial, create an account, authorize source data, request
 * Stripe checkout or validate an application session. The server must enforce
 * all trial authority independently.
 */
export type VerifiedTrialView = Readonly<{
  status: "trialing";
  trialEndsAt: string;
  remainingSearches: number;
  searchLimit: 25;
}>;

function canonicalUtc(raw: unknown): raw is string {
  if (typeof raw !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(raw)) return false;
  const epoch = Date.parse(raw);
  return Number.isSafeInteger(epoch) && new Date(epoch).toISOString() === raw;
}

/**
 * Only call after the response passed exact server session status, plan and
 * role checks. Invalid or expired metadata does not render a trial badge.
 */
export function parseVerifiedTrialView(raw: unknown, now = new Date().toISOString()): VerifiedTrialView | null {
  if (!raw || typeof raw !== "object" || !canonicalUtc(now)) return null;
  const item = raw as Record<string, unknown>;
  if (item["status"] !== "trialing" ||
      item["searchLimit"] !== 25 ||
      !Number.isSafeInteger(item["remainingSearches"]) ||
      typeof item["remainingSearches"] !== "number" ||
      item["remainingSearches"] < 0 ||
      item["remainingSearches"] > 25 ||
      !canonicalUtc(item["trialEndsAt"]) ||
      Date.parse(item["trialEndsAt"]) <= Date.parse(now)) return null;
  return {
    status: "trialing",
    trialEndsAt: item["trialEndsAt"],
    remainingSearches: item["remainingSearches"],
    searchLimit: 25,
  };
}
