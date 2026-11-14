/**
 * One-way handoff from a verified Cognito identity to NovaPharm's private
 * server-authorised Stripe Checkout Session. No browser Price IDs, Stripe
 * credentials, payment status or entitlements are accepted here.
 *
 * The private AWS service remains OFF until independent production acceptance;
 * an unavailable service always returns null without taking a payment.
 */
export async function requestIntelligenceSubscriptionCheckout({
  idToken, plan, cycle, fetchImpl = fetch,
}: {
  idToken: string;
  plan: string | null | undefined;
  cycle: string | null | undefined;
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  if (!((plan === "starter" || plan === "professional") && (cycle === "monthly" || cycle === "annual"))) return null;
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 16384) return null;
  try {
    const response = await fetchImpl("https://intelligence.novapharmhealthcare.com/customer/subscription/checkout", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + idToken,
        "Origin": "https://intelligence.novapharmhealthcare.com",
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ plan, cycle }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(7000),
    });
    if (response.status !== 200 || !response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!/^application\/json(?:;|$)/i.test(contentType)) return null;
    const raw = await response.text();
    if (raw.length < 20 || raw.length > 4500) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const object = data as Record<string, unknown>;
    if (object.ok !== true || object.code !== "checkout_session_created_no_entitlement" || typeof object.checkoutUrl !== "string") return null;
    const parsed = new URL(object.checkoutUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "checkout.stripe.com" ||
        parsed.port || parsed.username || parsed.password || parsed.hash ||
        !parsed.pathname.startsWith("/c/pay/") || !parsed.pathname.includes("cs_live_")) return null;
    return parsed.href;
  } catch {
    // No account, session, Stripe, raw error or token data is logged.
    return null;
  }
}
