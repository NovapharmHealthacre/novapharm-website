/**
 * Verify NovaPharm Intelligence's public entry without authenticating,
 * following Cognito redirects, or requesting any private medicine records.
 * This is a customer-entry smoke, NOT certification of an app/paid launch.
 * Never print authorization URLs, cookies, state, nonce, tokens or PII.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const origin = "https://intelligence.novapharmhealthcare.com";
const corporate = "https://novapharmhealthcare.com";
const cognito = "https://novapharm-intelligence-production-eun1.auth.eu-north-1.amazoncognito.com";
const callback = origin + "/auth/callback";

function reject(code) {
  throw Object.assign(new Error("Intelligence public entry verification failed: " + code), { code });
}
async function probe(fetchImpl, url) {
  const response = await fetchImpl(url, {
    method: "GET", redirect: "manual", cache: "no-store",
    headers: { Accept: "text/html,application/json,*/*" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response || typeof response.status !== "number") reject("unexpected_http_transport");
  return response;
}
function isSecureTransactionCookie(headers) {
  const cookies = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie") ?? ""];
  return cookies.some(cookie =>
    /^__Host-npi_oidc_tx=[^;]+;/u.test(cookie) &&
    /;\s*HttpOnly(?:;|$)/iu.test(cookie) &&
    /;\s*Secure(?:;|$)/iu.test(cookie) &&
    /;\s*SameSite=Lax(?:;|$)/iu.test(cookie) &&
    /;\s*Path=\/(?:;|$)/iu.test(cookie) &&
    !/;\s*Domain=/iu.test(cookie) &&
    // 300 seconds is the currently deployed version-15 baseline; 900 is
    // the bounded onboarding candidate. Accept either during the controlled
    // rollout, but never an arbitrary or unbounded transaction lifetime.
    /;\s*Max-Age=(?:300|900)(?:;|$)/iu.test(cookie)
  );
}

/** Public URLs only. A 200 on an unauthenticated medicine API is a release failure. */
export async function verifyIntelligencePublicEntry({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") reject("http_client_unavailable");

  const page = await probe(fetchImpl, origin + "/");
  if (page.status !== 200) reject("login_page_not_public");
  const markup = await page.text();
  const legacyEntry = markup.includes("Understand the medicine") &&
    (markup.includes("Invitation-only access") ||
     (markup.includes("Create a business account") &&
      markup.includes("Subscription checkout and medicines access become available only after")));
  const approvedHumanEntry = markup.includes("A more human") &&
    markup.includes("intelligence for") &&
    markup.includes("medicine.") &&
    markup.includes("Create a business account") &&
    markup.includes("Your business email, password and verification are handled by NovaPharm");
  if (markup.length > 2_000_000 ||
      !(legacyEntry || approvedHumanEntry) ||
      !markup.includes("/auth/customer/start")) reject("login_copy_or_constraints_invalid");

  const companyPage = await probe(fetchImpl, corporate + "/technology/");
  if (companyPage.status !== 200) reject("corporate_intelligence_page_not_public");
  const companyMarkup = await companyPage.text();
  if (companyMarkup.length > 4_000_000 ||
      !companyMarkup.includes(origin + "/") ||
      !companyMarkup.includes("Invitation-only")) reject("corporate_login_navigation_not_published");

  const signIn = await probe(fetchImpl, origin + "/auth/customer/start");
  if (signIn.status !== 302 || !isSecureTransactionCookie(signIn.headers)) {
    reject("secure_identity_start_not_available");
  }
  let location;
  try { location = new URL(signIn.headers.get("location") ?? ""); }
  catch { reject("identity_redirect_invalid"); }
  const query = location.searchParams;
  if (location.origin !== cognito || location.pathname !== "/oauth2/authorize" ||
      query.get("response_type") !== "code" ||
      query.get("redirect_uri") !== callback ||
      query.get("code_challenge_method") !== "S256" ||
      !/^[A-Za-z0-9_-]{43}$/u.test(query.get("code_challenge") ?? "") ||
      !/^[A-Za-z0-9_-]{40,128}$/u.test(query.get("state") ?? "") ||
      !/^[A-Za-z0-9_-]{40,128}$/u.test(query.get("nonce") ?? "") ||
      query.has("client_secret") ||
      query.get("scope")?.includes("openid") !== true) {
    reject("cognito_code_pkce_contract_invalid");
  }

  const missingCode = await probe(fetchImpl, callback);
  if (missingCode.status !== 401 ||
      missingCode.headers.get("cache-control")?.includes("no-store") !== true) {
    reject("unauthenticated_callback_not_denied");
  }

  const medicine = await probe(fetchImpl, origin + "/api/v1/intelligence/medicines/search/");
  if (medicine.status !== 403) reject("anonymous_medicine_api_not_iam_protected");

  const workspace = await probe(fetchImpl, origin + "/portal/executive-platform/medicines-intelligence/");
  if (workspace.status !== 403) reject("anonymous_workspace_not_iam_protected");

  const logo = await probe(fetchImpl, origin + "/assets/brand/novapharm-healthcare-logo.svg");
  if (logo.status !== 200) reject("brand_asset_unavailable");

  return Object.freeze({
    contract: "novapharm.intelligence.public-entry-acceptance.v1",
    verified: true,
    scope: "public-entry-and-anonymous-denial-only",
    landing: "HTTP_200",
    corporateNavigation: "HTTP_200",
    codePkceStart: "HTTP_302_SECURE_COOKIE",
    missingCodeCallback: "HTTP_401",
    anonymousMedicineApi: "HTTP_403",
    anonymousWorkspace: "HTTP_403",
    brandAsset: "HTTP_200",
    customerTenantActivated: false,
    licensedMedicineDataAccepted: false,
    recurringBillingCertified: false,
    novaInferenceProductionCertified: false,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await verifyIntelligencePublicEntry()));
  } catch (error) {
    // Do not leak HTTP URLs, cookies, query strings or credential material.
    console.error("Public entry failed: " + (typeof error?.code === "string" ? error.code : "network_or_transport"));
    process.exitCode = 1;
  }
}
