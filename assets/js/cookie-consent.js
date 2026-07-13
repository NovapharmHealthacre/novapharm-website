export const CONSENT_STORAGE_KEY = "np_cookie_consent";
export const CONSENT_VERSION = "2026-07-11-v1.0";
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export const DEFAULT_CATEGORIES = Object.freeze({ necessary: true, preferences: false, analytics: false, marketing: false });

function categoriesFrom(value = {}) {
  return {
    necessary: true,
    preferences: value.preferences === true,
    analytics: value.analytics === true,
    marketing: value.marketing === true
  };
}

export function parseConsent(raw, now = Date.now()) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const timestamp = Date.parse(parsed.timestamp);
    if (parsed.version !== CONSENT_VERSION || !Number.isFinite(timestamp) || timestamp > now || now - timestamp > CONSENT_MAX_AGE_MS) return null;
    if (!/^[a-f0-9-]{16,64}$/i.test(String(parsed.id || ""))) return null;
    return { version: CONSENT_VERSION, id: parsed.id, timestamp: new Date(timestamp).toISOString(), categories: categoriesFrom(parsed.categories) };
  } catch {
    return null;
  }
}

export function readConsent(storage, now = Date.now()) {
  try {
    return parseConsent(storage?.getItem(CONSENT_STORAGE_KEY), now);
  } catch {
    return null;
  }
}

function preferenceId(cryptoImplementation = globalThis.crypto) {
  if (typeof cryptoImplementation?.randomUUID === "function") return cryptoImplementation.randomUUID();
  if (typeof cryptoImplementation?.getRandomValues === "function") {
    const values = new Uint8Array(16);
    cryptoImplementation.getRandomValues(values);
    return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function saveConsent(storage, categories, { now = new Date(), id = preferenceId() } = {}) {
  const record = { version: CONSENT_VERSION, id, timestamp: now.toISOString(), categories: categoriesFrom(categories) };
  storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function categoryAllowed(record, category) {
  if (category === "necessary") return true;
  return Boolean(record?.categories?.[category]);
}

function applyConsent(record) {
  globalThis.dispatchEvent?.(new CustomEvent("novapharm:consent", { detail: record }));
}

function button(label, className, action) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.dataset.consentAction = action;
  return element;
}

function initialiseConsentInterface() {
  const existing = readConsent(window.localStorage);
  if (existing) applyConsent(existing);

  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("aria-label", "Cookie choices");
  banner.hidden = Boolean(existing);
  banner.innerHTML = `<div class="cookie-banner-inner"><div><h2>Your privacy choices</h2><p>NovaPharm uses necessary security and portal technologies. Optional preferences, analytics and marketing remain off unless you choose them. <a href="/legal/cookies/">Read the cookie notice</a>.</p></div><div class="cookie-actions"></div></div>`;
  const actions = banner.querySelector(".cookie-actions");
  actions.append(button("Accept all", "btn btn-primary", "accept"), button("Reject non-essential", "btn btn-primary", "reject"), button("Manage preferences", "btn btn-outline", "manage"));

  const dialog = document.createElement("dialog");
  dialog.className = "cookie-dialog";
  dialog.setAttribute("aria-labelledby", "cookie-dialog-title");
  dialog.innerHTML = `<form method="dialog" class="cookie-preferences"><div class="cookie-dialog-heading"><div><span class="section-kicker">Privacy control</span><h2 id="cookie-dialog-title">Cookie preferences</h2></div><button class="cookie-close" type="button" data-consent-action="close" aria-label="Close cookie preferences">×</button></div><p>Choose optional categories. Necessary technologies support security, forms and requested portal sessions and cannot be switched off here.</p><fieldset><legend>Categories</legend><label><span><strong>Strictly necessary</strong><small>CSRF protection, secure sessions and your saved choice.</small></span><input type="checkbox" checked disabled></label><label><span><strong>Preferences</strong><small>Remember optional display or service choices.</small></span><input type="checkbox" name="preferences"></label><label><span><strong>Analytics</strong><small>Measure public-site use. No analytics provider is currently enabled.</small></span><input type="checkbox" name="analytics"></label><label><span><strong>Marketing</strong><small>Advertising or campaign measurement. No marketing provider is currently enabled.</small></span><input type="checkbox" name="marketing"></label></fieldset><div class="cookie-dialog-actions"><button class="btn btn-primary" type="button" data-consent-action="save">Save preferences</button><button class="btn btn-outline" type="button" data-consent-action="reject">Reject non-essential</button></div><p class="field-help">Your choice is stored in this browser for 180 days and can be changed from the footer at any time.</p></form>`;
  const preferenceForm = dialog.querySelector("form");

  const openDialog = () => {
    const record = readConsent(window.localStorage);
    for (const category of ["preferences", "analytics", "marketing"]) {
      preferenceForm.elements[category].checked = categoryAllowed(record, category);
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  };
  const closeDialog = () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  };
  const choose = (categories) => {
    const record = saveConsent(window.localStorage, categories);
    applyConsent(record);
    banner.hidden = true;
    closeDialog();
  };

  const handleAction = (action) => {
    if (action === "accept") choose({ preferences: true, analytics: true, marketing: true });
    if (action === "reject") choose(DEFAULT_CATEGORIES);
    if (action === "manage") openDialog();
    if (action === "close") closeDialog();
    if (action === "save") choose({
      preferences: preferenceForm.elements.preferences.checked,
      analytics: preferenceForm.elements.analytics.checked,
      marketing: preferenceForm.elements.marketing.checked
    });
  };

  banner.addEventListener("click", (event) => handleAction(event.target.closest("[data-consent-action]")?.dataset.consentAction));
  dialog.addEventListener("click", (event) => handleAction(event.target.closest("[data-consent-action]")?.dataset.consentAction));
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-cookie-settings]")) openDialog();
  });
  document.body.append(banner, dialog);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiseConsentInterface, { once: true });
  else initialiseConsentInterface();
}
