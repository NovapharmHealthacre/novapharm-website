import Link from "next/link";
import {
  intelligencePaidPlans,
  intelligencePricingLaunchNotice,
  intelligenceTrialOffer,
} from "../data/intelligence-pricing";
import styles from "./intelligence-pricing.module.css";

function SterlingPrice({ amount, from = false }: Readonly<{ amount: number; from?: boolean }>) {
  return (
    <div className={styles.price}>
      {from ? <span className={styles.pricePrefix}>From</span> : null}
      <strong>£{amount.toLocaleString("en-GB")}</strong>
      <span className={styles.pricePeriod}>/ month</span>
    </div>
  );
}

export function IntelligencePricing() {
  return (
    <section className={styles.section} id="intelligence-pricing" aria-labelledby="intelligence-pricing-title">
      <div className="shell">
        <div className={styles.header}>
          <p className={styles.kicker}>NovaPharm Intelligence / Plans</p>
          <h2 id="intelligence-pricing-title">Intelligence, on your terms.</h2>
          <p className={styles.lede}>
            Start with a card-free trial when enrolment opens. Move to a paid plan
            only when you choose to subscribe.
          </p>
        </div>

        <div className={styles.plans}>
          <article className={`${styles.plan} ${styles.trial}`}>
            <p className={styles.eyebrow}>INTRODUCTORY OFFER</p>
            <h3>{intelligenceTrialOffer.label}</h3>
            <div className={styles.trialPrice}>
              <strong>£0</strong>
              <span>for {intelligenceTrialOffer.durationDays} days</span>
            </div>
            <p className={styles.description}>Explore the approved Starter experience with no payment card or automatic paid conversion.</p>
            <ul className={styles.features}>
              <li>{intelligenceTrialOffer.totalSearches} governed medicine searches in total</li>
              <li>One trial per verified organisation</li>
              <li>No credit card required</li>
              <li>No automatic charges when the trial ends</li>
            </ul>
            <p className={styles.planStatus}>Trial enrolment opening after production approval</p>
          </article>

          {intelligencePaidPlans.map((plan) => (
            <article className={styles.plan} key={plan.code}>
              <p className={styles.eyebrow}>MONTHLY SUBSCRIPTION</p>
              <h3>{plan.label}</h3>
              <SterlingPrice amount={plan.monthlyPriceGBP} from={plan.startingAt} />
              <p className={styles.description}>{plan.description}</p>
              <div className={styles.planFootnote}>{plan.accessNote}</div>
            </article>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.availability}>
            <strong>Availability</strong>
            <p>{intelligencePricingLaunchNotice}</p>
            <p>All prices are shown in GBP, excluding any applicable tax. No automatic subscription follows the free trial.</p>
          </div>
          <div className={styles.actions}>
            <Link href="/contact/?enquiry=NovaPharm%20Intelligence" className={styles.contactLink}>Discuss access</Link>
            <Link href="https://intelligence.novapharmhealthcare.com/" className={styles.portalLink}>Existing authorised users: sign in</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
