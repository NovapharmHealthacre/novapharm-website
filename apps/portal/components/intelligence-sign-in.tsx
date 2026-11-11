"use client";

import { useEffect, useState } from "react";
import styles from "./intelligence-sign-in.module.css";
import { PortalBrand } from "./portal-brand";

/** Dedicated customer entry: never reuse the legacy password service. */
type ApprovedCustomer = Readonly<{ role: "owner" | "admin" | "analyst" | "viewer"; plan: "starter" | "professional" | "enterprise" }>;

export function IntelligenceSignIn() {
  const [customer, setCustomer] = useState<ApprovedCustomer | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    void fetch("/customer/session", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const body: unknown = await response.json();
      if (!body || typeof body !== "object") return;
      const result = body as Record<string, unknown>;
      if (result["ok"] !== true || result["code"] !== "active" ||
          !["starter", "professional", "enterprise"].includes(String(result["plan"])) ||
          !["owner", "admin", "analyst", "viewer"].includes(String(result["role"]))) return;
      if (mounted) setCustomer({
        role: result["role"] as ApprovedCustomer["role"],
        plan: result["plan"] as ApprovedCustomer["plan"],
      });
    }).catch(() => {
      // Customer API absent or unavailable: public login remains invitation only.
    });
    return () => { mounted = false; controller.abort(); };
  }, []);

  async function signOut(): Promise<void> {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await fetch("/customer/logout", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!result.ok) return;
      setCustomer(null);
    } catch {
      // Never claim revocation without server acknowledgement.
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <main className={styles["page"]}>
      <div className={styles["canvas"]}>
        <header className={styles["header"]}>
          <PortalBrand />
          <span>Medicines Terminal</span>
        </header>
        <section className={styles["hero"]} aria-labelledby="intelligence-signin-title">
          <p className={styles["eyebrow"]}>NovaPharm Intelligence</p>
          <h1 id="intelligence-signin-title">{customer ? "Your Medicines Terminal." : "Understand the medicine."}<span>{customer ? "Business account connected." : "Understand the market."}</span></h1>
          <p className={styles["description"]}>{customer ? "Your approved customer session is active. Access to medicines evidence, forecasts and NOVA remains subject to independently accepted data and feature rights." : "A professional workspace for connected medicines evidence, with access governed by your organisation."}</p>
          <div className={styles["actions"]}>
            {customer ? (
              <button className={styles["primary"]} type="button" onClick={() => { void signOut(); }} disabled={signingOut}>
                {signingOut ? "Signing out" : "Sign out securely"}
              </button>
            ) : (
              <>
                <a className={styles["primary"]} href="/auth/customer/register">Create a business account</a>
                <a className={styles["secondary"]} href="/auth/customer/start">Sign in</a>
              </>
            )}
            <a className={styles["secondary"]} href="https://novapharmhealthcare.com/technology/">Explore NovaPharm Intelligence</a>
          </div>
          <p className={styles["notice"]}>{customer ? `Verified ${customer.plan} subscription, ${customer.role} seat. Only accepted and licensed data will be released in the customer workspaces.` : "Create and verify a business identity with Cognito. Subscription checkout and medicines access become available only after organisation, contract, billing and dataset approvals."}</p>
          <p className={styles["notice"]}><a href="https://novapharmhealthcare.com/legal/privacy/" target="_blank" rel="noopener noreferrer">How we protect business account information</a></p>
        </section>
        <footer className={styles["footer"]}><span>Medicine. Where it needs to be.</span><span>Protected professional access</span></footer>
      </div>
    </main>
  );
}
