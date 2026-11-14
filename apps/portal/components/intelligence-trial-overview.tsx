"use client";

import type { VerifiedTrialView } from "../lib/intelligence-trial-view";
import styles from "./intelligence-sign-in.module.css";

/** Renders ONLY an already server-verified trial attached to an active session. */
export function IntelligenceTrialOverview({
  trial,
}: Readonly<{ trial: VerifiedTrialView }>) {
  const searchesUsed = trial.searchLimit - trial.remainingSearches;
  const expiry = new Date(trial.trialEndsAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  return (
    <section className={styles["trialOverview"]} aria-label="Your free trial">
      <p className={styles["trialEyebrow"]}>STARTER FREE TRIAL</p>
      <h3>{trial.remainingSearches} of {trial.searchLimit} searches remaining</h3>
      <progress
        aria-label="Governed searches used during this trial"
        value={searchesUsed}
        max={trial.searchLimit}
      />
      <p>Trial ends {expiry}. Unused searches do not roll over.</p>
      <p>No payment is collected automatically. Your trial ends unless you explicitly choose a paid subscription.</p>
      <a
        className={styles["trialCompareLink"]}
        href="https://novapharmhealthcare.com/technology/#intelligence-pricing"
      >
        Compare subscription plans
      </a>
    </section>
  );
}
