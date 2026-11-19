/* NovaPharm Intelligence public workspace journey.
   Navigation is an editorial preview only, never a customer entitlement. */
(() => {
  "use strict";
  const root = document.querySelector("[data-npi-journey]");
  if (!root) return;
  const steps = Array.from(root.querySelectorAll("[data-npi-journey-step]"));
  const markers = Array.from(root.querySelectorAll("[data-npi-journey-marker]"));
  const prev = root.querySelector("[data-npi-journey-prev]");
  const next = root.querySelector("[data-npi-journey-next]");
  const start = root.querySelector("[data-npi-journey-start]");
  const title = root.querySelector("[data-npi-journey-title]");
  const description = root.querySelector("[data-npi-journey-description]");
  const counter = root.querySelector("[data-npi-journey-status]");
  const stageDetails = [
    ["Medicine identity", "Unify medicine identities, aliases and regulatory codes, with unresolved matches clearly flagged."],
    ["Evidence & regulation", "Review licences, scientific evidence, regulatory context and source dates before drawing conclusions."],
    ["Market & geography", "Explore observed demand and geographical variation while keeping estimates separate from recorded facts."],
    ["Forecasts & signals", "Explore explainable forecasts, assumptions and monitoring signals, only where accepted evidence supports them."],
    ["Supply, pricing & tenders", "Investigate procurement, pricing, sourcing and tender context with source-specific permissions."],
    ["Biotech & capital", "Follow clinical programmes, assets, company developments and capital context as research leads."],
    ["Portfolio & decisions", "Bring together evidence, assumptions and alternatives for accountable human decisions."],
    ["Reports & integrations", "Prepare governed outputs and future integrations that preserve traceability and permissions."]
  ];
  if (steps.length !== stageDetails.length || !prev || !next || !title || !description || !counter) return;

  let active = 0;
  function selectStage(index, focus = false) {
    active = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((step, i) => {
      const chosen = i === active;
      step.classList.toggle("is-active", chosen);
      step.setAttribute("aria-pressed", String(chosen));
    });
    markers.forEach((marker, i) => {
      marker.classList.toggle("is-active", i === active);
    });
    title.textContent = stageDetails[active][0];
    description.textContent = stageDetails[active][1];
    counter.textContent = String(active + 1).padStart(2, "0") + " / " + String(steps.length).padStart(2, "0");
    root.dataset.activeStage = String(active + 1);
    prev.disabled = active === 0;
    next.disabled = active === steps.length - 1;
    if (focus) {
      steps[active].focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 900px)").matches) {
        steps[active].scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", inline: "center", block: "nearest" });
      }
    }
  }
  steps.forEach((step, i) => {
    step.addEventListener("click", () => selectStage(i));
    step.addEventListener("keydown", event => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        selectStage(Math.min(i + 1, steps.length - 1), true);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        selectStage(Math.max(i - 1, 0), true);
      } else if (event.key === "Home") {
        event.preventDefault();
        selectStage(0, true);
      } else if (event.key === "End") {
        event.preventDefault();
        selectStage(steps.length - 1, true);
      }
    });
  });
  prev.addEventListener("click", () => selectStage(active - 1, true));
  next.addEventListener("click", () => selectStage(active + 1, true));
  if (start) start.addEventListener("click", () => {
    selectStage(0, true);
    root.querySelector(".npi-journey-stages")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center"
    });
  });
  selectStage(0);
})();
