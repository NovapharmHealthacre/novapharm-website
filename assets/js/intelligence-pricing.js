/* NovaPharm Intelligence GBP plan comparison and protected account entry. No checkout, tracking, storage, or paid activation. */
(() => {
  "use strict";
  const section = document.getElementById("intelligence-pricing");
  if (!section) return;
  const toggles = Array.from(section.querySelectorAll("[data-npi-billing]"));
  const cards = Array.from(section.querySelectorAll("[data-npi-plan][data-monthly-gbp][data-annual-gbp]"));
  if (toggles.length !== 2 || cards.length !== 2) return;
  const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

  const render = (cycle) => {
    if (!["monthly", "annual"].includes(cycle)) return;
    for (const toggle of toggles) {
      const selected = toggle.getAttribute("data-npi-billing") === cycle;
      toggle.classList.toggle("is-selected", selected);
      toggle.setAttribute("aria-pressed", String(selected));
    }
    for (const card of cards) {
      const monthly = Number(card.getAttribute("data-monthly-gbp"));
      const annual = Number(card.getAttribute("data-annual-gbp"));
      const price = card.querySelector("[data-npi-plan-price]");
      const period = card.querySelector("[data-npi-plan-period]");
      const explanation = card.querySelector("[data-npi-plan-billing]");
      if (!price || !period || !explanation || !Number.isSafeInteger(monthly) || !Number.isSafeInteger(annual)) continue;
      price.textContent = money.format(cycle === "annual" ? Math.round(annual / 12) : monthly);
      period.textContent = cycle === "annual" ? "/ month equivalent" : "/ month";
      // Only toggle visibility of pre-approved, literal HTML links.
      const monthlyLink = card.querySelector('[data-npi-plan-cta="monthly"]');
      const annualLink = card.querySelector('[data-npi-plan-cta="annual"]');
      if (monthlyLink && annualLink) {
        const useAnnual = cycle === "annual";
        monthlyLink.hidden = useAnnual;
        annualLink.hidden = !useAnnual;
        // Inline-important visibility defeats stale CSS and Safari's cached
        // display:flex rules. The HTML still has a safe monthly-only fallback
        // when JavaScript does not run.
        monthlyLink.style.setProperty("display", useAnnual ? "none" : "flex", "important");
        annualLink.style.setProperty("display", useAnnual ? "flex" : "none", "important");
      }
      explanation.textContent = cycle === "annual"
        ? "Indicative annual equivalent: " + money.format(annual) + "/year, subject to contractual acceptance."
        : "Approved monthly price. No payment requested; enrolment is not yet open.";
    }
  };
  for (const toggle of toggles) {
    toggle.addEventListener("click", () => render(toggle.getAttribute("data-npi-billing")));
  }
  render("monthly");
})();
