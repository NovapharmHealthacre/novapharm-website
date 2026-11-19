"use client";

import { Building2, Eye, EyeOff, KeyRound, ShieldCheck, Users } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { destinationAfterPortalLogin, validatedCustomerCommerceIntentQuery } from "../data/nutraxin-order-intent";
import { isPortalAccessType, landingRouteForAccess } from "../data/routes";
import { professionalError, protectedMutation } from "../lib/gateway";
import { AccountAccessHelp } from "./account-access-help";
import { PortalBrand } from "./portal-brand";

const accessTypes = [
  { value: "customer", label: "Customer", icon: Building2 },
  { value: "employee", label: "Employee", icon: Users },
  { value: "board", label: "Board", icon: ShieldCheck },
  { value: "admin", label: "Administrator", icon: KeyRound },
] as const;

type AccessType = (typeof accessTypes)[number]["value"];

const accessReason: Readonly<Record<AccessType, string>> = {
  customer: "A verified business account protects your organisation’s pricing, orders and documents. You can browse our public website before applying.",
  employee: "Your company-issued account protects operational and customer records. Your role determines which tools you can use.",
  board: "Board access protects confidential intelligence. Only specifically authorised identities can use these workspaces.",
  admin: "Administrator access is restricted to approved identities for secure platform operations.",
};

export function LoginPanel() {
  const [accessType, setAccessType] = useState<AccessType>("customer");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectionQuery, setSelectionQuery] = useState("");
  useEffect(() => setSelectionQuery(validatedCustomerCommerceIntentQuery(window.location.search)), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await protectedMutation<{ accessType: string; mustChangePassword: boolean }>("auth/login", {
        username: form.get("username"),
        password: form.get("password"),
        accessType,
      });
      if (!isPortalAccessType(result.accessType) || result.accessType !== accessType) throw new Error("The authorised portal area did not match the requested workspace.");
      const selection = validatedCustomerCommerceIntentQuery(window.location.search);
      window.location.assign(result.mustChangePassword ? `/portal/change-password/${selection}` : destinationAfterPortalLogin(result.accessType, selection, landingRouteForAccess(result.accessType)));
    } catch (error) {
      setStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  const entraEnabled = process.env["NEXT_PUBLIC_ENTRA_LOGIN_ENABLED"] === "true";
  const entraReturn = `/auth/entra-complete/?accessType=${accessType}${accessType === "customer" && selectionQuery ? `&${selectionQuery.slice(1)}` : ""}`;

  return <main className="login-layout">
    <section className="login-context" aria-labelledby="portal-title">
      <PortalBrand />
      <div className="login-copy">
        <p className="eyebrow">Secure workspace</p>
        <h1 id="portal-title">Sign in to the right workspace</h1>
        <p>Choose Customer, Employee, Board or Administrator. Your assigned permissions determine which tools and records you can access.</p>
      </div>
      <p className="environment-line">Authorised business users only. Activity is security logged.</p>
    </section>
    <section className="login-panel" aria-labelledby="sign-in-title">
      <div>
        <p className="eyebrow">NovaPharm identity</p>
        <h2 id="sign-in-title">Sign in to your portal</h2>
        <p className="muted" id="portal-account-reason">{accessReason[accessType]}</p>
      </div>
      <fieldset className="access-selector">
        <legend>Choose a workspace</legend>
        {accessTypes.map(({ value, label, icon: Icon }) => <label key={value} className={accessType === value ? "selected" : ""}>
          <input type="radio" name="accessType" value={value} checked={accessType === value} onChange={() => setAccessType(value)} />
          <Icon aria-hidden="true" className="np-symbol" /><span>{label}</span>
        </label>)}
      </fieldset>
      {accessType === "customer" && selectionQuery ? <p className="order-intent-login-note">Your product selection will open in My Products after sign-in. Pricing, stock and ordering remain subject to account-specific release checks.</p> : null}
      <form className="login-form" onSubmit={submit} aria-busy={busy}>
        <label htmlFor="username">Username or business email</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={160} aria-describedby="portal-account-reason" />
        <label htmlFor="password">Password</label>
        <div className="login-password-field">
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={256} />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={busy}>
            {showPassword ? <EyeOff aria-hidden="true" className="np-symbol" /> : <Eye aria-hidden="true" className="np-symbol" />}
          </button>
        </div>
        <button className="button primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      {entraEnabled ? <a className="button microsoft" href={`/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(entraReturn)}`}><ShieldCheck aria-hidden="true" className="np-symbol" />Continue with Microsoft</a> : null}
      <p className="form-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
      <p className="security-note"><ShieldCheck aria-hidden="true" className="np-symbol" /> Credentials are verified by the protected server. Passwords are never stored in this browser.</p>
      <AccountAccessHelp audience={accessType} />
      <p className="portal-privacy-note">Sign-in processes account identity, access scope, session and security-audit information to protect your workspace. <a href="https://novapharmhealthcare.com/legal/privacy/" rel="noopener noreferrer">Privacy notice</a> · <a href="https://novapharmhealthcare.com/contact/" rel="noopener noreferrer">Privacy enquiries</a>. No marketing consent is required to sign in.</p>
    </section>
  </main>;
}
