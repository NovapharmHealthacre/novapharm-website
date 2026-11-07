/**
 * Read-only, non-destructive AWS contact and portal acceptance.
 * This does not submit business enquiries or attempt to log in.
 * A PASS means only that the inspected public/API/portal endpoints exhibit the
 * minimum server and security boundaries; downstream synthetic submission and
 * authorised login proof must be separately recorded before a live claim.
 */
const timeoutMs = 12000;
const safeJson = async response => {
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) return null;
  return response.json().catch(() => null);
};
function origin(value, label) {
  if (!value) throw Error(label + " is required.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw Error(label + " must be a bare HTTPS origin.");
  }
  return url.origin;
}
async function check(url, label, method = "GET", extra = {}) {
  try {
    const response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
      cache: "no-store",
      headers: { "Accept": "application/json, text/html;q=0.9", "Cache-Control": "no-store" },
      ...extra
    });
    return { label, response, ok: true };
  } catch (error) {
    return { label, response: null, ok: false, error: error.message };
  }
}
function deny(results, label, reason) {
  results.push({ label, pass: false, reason });
}
function permit(results, label, evidence) {
  results.push({ label, pass: true, evidence });
}

export async function inspect(options) {
  const publicOrigin = origin(options.publicOrigin, "PUBLIC_ORIGIN");
  const apiOrigin = origin(options.apiOrigin, "PUBLIC_API_ORIGIN");
  const portalOrigin = origin(options.portalOrigin, "PORTAL_ORIGIN");
  if (new Set([publicOrigin, apiOrigin, portalOrigin]).size !== 3) {
    throw Error("Public, API and portal must use three independently controlled origins.");
  }
  const results = [];
  const contact = await check(publicOrigin + "/contact/", "public contact page");
  if (!contact.ok || contact.response.status !== 200) deny(results, "public contact page", contact.error || "HTTP " + contact.response.status);
  else {
    const html = await contact.response.text();
    const isManagedForm = /<form\b[^>]*(?:data-contact-form|id=["']contact-form["'])/iu.test(html)
      || html.includes("Tell us about your enquiry.");
    const failClosed = /does not collect or transmit enquiry details|secure online form is not active/iu.test(html);
    if (isManagedForm && !failClosed) permit(results, "public contact form rendered", "Managed form visible; submission untested");
    else deny(results, "public contact form rendered", failClosed ? "Published page explicitly disables managed contact submissions." : "No governed form detected.");
  }

  const health = await check(apiOrigin + "/api/health", "private runtime health");
  const payload = health.response ? await safeJson(health.response) : null;
  if (!health.ok || health.response.status !== 200 || payload?.ready !== true || payload?.database !== "ready") {
    deny(results, "API and durable database ready", health.error || "Runtime did not report ready=true and database=ready.");
  } else permit(results, "API and durable database ready", "Validated JSON from configured API origin");

  const csrf = await check(apiOrigin + "/api/security/csrf", "CSRF endpoint");
  const csrfPayload = csrf.response ? await safeJson(csrf.response) : null;
  if (!csrf.ok || csrf.response.status !== 200 || !csrfPayload || typeof csrfPayload.csrfToken !== "string" || csrfPayload.csrfToken.length < 32) {
    deny(results, "API CSRF service", "No verifiable CSRF token from API.");
  } else permit(results, "API CSRF service", "CSRF token endpoint responsive");

  const portal = await check(portalOrigin + "/", "portal entry");
  if (!portal.ok || portal.response.status !== 200) deny(results, "managed portal entry", portal.error || "HTTP " + portal.response.status);
  else {
    const html = await portal.response.text();
    if (/<input\b[^>]*name=["']password["']/iu.test(html) || html.includes("Sign in to your portal")) {
      permit(results, "managed portal entry", "Login UI served from independent managed origin; authentication untested");
    } else deny(results, "managed portal entry", "No governed managed login UI observed.");
  }

  const guarded = await check(portalOrigin + "/gateway/portal/session", "protected portal session");
  if (!guarded.ok || ![401, 403].includes(guarded.response.status)) {
    deny(results, "anonymous portal API denial", guarded.error || "Expected 401/403 for anonymous private-session request; observed HTTP " + guarded.response.status);
  } else permit(results, "anonymous portal API denial", "Private API denies unauthenticated access");

  const conclusive = results.every(x => x.pass);
  return {
    publicOrigin, apiOrigin, portalOrigin,
    checks: results, passedReadOnlyPreflight: conclusive,
    liveContactAccepted: false, livePortalLoginAccepted: false,
    requiredFinalEvidence: ["Synthetic contact POST with durable record ID and authorized email delivery receipt", "Authenticated MFA portal login with scoped authorizations", "Negative access/tenant tests and server-side audit evidence", "Published SHA, monitoring, rollback and account-owner approval"]
  };
}

if (process.argv[1]?.endsWith("verify-contact-portal-activation.mjs")) {
  try {
    const result = await inspect({
      publicOrigin: process.env.PUBLIC_ORIGIN,
      apiOrigin: process.env.PUBLIC_API_ORIGIN,
      portalOrigin: process.env.PORTAL_ORIGIN
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.passedReadOnlyPreflight) process.exitCode = 1;
  } catch (error) {
    console.error("FAIL CLOSED:", error.message);
    process.exitCode = 1;
  }
}
