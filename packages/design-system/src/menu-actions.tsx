"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Web equivalents of Apple HIG menus and actions.
 * Keep high-value actions visible; do not replace native text-edit menus.
 * Application authority and route-level permissions remain the caller's responsibility.
 */
export type CommandAction = Readonly<{
  id: string;
  label: string;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  confirmationMessage?: string;
  dividerBefore?: boolean;
  title?: string;
}>;

function actionable(action: CommandAction): boolean {
  return !action.disabled && Boolean(action.href || action.onSelect)
    && (!action.destructive || (Boolean(action.onSelect) && Boolean(action.confirmationMessage)));
}

function activate(action: CommandAction): void {
  if (!action.onSelect || !actionable(action)) return;
  if (action.destructive && action.confirmationMessage && !window.confirm(action.confirmationMessage)) return;
  action.onSelect();
}

function ActionItem({ action, close, className = "" }: Readonly<{
  action: CommandAction;
  close?: () => void;
  className?: string;
}>) {
  const enabled = actionable(action);
  const shared = {
    className: ["np-command-action", action.destructive && "np-command-action--destructive", className].filter(Boolean).join(" "),
    title: action.title,
  };
  if (action.href && enabled && !action.destructive) return <a {...shared} href={action.href} onClick={close}>{action.label}</a>;
  return <button {...shared} type="button" disabled={!enabled} onClick={() => { activate(action); close?.(); }}>{action.label}</button>;
}

/**
 * A visible, progressive-enhancement pull-down. Native details/summary handles
 * click, tap and keyboard activation without introducing a fragile ARIA menu role.
 * Arrow/Home/End are added as an enhancement; Tab remains ordinary browser Tab.
 */
export function CommandMenu({ label, actions, align = "end" }: Readonly<{
  label: string;
  actions: readonly CommandAction[];
  align?: "start" | "end";
}>) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const close = () => { if (ref.current) ref.current.open = false; };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDetailsElement>) => {
    if (!ref.current) return;
    if (event.key === "Escape" && ref.current.open) {
      event.preventDefault();
      close();
      ref.current.querySelector("summary")?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const targets = Array.from(ref.current.querySelectorAll<HTMLElement>(
      ".np-command-menu__items a[href], .np-command-menu__items button:not(:disabled)"
    ));
    if (!targets.length) return;
    event.preventDefault();
    if (!ref.current.open) {
      ref.current.open = true;
      targets[event.key === "ArrowUp" || event.key === "End" ? targets.length - 1 : 0]?.focus();
      return;
    }
    const current = targets.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 :
      event.key === "End" ? targets.length - 1 :
      event.key === "ArrowDown" ? (current + 1 + targets.length) % targets.length :
      (current - 1 + targets.length) % targets.length;
    targets[next]?.focus();
  };
  return <details ref={ref} className={"np-command-menu np-command-menu--" + align}
    onKeyDown={handleKeyDown}>
    <summary className="np-command-menu__trigger">{label}<span aria-hidden="true" className="np-command-menu__chevron">⌄</span></summary>
    <ul className="np-command-menu__items" aria-label={label + " options"}>
      {actions.map((action) => <li key={action.id}
        className={action.dividerBefore ? "np-command-menu__separated" : undefined}>
        <ActionItem action={action} close={close} />
      </li>)}
    </ul>
  </details>;
}

/** Frequently used commands remain exposed. Secondary commands may be grouped. */
export function ActionToolbar({ label, primary, more = [], leading }: Readonly<{
  label: string;
  primary: readonly CommandAction[];
  more?: readonly CommandAction[];
  leading?: ReactNode;
}>) {
  const moveToolbarFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      ".np-command-toolbar__actions > a[href], .np-command-toolbar__actions > button:not(:disabled), .np-command-toolbar__actions > .np-command-menu > summary"
    ));
    const current = targets.indexOf(document.activeElement as HTMLElement);
    if (current < 0 || !targets.length) return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = event.key === "ArrowRight" ? (rtl ? -1 : 1) : (rtl ? 1 : -1);
    const next = event.key === "Home" ? 0 : event.key === "End" ? targets.length - 1 :
      (current + step + targets.length) % targets.length;
    targets[next]?.focus();
  };
  return <div className="np-command-toolbar" role="toolbar" aria-label={label} onKeyDown={moveToolbarFocus}>
    {leading ? <div className="np-command-toolbar__leading">{leading}</div> : null}
    <div className="np-command-toolbar__actions">
      {primary.map((action) => <ActionItem key={action.id} action={action}
        className={action.destructive ? "" : "np-command-toolbar__direct"} />)}
      {more.length ? <CommandMenu label="More Actions" actions={more} /> : null}
    </div>
  </div>;
}

/** Mutually exclusive options use a native select rather than a command menu. */
export function ChoicePicker({ id, label, value, options, onChange, disabled = false }: Readonly<{
  id: string;
  label: string;
  value: string;
  options: readonly Readonly<{ value: string; label: string; disabled?: boolean }>[];
  onChange: (value: string) => void;
  disabled?: boolean;
}>) {
  return <div className="np-choice-picker">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)}>
      {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
  </div>;
}

/** Binary state always has a visible label; the browser owns its checked state. */
export function BinaryToggle({ label, checked, onChange, disabled = false }: Readonly<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}>) {
  return <label className="np-binary-toggle">
    <input type="checkbox" checked={checked} disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.checked)} />
    <span>{label}</span>
  </label>;
}

/** Only pass intentionally public, canonical HTTPS URLs. Never pass signed or protected links. */
export function SharePublicLink({ url, title, label = "Share" }: Readonly<{
  url: string; title: string; label?: string;
}>) {
  const [status, setStatus] = useState("");
  const publicHttps = (() => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && Boolean(parsed.hostname)
        && !parsed.username && !parsed.password && !parsed.search && !parsed.hash
        && !/\s/.test(url);
    } catch { return false; }
  })();
  const share = async () => {
    if (!publicHttps) return;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        setStatus("Shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied");
      } else setStatus("Use your browser to copy the page link.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Sharing is unavailable. You can copy the page URL instead.");
    }
  };
  return <span className="np-share-link">
    <button type="button" className="np-command-action"
      onClick={() => { void share(); }} disabled={!publicHttps}>{label}</button>
    <span className="np-share-link__status" role="status" aria-live="polite">{status}</span>
  </span>;
}
