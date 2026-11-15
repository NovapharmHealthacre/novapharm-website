"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// Keep this record interoperable with assets/js/cookie-consent.js on the static estate.
const storageKey = "np_cookie_consent";
const consentVersion = "2026-11-15-v1.3";
const maxAgeMs = 180 * 24 * 60 * 60 * 1000;

type Categories = {
  readonly necessary: true;
  readonly preferences: boolean;
  readonly analytics: boolean;
  readonly marketing: boolean;
};

interface ConsentRecord {
  readonly version: string;
  readonly categories: Categories;
  readonly timestamp: string;
  readonly id: string;
}

function readConsent(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ConsentRecord>;
    const recorded = Date.parse(String(value.timestamp ?? ""));
    const age = Date.now() - recorded;
    if (value.version !== consentVersion || !/^[a-f0-9-]{16,64}$/i.test(String(value.id ?? "")) ||
        !Number.isFinite(recorded) || age < 0 || age > maxAgeMs || value.categories?.necessary !== true) return null;
    return {
      version: consentVersion,
      id: String(value.id),
      timestamp: new Date(recorded).toISOString(),
      categories: {
        necessary: true,
        preferences: value.categories?.preferences === true,
        analytics: value.categories?.analytics === true,
        // No advertising/marketing provider is active. Prior choices cannot pre-authorise one.
        marketing: false,
      },
    };
  } catch {
    return null;
  }
}

function createConsent(categories: Categories): ConsentRecord {
  const id = globalThis.crypto?.randomUUID?.() ??
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
  return { version: consentVersion, categories, timestamp: new Date().toISOString(), id };
}

export function CookieControls() {
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const [manage, setManage] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pendingFocusReturnRef = useRef(false);

  const open = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : document.querySelector<HTMLElement>("[data-cookie-settings]");
    const saved = readConsent();
    setPreferences(saved?.categories.preferences ?? false);
    setAnalytics(saved?.categories.analytics ?? false);
    setReady(false);
    setError("");
    setManage(true);
  }, []);

  const close = useCallback(() => {
    pendingFocusReturnRef.current = true;
    setManage(false);
    setReady(readConsent() === null);
  }, []);

  useEffect(() => {
    setReady(readConsent() === null);
    window.addEventListener("novapharm:cookie-settings", open);
    return () => window.removeEventListener("novapharm:cookie-settings", open);
  }, [open]);

  useEffect(() => {
    if (!manage) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, input, [href], [tabindex]:not([tabindex='-1'])")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")];
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, manage]);

  useEffect(() => {
    if (manage || !pendingFocusReturnRef.current) return;
    pendingFocusReturnRef.current = false;
    const target = returnFocusRef.current;
    if (target?.isConnected) target.focus();
    else if (ready) document.querySelector<HTMLElement>("[data-cookie-manage]")?.focus();
  }, [manage, ready]);

  function save(next: Categories) {
    try {
      const choice = createConsent(next);
      window.localStorage.setItem(storageKey, JSON.stringify(choice));
      // Provider-side listeners must receive the same record as the static website.
      window.dispatchEvent(new CustomEvent("novapharm:consent", { detail: choice }));
      window.dispatchEvent(new CustomEvent("novapharm:consent-changed", { detail: choice.categories }));
      setError("");
      setPreferences(next.preferences);
      setAnalytics(next.analytics);
      setReady(false);
      pendingFocusReturnRef.current = true;
      setManage(false);
    } catch {
      // A failed preference write never triggers optional analytics.
      setError("Your browser did not save this choice. Non-essential services remain off. Check your storage settings and try again.");
      setReady(true);
    }
  }

  return (
    <>
      {ready ? (
        <section className="cookie-banner" aria-labelledby={titleId} hidden={manage}>
          <div>
            <strong id={titleId}>Your privacy choices</strong>
            <p>Necessary storage supports requested services. Optional analytics is off until you choose it. Marketing tracking is not active. <Link href="/legal/cookies/">How this works</Link>.</p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="button button-primary" onClick={() => save({ necessary: true, preferences: true, analytics: true, marketing: false })}>Accept optional analytics</button>
            <button type="button" className="button button-light" onClick={() => save({ necessary: true, preferences: false, analytics: false, marketing: false })}>Reject non-essential</button>
            <button type="button" className="button button-quiet" data-cookie-manage onClick={open}>Manage preferences</button>
          </div>
          {error ? <p role="alert">{error}</p> : null}
        </section>
      ) : null}
      {manage ? (
        <div className="preference-backdrop">
          <section className="preference-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="preference-title" aria-describedby="preference-description">
            <button className="preference-close" type="button" aria-label="Close cookie settings" onClick={close}>Close</button>
            <span className="eyebrow">Privacy controls</span>
            <h2 id="preference-title">Cookie settings</h2>
            <p id="preference-description">Optional analytics can measure eligible public pages only after your choice. No advertising tags are active. You may change or withdraw your choice here at any time.</p>
            <div className="preference-row"><div><strong>Strictly necessary</strong><span>Security, consent memory and requested portal sessions.</span></div><input type="checkbox" checked disabled aria-label="Strictly necessary technologies always active" /></div>
            <label className="preference-row"><div><strong>Preferences</strong><span>Remember optional display or service choices.</span></div><input type="checkbox" checked={preferences} onChange={(event) => setPreferences(event.target.checked)} /></label>
            <label className="preference-row"><div><strong>Analytics</strong><span>Optional Google Analytics 4 measurement on eligible public pages only. Not used on protected or legal pages.</span></div><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
            <div className="preference-row"><div><strong>Marketing tracking</strong><span>Not active. Enabling a future provider will require a new choice.</span></div><input type="checkbox" checked={false} disabled aria-label="Marketing tracking unavailable" /></div>
            <div className="dialog-actions">
              <button type="button" className="button button-primary" onClick={() => save({ necessary: true, preferences, analytics, marketing: false })}>Save preferences</button>
              <button type="button" className="button button-light" onClick={() => save({ necessary: true, preferences: false, analytics: false, marketing: false })}>Reject non-essential</button>
            </div>
            <p>Your choice is stored in this browser for up to 180 days. <Link href="/legal/privacy/">Read the privacy notice</Link>.</p>
            {error ? <p role="alert">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

export function CookieSettingsButton({ className = "footer-button" }: { readonly className?: string }) {
  return <button className={className} data-cookie-settings type="button" onClick={() => window.dispatchEvent(new Event("novapharm:cookie-settings"))}>Cookie settings</button>;
}
