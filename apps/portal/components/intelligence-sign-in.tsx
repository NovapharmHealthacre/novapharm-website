"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./intelligence-sign-in.module.css";

/** Public presentation only. Cognito, verified sessions and entitlements remain server-owned. */
type ApprovedCustomer = Readonly<{
  role: "owner" | "admin" | "analyst" | "viewer";
  plan: "starter" | "professional" | "enterprise";
}>;

const publicSite = "https://novapharmhealthcare.com";
const navigation = [
  { label: "Platform", href: `${publicSite}/technology/#intelligence-platform` },
  { label: "Workspaces", href: `${publicSite}/technology/#intelligence-workspace-directory` },
  { label: "Data", href: `${publicSite}/technology/#intelligence-research` },
  { label: "Security", href: `${publicSite}/trust-centre/` },
  { label: "Pricing", href: `${publicSite}/technology/#intelligence-pricing` },
] as const;

function IntelligenceLogo({ small = false }: Readonly<{ small?: boolean }>) {
  return (
    <Image
      src="/assets/brand/novapharm-intelligence-approved.svg"
      alt="NovaPharm Intelligence"
      width={1950}
      height={337}
      priority
      className={small ? styles["logoInside"] : styles["logoHeader"]}
    />
  );
}

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
      // An unavailable customer API never grants access.
    });
    return () => { mounted = false; controller.abort(); };
  }, []);

  async function signOut(): Promise<void> {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch("/customer/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (response.ok) setCustomer(null);
    } catch {
      // Do not claim that server revocation succeeded.
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className={styles["page"]}>
      <div className={styles["portrait"]} aria-hidden="true" />
      <div className={styles["shell"]}>
        <header className={styles["header"]}>
          <a className={styles["brand"]} href="/" aria-label="NovaPharm Intelligence home">
            <IntelligenceLogo />
          </a>
          <nav className={styles["navigation"]} aria-label="NovaPharm Intelligence">
            {navigation.map(({ label, href }) => <a href={href} key={label}>{label}</a>)}
          </nav>
          <a className={styles["headerAction"]} href={customer ? "/customer/" : "/auth/customer/start"}>
            {customer ? "Workspace" : "Sign in"}
          </a>
        </header>

        <div className={styles["layout"]}>
          <section className={styles["intro"]} aria-labelledby="intelligence-signin-title">
            <p className={styles["eyebrow"]}>SECURE PORTAL</p>
            <h1 id="intelligence-signin-title">
              {customer ? <>Your Medicines Terminal.<span>Protected by evidence.</span></> :
                <>A more human<br />intelligence for <span>medicine.</span></>}
            </h1>
            <div className={styles["fineRule"]} aria-hidden="true" />
            <p className={styles["introDescription"]}>
              {customer ? "Your verified session is active. Data and workspaces remain governed by approved access rights." :
                "Understand the medicine. Understand the market."}
            </p>
          </section>

          <section className={styles["signInCard"]} aria-labelledby="intelligence-signin-card-title">
            <IntelligenceLogo small />
            <h2 id="intelligence-signin-card-title">{customer ? "Your secure workspace." : "Sign in to your secure workspace."}</h2>
            {customer ? (
              <>
                <p className={styles["sessionMessage"]}>Verified {customer.plan} subscription · {customer.role} seat.</p>
                <p className={styles["providerNote"]}>Medicines data and NOVA are accessible only when the corresponding source and permission gates are approved.</p>
                <button className={styles["primaryAction"]} type="button" onClick={() => { void signOut(); }} disabled={signingOut}>
                  {signingOut ? "Signing out…" : "Sign out securely"}
                </button>
              </>
            ) : (
              <>
                <p className={styles["providerNote"]}>Your business email, password and verification are handled by NovaPharm&apos;s secure identity provider.</p>
                <div className={styles["entryExplanation"]} aria-label="Secure sign-in steps">
                  <span>Business email</span>
                  <span>Password and verification</span>
                </div>
                <a className={styles["primaryAction"]} href="/auth/customer/start">Sign in securely</a>
                <a className={styles["recoveryAction"]} href="/auth/customer/start?mode=reset">Forgot your password?</a>
                <div className={styles["divider"]}><span>or</span></div>
                <a className={styles["createAction"]} href="/auth/customer/register">Create a business account</a>
              </>
            )}
          </section>
        </div>

        <footer className={styles["footer"]}>
          <span className={styles["purpose"]}>A more human intelligence for a healthier world.</span>
          <div className={styles["footerLinks"]}>
            <a href={`${publicSite}/technology/#intelligence-research`}>Official medicine sources</a>
            <a href={`${publicSite}/legal/privacy/`}>How we protect business account information</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
