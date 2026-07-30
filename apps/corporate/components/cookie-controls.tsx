"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const storageKey = "np_cookie_consent";
const consentVersion = "2026-07-v2";

interface ConsentRecord {
  readonly version: string;
  readonly categories: { readonly preferences: boolean; readonly analytics: boolean; readonly marketing: boolean };
  readonly timestamp: string;
  readonly preferenceId: string;
}

function record(categories: ConsentRecord["categories"]): ConsentRecord {
  return { version: consentVersion, categories, timestamp: new Date().toISOString(), preferenceId: crypto.randomUUID() };
}

export function CookieControls() {
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pendingFocusReturnRef = useRef(false);

  const open = useCallback(() => {
    const activeElement = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    returnFocusRef.current = activeElement
      ?? document.querySelector<HTMLElement>("[data-cookie-manage]")
      ?? document.querySelector<HTMLElement>("[data-cookie-settings]");
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const consent = JSON.parse(saved) as ConsentRecord;
        setAnalytics(Boolean(consent.categories?.analytics));
        setMarketing(Boolean(consent.categories?.marketing));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setReady(false);
    setManage(true);
  }, []);

  const close = useCallback(() => {
    pendingFocusReturnRef.current = true;
    setManage(false);
    const firstVisit = localStorage.getItem(storageKey) === null;
    setReady(firstVisit);
  }, []);

  useEffect(() => {
    setReady(localStorage.getItem(storageKey) === null);
    window.addEventListener("novapharm:cookie-settings", open);
    return () => window.removeEventListener("novapharm:cookie-settings", open);
  }, [open]);

  useEffect(() => {
    if (!manage) return;
    const dialog = dialogRef.current;
    const firstControl = dialog?.querySelector<HTMLElement>("button, input, [href], [tabindex]:not([tabindex='-1'])");
    firstControl?.focus();
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
    const returnTarget = returnFocusRef.current;
    if (returnTarget?.isConnected) returnTarget.focus();
    else if (ready) document.querySelector<HTMLElement>("[data-cookie-manage]")?.focus();
  }, [manage, ready]);

  function save(next: ConsentRecord["categories"]) {
    localStorage.setItem(storageKey, JSON.stringify(record(next)));
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setReady(false);
    setManage(false);
    window.dispatchEvent(new CustomEvent("novapharm:consent-changed", { detail: next }));
  }

  return (
    <>
      {ready ? (
        <section className="cookie-banner" aria-labelledby={titleId} hidden={manage}>
          <div>
            <strong id={titleId}>Your privacy choices</strong>
            <p>Necessary storage protects requested services. Optional analytics and marketing are off until you choose them.</p>
          </div>
          <div className="cookie-actions">
            <button type="button" className="button button-primary" onClick={() => save({ preferences: true, analytics: true, marketing: true })}>Accept all</button>
            <button type="button" className="button button-light" onClick={() => save({ preferences: false, analytics: false, marketing: false })}>Reject non-essential</button>
            <button type="button" className="button button-quiet" data-cookie-manage onClick={open}>Manage preferences</button>
          </div>
        </section>
      ) : null}
      {manage ? (
        <div className="preference-backdrop">
          <section className="preference-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="preference-title" aria-describedby="preference-description">
            <button className="icon-button preference-close" type="button" onClick={close} aria-label="Close cookie settings"><X aria-hidden="true" /></button>
            <span className="eyebrow">Privacy controls</span>
            <h2 id="preference-title">Cookie settings</h2>
            <p id="preference-description">NovaPharm currently loads no analytics or marketing service. These controls preserve your choice if an approved service is introduced later.</p>
            <div className="preference-row"><div><strong>Strictly necessary</strong><span>Security, consent memory and requested portal sessions.</span></div><input type="checkbox" checked disabled aria-label="Strictly necessary technologies always active" /></div>
            <label className="preference-row"><div><strong>Analytics</strong><span>Optional, privacy-reviewed service only. None is enabled now.</span></div><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
            <label className="preference-row"><div><strong>Marketing</strong><span>Optional campaign measurement only. None is enabled now.</span></div><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /></label>
            <div className="dialog-actions">
              <button type="button" className="button button-primary" onClick={() => save({ preferences: false, analytics, marketing })}>Save preferences</button>
              <button type="button" className="button button-light" onClick={() => save({ preferences: false, analytics: false, marketing: false })}>Reject non-essential</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function CookieSettingsButton() {
  return <button className="footer-button" data-cookie-settings type="button" onClick={() => window.dispatchEvent(new Event("novapharm:cookie-settings"))}>Cookie settings</button>;
}
