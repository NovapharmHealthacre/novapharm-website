(() => {
  const navigator = document.querySelector("[data-cro-navigator]");
  if (navigator && "IntersectionObserver" in window) {
    const links = [...navigator.querySelectorAll("[data-cro-stage-link]")];
    const stages = [...navigator.querySelectorAll("[data-cro-stage]")];
    const status = navigator.querySelector("[data-cro-stage-status]");
    const setActive = (number, title) => {
      for (const link of links) {
        if (link.dataset.croStageLink === number) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      }
      if (status) status.textContent = `Stage ${number} of ${stages.length}: ${title}`;
    };
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const title = visible.target.querySelector("h3")?.textContent?.trim() || "Clinical development";
      setActive(visible.target.dataset.croStage, title);
    }, { rootMargin: "-22% 0px -58%", threshold: [0.1, 0.35, 0.7] });
    stages.forEach((stage) => observer.observe(stage));
  }

  const decision = document.querySelector("[data-cro-decision]");
  if (decision) {
    const buttons = [...decision.querySelectorAll("[data-cro-decision-item]")];
    const title = document.querySelector("[data-cro-decision-title]");
    const copy = document.querySelector("[data-cro-decision-copy]");
    buttons.forEach((button) => button.addEventListener("click", () => {
      buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      if (title) title.textContent = button.dataset.croOutputTitle || "Programme assessment";
      if (copy) copy.textContent = button.dataset.croOutputCopy || "Discuss the programme context before selecting a delivery model.";
    }));
  }
})();
