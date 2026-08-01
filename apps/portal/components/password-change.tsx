"use client";

import { ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { professionalError, protectedMutation } from "../lib/gateway";
import { PortalBrand } from "./portal-brand";

export function PasswordChange() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (newPassword !== confirmation) {
      setStatus("The new password and confirmation do not match.");
      setBusy(false);
      return;
    }
    try {
      const result = await protectedMutation<{ redirectTo: string }>("auth/change-password", {
        currentPassword: form.get("currentPassword"),
        newPassword,
        confirmation,
      });
      setStatus("Password updated. Your other sessions have been signed out.");
      window.location.replace(result.redirectTo);
    } catch (error) {
      setStatus(professionalError(error));
    } finally {
      setBusy(false);
    }
  }

  return <main className="focused-layout"><section className="focused-panel"><PortalBrand /><p className="eyebrow">Security action required</p><h1>Replace your temporary password</h1><p>Your confidential board and administrator workspaces remain locked until this step is complete.</p><form className="login-form" onSubmit={submit}>
    <label htmlFor="current-password">Current temporary password</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
    <label htmlFor="new-password">New password</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={14} required aria-describedby="password-guidance" />
    <p id="password-guidance" className="field-help">Use at least 14 characters and avoid names, common phrases and previously used passwords.</p>
    <label htmlFor="confirmation">Confirm new password</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={14} required />
    <button className="button primary" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
  </form><p className="form-status" aria-live="polite">{status}</p><p className="security-note"><ShieldCheck aria-hidden="true" /> The replacement invalidates the bootstrap credential and every other active session.</p></section></main>;
}
