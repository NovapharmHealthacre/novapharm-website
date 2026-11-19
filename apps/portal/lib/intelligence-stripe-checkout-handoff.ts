/**
 * Optional server-to-server handoff after signed OIDC identity verification.
 * Not a payment, tenant grant, ledger acceptance, or entitlement.
 * Disabled unless explicitly released; private checkout must enforce its
 * own independently approved billing and customer gates.
 */
export async function requestIntelligenceSubscriptionCheckout({
  idToken, plan, cycle, enabled = process.env["NPI_SUBSCRIPTION_CHECKOUT_HANDOFF_ENABLED"] === "true",
  fetchImpl = fetch,
}: {
  idToken: string;
  plan: string | null | undefined;
  cycle: string | null | undefined;
  enabled?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<string | null> {
  if (!enabled) return null;
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
    const payload = data as Record<string, unknown>;
    if (payload.ok !== true || payload.code !== "checkout_session_created_no_entitlement" || typeof payload.checkoutUrl !== "string") return null;
    const parsed = new URL(payload.checkoutUrl);
    // Inspect parsed origin and the whole path, never a host substring.
    if (parsed.origin !== "https://checkout.stripe.com" || parsed.username ||
        parsed.password || parsed.search || parsed.hash ||
        !/^\/c\/pay\/cs_live_[A-Za-z0-9_-]{4,}$/.test(parsed.pathname)) return null;
    return parsed.href;
  } catch {
    // Never log JWTs, checkout URLs, customer identifiers or Stripe data.
    return null;
  }
}
