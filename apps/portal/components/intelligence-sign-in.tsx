import styles from "./intelligence-sign-in.module.css";
import { PortalBrand } from "./portal-brand";

/** Dedicated customer entry: never reuse the legacy password service. */
export function IntelligenceSignIn() {
  return (
    <main className={styles["page"]}>
      <div className={styles["canvas"]}>
        <header className={styles["header"]}>
          <PortalBrand />
          <span>Medicines Terminal</span>
        </header>
        <section className={styles["hero"]} aria-labelledby="intelligence-signin-title">
          <p className={styles["eyebrow"]}>NovaPharm Intelligence</p>
          <h1 id="intelligence-signin-title">Understand the medicine.<span>Understand the market.</span></h1>
          <p className={styles["description"]}>A professional workspace for connected medicines evidence, with access governed by your organisation.</p>
          <div className={styles["actions"]}>
            <a className={styles["primary"]} href="/auth/customer/start">Sign in with your business account</a>
            <a className={styles["secondary"]} href="https://novapharmhealthcare.com/technology/">Explore NovaPharm Intelligence</a>
          </div>
          <p className={styles["notice"]}>Invitation-only access. Sign-in verifies identity; access to research, data and subscriptions requires separate account activation.</p>
        </section>
        <footer className={styles["footer"]}><span>Medicine. Where it needs to be.</span><span>Protected professional access</span></footer>
      </div>
    </main>
  );
}
