"use client";

import { type FormEvent, useState } from "react";
import { isPortalAccessType, landingRouteForAccess } from "../data/routes";
import { professionalError, protectedMutation } from "../lib/gateway";
import { PortalBrand } from "./portal-brand";

const accessTypes = [
  { value: "customer", label: "Customer" },
  { value: "employee", label: "Employee" },
  { value: "board", label: "Board" },
  { value: "admin", label: "Administrator" },
] as const;

type AccessType = (typeof accessTypes)[number]["value"];

const corporateUrl = "https://novapharmhealthcare.com";

export function LoginPanel() {
  const [accessType, setAccessType] = useState<AccessType>("customer");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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
      if (!isPortalAccessType(result.accessType) || result.accessType !== accessType) {
        throw new Error("The authorised portal area did not match the requested workspace.");
      }
      window.location.assign(result.mustChangePassword ? "/portal/change-password/" : landingRouteForAccess(result.accessType));
    } catch (error) {
      setStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  const entraEnabled = process.env["NEXT_PUBLIC_ENTRA_LOGIN_ENABLED"] === "true";
  const entraReturn = `/auth/entra-complete/?accessType=${accessType}`;

  return <div className="np-portal-entry">
    <a className="np-portal-skip" href="#portal-signin">Skip to sign in</a>
    <header className="np-portal-entry-header">
      <PortalBrand home={corporateUrl} />
      <nav aria-label="Portal information">
        <a href={`${corporateUrl}/about/`}>Company</a>
        <a href={`${corporateUrl}/products/`}>Products</a>
        <a href={`${corporateUrl}/contact/`}>Support</a>
      </nav>
    </header>
    <main className="np-portal-entry-main">
      <section className="np-portal-entry-intro" aria-labelledby="portal-title">
        <p className="np-portal-entry-kicker">Secure Portal</p>
        <h1 id="portal-title">Sign in to the<br />NovaPharm Portal.</h1>
        <p className="np-portal-entry-lead">A secure workspace for partners, suppliers and regulated accounts.</p>
        <div className="np-portal-entry-details">
          <p><strong>Verified access.</strong> Workspaces are restricted to authorised organisations.</p>
          <p><strong>Controlled information.</strong> Orders, documents and records are subject to your permissions.</p>
        </div>
      </section>
      <section className="np-portal-entry-card login-panel" id="portal-signin" aria-labelledby="sign-in-title">
        <header>
          <h2 id="sign-in-title">Welcome back.</h2>
          <p>Sign in to access your account.</p>
        </header>
        <fieldset className="access-selector np-portal-entry-areas">
          <legend>Access area</legend>
          {accessTypes.map(({ value, label }) => <label key={value} className={accessType === value ? "selected" : ""}>
            <input type="radio" name="accessType" value={value} checked={accessType === value} onChange={() => setAccessType(value)} />
            <span>{label}</span>
          </label>)}
        </fieldset>
        <form className="login-form np-portal-entry-form" onSubmit={submit}>
          <label htmlFor="username">Work email</label>
          <input id="username" name="username" type="text" inputMode="email" aria-label="Work email (Username or business email)"
            autoComplete="username" placeholder="name@company.com" required maxLength={160} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password"
            placeholder="Enter your password" required maxLength={256} />
          <button className="button primary np-portal-entry-submit" type="submit" aria-label="Sign in securely" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {entraEnabled ? <div className="np-portal-entry-federation">
          <p>or</p>
          <a className="button microsoft" href={`/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(entraReturn)}`}>Continue with Microsoft Entra ID</a>
        </div> : null}
        <p className="np-portal-entry-status form-status" role="status" aria-live="polite">{status}</p>
        <p className="np-portal-entry-trust">Protected access. Multifactor authentication is required where your organisation's policy applies.</p>
        <div className="np-portal-entry-help">
          <a href={`${corporateUrl}/contact/`}>Request access</a>
          <a href={`mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20portal%20access%20support`}>Need help?</a>
        </div>
      </section>
    </main>
    <footer className="np-portal-entry-footer">
      <span>NovaPharm Healthcare Ltd <span aria-hidden="true">·</span> United Kingdom</span>
      <nav aria-label="Portal legal information">
        <a href={`${corporateUrl}/legal/privacy/`}>Privacy</a>
        <a href={`${corporateUrl}/legal/terms/`}>Terms</a>
        <a href={`${corporateUrl}/trust-centre/`}>Security</a>
      </nav>
    </footer>
  </div>;
}
