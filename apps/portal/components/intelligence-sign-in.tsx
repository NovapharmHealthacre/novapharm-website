"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import {
  beginCognitoCardSignIn,
  type CardAuthResult,
  completeCognitoCardSignIn,
  type TotpChallenge,
} from "../lib/cognito-card-auth";
import { parseVerifiedTrialView, type VerifiedTrialView } from "../lib/intelligence-trial-view";
import styles from "./intelligence-sign-in.module.css";
import { IntelligenceTrialOverview } from "./intelligence-trial-overview";

/**
 * Cognito handles credential verification and mandatory TOTP. A separate,
 * server-verified customer session controls every workspace permission.
 */
type ApprovedCustomer = Readonly<{
  role: "owner" | "admin" | "analyst" | "viewer";
  plan: "starter" | "professional" | "enterprise";
  trial: VerifiedTrialView | null;
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

async function readVerifiedSession(): Promise<ApprovedCustomer | null> {
  try {
    const response = await fetch("/customer/session", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return null;
    const result = body as Record<string, unknown>;
    if (result["ok"] !== true || result["code"] !== "active" ||
        !["starter", "professional", "enterprise"].includes(String(result["plan"])) ||
        !["owner", "admin", "analyst", "viewer"].includes(String(result["role"]))) return null;
    return {
      role: result["role"] as ApprovedCustomer["role"],
      plan: result["plan"] as ApprovedCustomer["plan"],
      trial: result["plan"] === "starter" ? parseVerifiedTrialView(result["trial"]) : null,
    };
  } catch {
    return null;
  }
}

export function IntelligenceSignIn() {
  const [customer, setCustomer] = useState<ApprovedCustomer | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<TotpChallenge | null>(null);
  const [phase, setPhase] = useState<"password" | "mfa" | "confirmed" | "managed" | "founder-unavailable">("password");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    void readVerifiedSession().then((session) => {
      if (mounted) setCustomer(session);
    });
    return () => { mounted = false; };
  }, []);

  async function completeProviderResult(result: CardAuthResult): Promise<void> {
    if (result.kind === "mfa") {
      setChallenge(result.challenge);
      setPhase("mfa");
      return;
    }
    if (result.kind === "provider-required") {
      setChallenge(null);
      setPhase("managed");
      return;
    }

    // Both Cognito tokens exist only in this closure after mandatory TOTP.
    // First try the independent founder-only exchange; no tenant, customer
    // subscription or medicines entitlement is granted by this route.
    try {
      const founder = await fetch("/auth/founder/exchange", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${result.idToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ accessToken: result.accessToken }),
      });
      if (founder.ok) {
        const granted: unknown = await founder.json();
        if (granted && typeof granted === "object" &&
            (granted as Record<string, unknown>)["ok"] === true &&
            (granted as Record<string, unknown>)["code"] === "founder_session_active" &&
            (granted as Record<string, unknown>)["scope"] === "founder-shell-read-only" &&
            (granted as Record<string, unknown>)["customerAccess"] === false &&
            (granted as Record<string, unknown>)["medicinesDataAccess"] === false) {
          window.location.assign("/founder");
          return;
        }
      }
    } catch {
      // Safe fall-through to the independently authorised customer-session gate.
    }
    try {
      const response = await fetch("/customer/session", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${result.idToken}`,
          Accept: "application/json",
        },
      });
      if (response.ok) {
        const session = await readVerifiedSession();
        if (session) {
          setCustomer(session);
          setChallenge(null);
          setPhase("confirmed");
          return;
        }
      }
    } catch {
      // Identity may be verified while the customer acceptance gate is closed.
    }
    // A verified founder identity is NOT an unapproved customer.
    // Keep the founder recovery path separate from the paid customer gate.
    if (email.trim().toLowerCase() === "vishal@novapharmhealthcare.com") {
      setChallenge(null);
      setPhase("founder-unavailable");
      return;
    }
    setChallenge(null);
    setPhase("confirmed");
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (phase === "mfa" && challenge) {
        const reply = await completeCognitoCardSignIn(challenge, code.trim());
        setCode("");
        await completeProviderResult(reply);
      } else {
        const reply = await beginCognitoCardSignIn(email, password);
        setPassword("");
        await completeProviderResult(reply);
      }
    } catch {
      setPassword("");
      setCode("");
      setError("We could not complete this sign-in. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

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
      if (response.ok) {
        setCustomer(null);
        setPhase("password");
        setChallenge(null);
      }
    } catch {
      // Do not claim that server revocation succeeded.
    } finally {
      setSigningOut(false);
    }
  }

  const reset = () => {
    setPassword("");
    setCode("");
    setChallenge(null);
    setPhase("password");
    setError("");
  };

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
          {customer ? (
            <button className={styles["headerAction"]} type="button" onClick={() => { void signOut(); }} disabled={signingOut}>
              {signingOut ? "Signing out" : "Sign out"}
            </button>
          ) : (
            <a className={styles["headerAction"]} href="#intelligence-signin-card-title">Sign in</a>
          )}
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
                <p className={styles["providerNote"]}>Medicines data and NOVA remain accessible only when source and permission gates are approved.</p>
                {customer.trial ? <IntelligenceTrialOverview trial={customer.trial} /> : null}
                <button className={styles["primaryAction"]} type="button" onClick={() => { void signOut(); }} disabled={signingOut}>
                  {signingOut ? "Signing out…" : "Sign out securely"}
                </button>
              </>
            ) : phase === "confirmed" ? (
              <div role="status" className={styles["identityStatus"]}>
                <p className={styles["successTitle"]}>Cognito sign-in completed.</p>
                <p>Your credentials and authenticator have been accepted. Medicines Terminal access still requires an approved organisation, customer seat and subscription.</p>
                <button className={styles["createAction"]} type="button" onClick={reset}>Return to sign-in</button>
              </div>
            ) : phase === "founder-unavailable" ? (
              <div role="status" className={styles["identityStatus"]}>
                <p className={styles["successTitle"]}>Secure founder sign-in completed.</p>
                <p>The founder workspace could not establish its independent secure session. This is not a request to purchase a customer subscription.</p>
                <a className={styles["primaryAction"]} href="/auth/customer/start">Continue with Cognito sign-in</a>
                <button className={styles["recoveryButton"]} type="button" onClick={reset}>Return to sign-in</button>
              </div>
            ) : phase === "managed" ? (
              <div className={styles["identityStatus"]}>
                <p>Additional account setup or a password change is required. Complete it directly with the secure identity provider.</p>
                <a className={styles["primaryAction"]} href="/auth/customer/start">Continue with Cognito</a>
                <button className={styles["recoveryButton"]} type="button" onClick={reset}>Back to sign-in</button>
              </div>
            ) : (
              <>
                <p className={phase === "mfa" ? styles["providerNote"] : styles["srOnly"]}>
                  {phase === "mfa" ? "Enter the six-digit code from your authenticator app." :
                    "Sign in with your business email and password. Authenticator verification follows."}
                </p>
                <form className={styles["signInForm"]} onSubmit={(event) => { void submitCredentials(event); }}>
                  {phase === "mfa" ? (
                    <>
                      <label className={styles["srOnly"]} htmlFor="npi-totp">Authenticator code</label>
                      <input
                        id="npi-totp" className={styles["field"]} type="text"
                        inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6}
                        autoComplete="one-time-code" value={code} required
                        onChange={(event) => setCode(event.target.value.replace(/\D/gu, "").slice(0, 6))}
                        placeholder="Six-digit authenticator code"
                        disabled={busy}
                      />
                      <button className={styles["primaryAction"]} type="submit" disabled={busy || code.length !== 6}>
                        {busy ? "Verifying…" : "Verify and sign in"}
                      </button>
                      <button className={styles["recoveryButton"]} type="button" onClick={reset}>Start again</button>
                    </>
                  ) : (
                    <>
                      <label className={styles["srOnly"]} htmlFor="npi-email">Business email</label>
                      <input
                        id="npi-email" className={styles["field"]} type="email"
                        name="username" autoComplete="username" required maxLength={254}
                        value={email} onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email" disabled={busy}
                      />
                      <div className={styles["passwordBox"]}>
                        <label className={styles["srOnly"]} htmlFor="npi-password">Password</label>
                        <input
                          id="npi-password" className={styles["field"]} name="password"
                          type={showPassword ? "text" : "password"} autoComplete="current-password"
                          required minLength={1} maxLength={1024} value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Password" disabled={busy}
                        />
                        <button type="button" className={styles["showPassword"]}
                          onClick={() => setShowPassword((previous) => !previous)}
                          aria-label={showPassword ? "Hide password" : "Show password"}>
                          <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.2 12s3.5-5.7 9.8-5.7 9.8 5.7 9.8 5.7-3.5 5.7-9.8 5.7S2.2 12 2.2 12Z" />
                            <circle cx="12" cy="12" r="2.8" />
                            {showPassword && <path d="m4 20 16-16" />}
                          </svg>
                        </button>
                      </div>
                      <button className={styles["primaryAction"]} type="submit" disabled={busy || !email || !password}>
                        {busy ? "Signing in…" : "Sign in"}
                      </button>
                    </>
                  )}
                  {error && <p className={styles["formError"]} role="alert">{error}</p>}
                </form>
                {phase === "password" && (
                  <>
                    <a className={styles["recoveryAction"]} href="/auth/customer/start?mode=reset">Forgot your password?</a>
                    <div className={styles["divider"]}><span>or</span></div>
                    <a className={styles["createAction"]} href="/auth/customer/register">Create a business account</a>
                  </>
                )}
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
