"use client";

import { Building2, KeyRound, ShieldCheck, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { isPortalAccessType, landingRouteForAccess } from "../data/routes";
import { professionalError, protectedMutation } from "../lib/gateway";
import { PortalBrand } from "./portal-brand";

const accessTypes = [
  { value: "customer", label: "Customer", icon: Building2 },
  { value: "employee", label: "Employee", icon: Users },
  { value: "board", label: "Board", icon: ShieldCheck },
  { value: "admin", label: "Administrator", icon: KeyRound },
] as const;

type AccessType = (typeof accessTypes)[number]["value"];

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
      if (!isPortalAccessType(result.accessType) || result.accessType !== accessType) throw new Error("The authorised portal area did not match the requested workspace.");
      window.location.assign(result.mustChangePassword ? "/portal/change-password/" : landingRouteForAccess(result.accessType));
    } catch (error) {
      setStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  const entraEnabled = process.env["NEXT_PUBLIC_ENTRA_LOGIN_ENABLED"] === "true";
  const entraReturn = `/auth/entra-complete/?accessType=${accessType}`;

  return <main className="login-layout">
    <section className="login-context" aria-labelledby="portal-title">
      <PortalBrand />
      <div className="login-copy">
        <p className="eyebrow">Secure workspace</p>
        <h1 id="portal-title">One governed entry point. Four precise access boundaries.</h1>
        <p>Customer operations, company workflows, board intelligence and platform administration remain separated by server-enforced permissions.</p>
      </div>
      <p className="environment-line">Authorised business users only. Activity is security logged.</p>
    </section>
    <section className="login-panel" aria-labelledby="sign-in-title">
      <div>
        <p className="eyebrow">NovaPharm identity</p>
        <h2 id="sign-in-title">Sign in to your portal</h2>
        <p className="muted">Select the workspace you need. Your account must hold the matching scope.</p>
      </div>
      <fieldset className="access-selector">
        <legend>Portal type</legend>
        {accessTypes.map(({ value, label, icon: Icon }) => <label key={value} className={accessType === value ? "selected" : ""}>
          <input type="radio" name="accessType" value={value} checked={accessType === value} onChange={() => setAccessType(value)} />
          <Icon aria-hidden="true" /><span>{label}</span>
        </label>)}
      </fieldset>
      <form className="login-form" onSubmit={submit}>
        <label htmlFor="username">Username or business email</label>
        <input id="username" name="username" autoComplete="username" required maxLength={160} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
        <button className="button primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
      </form>
      {entraEnabled ? <a className="button microsoft" href={`/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(entraReturn)}`}><ShieldCheck aria-hidden="true" />Continue with Microsoft</a> : null}
      <p className="form-status" aria-live="polite">{status}</p>
      <p className="security-note"><ShieldCheck aria-hidden="true" /> Credentials are verified by the protected server. Passwords are never stored in this browser.</p>
    </section>
  </main>;
}
