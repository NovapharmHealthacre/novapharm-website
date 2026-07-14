(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  body.classList.add("visual-refinement-ready");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector(".hero-flagship");
  const motionToggle = document.querySelector("[data-motion-toggle]");
  const preferenceKey = "novapharm_visual_motion";

  function readMotionPreference() {
    try {
      return window.sessionStorage.getItem(preferenceKey);
    } catch {
      return null;
    }
  }

  function writeMotionPreference(value) {
    try {
      window.sessionStorage.setItem(preferenceKey, value);
    } catch {
      // Session storage is an enhancement only.
    }
  }

  function setMotionPaused(paused, persist = false) {
    if (!hero) return;
    hero.dataset.motionPaused = paused ? "true" : "false";
    if (motionToggle) {
      motionToggle.setAttribute("aria-pressed", paused ? "true" : "false");
      motionToggle.textContent = paused ? "Play motion" : "Pause motion";
    }
    if (persist) writeMotionPreference(paused ? "paused" : "playing");
  }

  if (hero) {
    const storedPreference = readMotionPreference();
    const shouldPause = reducedMotion.matches || storedPreference === "paused";
    setMotionPaused(shouldPause);

    if (motionToggle) {
      motionToggle.addEventListener("click", () => {
        const paused = hero.dataset.motionPaused === "true";
        setMotionPaused(!paused, true);
      });
    }

    reducedMotion.addEventListener?.("change", (event) => {
      if (event.matches) setMotionPaused(true);
    });

    let animationFrame = 0;
    hero.addEventListener("pointermove", (event) => {
      if (reducedMotion.matches || hero.dataset.motionPaused === "true") return;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * -12;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -8;
        root.style.setProperty("--hero-x", `${x.toFixed(2)}px`);
        root.style.setProperty("--hero-y", `${y.toFixed(2)}px`);
      });
    });

    hero.addEventListener("pointerleave", () => {
      root.style.setProperty("--hero-x", "0px");
      root.style.setProperty("--hero-y", "0px");
    });
  }

  const serviceImages = Object.freeze({
    "trading-distribution": "/assets/media/products/hospital-supply-logistics.jpg",
    "plpi-strategy": "/assets/media/products/licensed-generics-packaging.jpg",
    "european-sourcing": "/assets/media/products/specialty-pharmacy-handling.jpg",
    "gmp-partnerships": "/assets/media/products/respiratory-manufacturing.jpg",
    "quality-pv": "/assets/media/products/cardiovascular-quality-control.jpg",
    logistics: "/assets/media/products/hospital-supply-logistics.jpg",
    "digital-b2b": "/assets/media/products/metabolic-laboratory-analysis.jpg",
    "market-access": "/assets/media/products/oncology-vial-handling.jpg"
  });

  for (const [id, image] of Object.entries(serviceImages)) {
    const service = document.getElementById(id);
    if (!service) continue;
    service.classList.add("visual-service-card");
    service.style.setProperty("--service-image", `url("${image}")`);
  }

  const revealTargets = document.querySelectorAll(
    ".regulatory-roadmap li, .partner-ecosystem-card, .service-detail, .technology-proof-grid span, .services-media-gallery figure"
  );
  revealTargets.forEach((target) => target.setAttribute("data-visual-reveal", ""));

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 }
  );

  revealTargets.forEach((target) => observer.observe(target));
})();
