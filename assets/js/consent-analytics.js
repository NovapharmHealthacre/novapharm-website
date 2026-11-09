import { CONSENT_STORAGE_KEY, parseConsent } from "./cookie-consent.js";

// No provider is loaded without both a verified ID in the public document
// and a currently valid, affirmative analytics choice in this browser.
export function validGa4Id(id) {
  return /^G-[A-Z0-9]{6,18}$/.test(String(id || ""));
}

export function publicAnalyticsRoute(pathname) {
  const path = String(pathname || "");
  if (!/^\/(?:$|about\/|capabilities\/|services\/|regulatory-services\/|cro\/|oncology\/|products\/|partner-with-us\/|technology\/|news-insights\/|leadership\/)/.test(path)) return false;
  if (/^\/products\/nutraxin\/(?:order-request|checkout|account|confirmation)\//.test(path)) return false;
  return !/(?:\/portal\/|\/admin\/|\/employee\/|\/account-application\/|\/contact\/)/.test(path);
}

export function analyticsBrand(pathname) {
  if (String(pathname).startsWith("/products/nutraxin/")) return "nutraxin";
  if (String(pathname).startsWith("/technology/")) return "intelligence";
  return "healthcare";
}

const EVENT_NAMES = new Set(["cta_click", "view_item", "add_to_cart", "begin_checkout"]);

export function sanitiseMarketingEvent(detail, pathname) {
  if (!detail || !EVENT_NAMES.has(detail.event) || !publicAnalyticsRoute(pathname)) return null;
  const event = { event: detail.event, brand: analyticsBrand(pathname) };
  if (detail.event === "cta_click" && /^[a-z0-9-]{1,64}$/.test(detail.ctaId || "")) event.cta_id = detail.ctaId;
  // Never send URLs with query strings, form fields, baskets, price, order IDs,
  // health details, user IDs or browser attribution payloads to GA4.
  return event;
}

function analyticsConsent() {
  try { return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY))?.categories?.analytics === true; }
  catch { return false; }
}

function eraseGaCookies() {
  const domain = location.hostname.split(".").slice(-2).join(".");
  for (const item of document.cookie.split(";")) {
    const key = item.split("=")[0].trim();
    if (!/^_ga(?:_|$)/.test(key)) continue;
    for (const suffix of ["", "; domain=" + domain, "; domain=." + domain]) {
      document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + suffix + "; SameSite=Lax";
    }
  }
}

function initialiseAnalytics() {
  const id = document.querySelector('meta[name="novapharm-ga4-id"]')?.content || "";
  if (!validGa4Id(id) || !publicAnalyticsRoute(location.pathname)) return;
  let started = false;
  let allowed = false;
  const pageLocation = location.origin + location.pathname;
  const send = (event, parameters = {}) => {
    if (!allowed || !started || !analyticsConsent()) return;
    window.gtag("event", event, {
      brand: analyticsBrand(location.pathname),
      page_location: pageLocation,
      ...parameters
    });
  };
  const grant = () => {
    if (allowed && started) return;
    allowed = true;
    window["ga-disable-" + id] = false;
    if (!started) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      // Basic Consent Mode: the provider script is not fetched before consent.
      // When it is fetched, deny every storage/advertising purpose by default.
      window.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
      window.gtag("js", new Date());
      window.gtag("config", id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: 90 * 24 * 60 * 60,
        page_location: pageLocation,
        page_referrer: ""
      });
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
      document.head.append(script);
      started = true;
    } else {
      // A visitor can withdraw consent and subsequently grant it again.
      // Re-enable analytics storage only on that new affirmative choice.
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
    send("page_view", { page_title: document.title });
    if (/^\/products\/nutraxin\/(?!bag\/|order-request\/)[a-z0-9-]+\/$/.test(location.pathname)) {
      send("view_item", { item_category: "food_supplements" });
    }
  };
  const revoke = () => {
    allowed = false;
    window["ga-disable-" + id] = true;
    if (started) window.gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    eraseGaCookies();
  };
  window.addEventListener("novapharm:consent", (event) => {
    if (event.detail?.categories?.analytics === true && analyticsConsent()) grant();
    else revoke();
  });
  window.addEventListener("novapharm:marketing-event", (event) => {
    const clean = sanitiseMarketingEvent(event.detail, location.pathname);
    if (!clean) return;
    const { event: name, ...parameters } = clean;
    send(name, parameters);
  });
  if (analyticsConsent()) grant();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiseAnalytics, { once: true });
  else initialiseAnalytics();
}
