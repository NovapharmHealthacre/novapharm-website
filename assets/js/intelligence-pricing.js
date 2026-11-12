/* NovaPharm Intelligence plan comparison. UI-only: no checkout, tracking, storage or paid activation. */
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
      explanation.textContent = cycle === "annual"
        ? "Proposed annual commitment: " + money.format(annual) + "/year, billed annually after signed acceptance."
        : "Proposed monthly price. No payment requested.";
    }
  };
  for (const toggle of toggles) {
    toggle.addEventListener("click", () => render(toggle.getAttribute("data-npi-billing")));
  }
  render("monthly");
})();
