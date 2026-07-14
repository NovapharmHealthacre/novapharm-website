import { CONSENT_STORAGE_KEY, parseConsent } from "./cookie-consent.js";

const ATTRIBUTION_KEY = "np_marketing_attribution";
const CAMPAIGN_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function analyticsAllowed() {
  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY))?.categories?.analytics === true;
  } catch {
    return false;
  }
}

function safeUrl(value) {
  try {
    const url = new URL(value, location.href);
    return url.origin === location.origin ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

function collectAttribution() {
  const params = new URLSearchParams(location.search);
  const campaign = Object.fromEntries(CAMPAIGN_FIELDS
    .map((field) => [field, params.get(field)])
    .filter(([, value]) => value));
  const referringHost = (() => {
    try { return document.referrer ? new URL(document.referrer).hostname : ""; }
    catch { return ""; }
  })();
  if (!Object.keys(campaign).length && !referringHost) return null;
  return {
    firstLandingPath: location.pathname,
    referringHost,
    campaign,
    capturedAt: new Date().toISOString(),
    sourceClass: campaign.utm_source === "chatgpt.com" || referringHost.endsWith("chatgpt.com")
      ? "chatgpt-search"
      : campaign.utm_source || referringHost || "direct"
  };
}

function readAttribution() {
  try { return JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || "null"); }
  catch { return null; }
}

function saveAttribution(value) {
  if (!value || !analyticsAllowed()) return;
  try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value)); }
  catch { /* Session storage is optional. */ }
}

function decorateForms(attribution) {
  if (!attribution) return;
  for (const form of document.querySelectorAll("form[data-contact-form], form[data-account-application]")) {
    const values = {
      sourcePage: location.pathname,
      sourceCta: form.dataset.sourceCta || document.activeElement?.closest?.("[data-cta-id]")?.dataset.ctaId || "",
      referralSource: attribution.sourceClass || "",
      attributionPayload: JSON.stringify(attribution)
    };
    for (const [name, value] of Object.entries(values)) {
      let input = form.elements.namedItem(name);
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.append(input);
      }
      input.value = value;
    }
  }
}

function emitCtaEvent(event) {
  const link = event.target.closest?.("[data-cta-id]");
  if (!link || !analyticsAllowed()) return;
  window.dispatchEvent(new CustomEvent("novapharm:marketing-event", {
    detail: {
      event: "cta_click",
      ctaId: link.dataset.ctaId,
      sourcePath: location.pathname,
      destination: safeUrl(link.href),
      attribution: readAttribution()
    }
  }));
}

function initialise() {
  const fresh = collectAttribution();
  if (fresh) saveAttribution(fresh);
  decorateForms(readAttribution());
  document.addEventListener("click", emitCtaEvent);
  window.addEventListener("novapharm:consent", (event) => {
    if (event.detail?.categories?.analytics === true) {
      const attribution = collectAttribution();
      if (attribution) saveAttribution(attribution);
      decorateForms(readAttribution());
    } else {
      try { sessionStorage.removeItem(ATTRIBUTION_KEY); } catch { /* Optional storage. */ }
    }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialise, { once: true });
else initialise();
