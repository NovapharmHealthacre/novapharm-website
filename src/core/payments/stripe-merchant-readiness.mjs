/**
 * Stripe merchant readiness check. Returns non-sensitive booleans only.
 * A valid live publishable key is NOT evidence of enabled live charges.
 * Does not inspect or expose legal-person details, bank coordinates or keys.
 */
const ACCOUNT_ENDPOINT = "https://api.stripe.com/v1/account";

function fail() {
  return Object.assign(new Error("Unable to verify Stripe merchant payment capability."), { code: "stripe_readiness_unknown" });
}

export async function checkStripeMerchantReadiness({ mode, secretKey, fetchImpl = globalThis.fetch } = {}) {
  if (!["test", "live"].includes(mode)) throw fail();
  if (typeof secretKey !== "string" || !secretKey.startsWith(mode === "live" ? "sk_live_" : "sk_test_") ||
      secretKey.length < 16 || typeof fetchImpl !== "function") throw fail();

  let response;
  try {
    response = await fetchImpl(ACCOUNT_ENDPOINT, {
      method: "GET",
      headers: { Authorization: "Bearer " + secretKey },
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw fail();
  }
  if (!response?.ok) throw fail();
  let account;
  try { account = await response.json(); } catch { throw fail(); }
  if (account?.object !== "account" || typeof account.livemode !== "boolean" ||
      account.livemode !== (mode === "live")) throw fail();

  const required = account.requirements;
  const due = Array.isArray(required?.currently_due) ? required.currently_due.length : null;
  const pastDue = Array.isArray(required?.past_due) ? required.past_due.length : null;
  const pending = Array.isArray(required?.pending_verification) ? required.pending_verification.length : null;
  const cardCapability = account.capabilities?.card_payments;
  const cardCapabilityApproved = cardCapability === "active";

  const summary = Object.freeze({
    mode,
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    detailsSubmitted: account.details_submitted === true,
    cardCapabilityApproved,
    missingRequirementsCount: due,
    pastDueRequirementsCount: pastDue,
    pendingVerificationsCount: pending,
    restrictionsReported: Boolean(required?.disabled_reason),
    // Even this status is only a preflight: product-category eligibility,
    // UK VAT, stock and checkout deployment need independent approvals.
    technicalMerchantReady: account.charges_enabled === true &&
      account.payouts_enabled === true && account.details_submitted === true &&
      cardCapabilityApproved && due === 0 && pastDue === 0 &&
      pending === 0 && !required?.disabled_reason
  });
  return summary;
}
