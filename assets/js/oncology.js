const navigatorElement = document.querySelector("[data-formulation-navigator]");

if (navigatorElement) {
  const tabs = [...navigatorElement.querySelectorAll("[data-formulation-tab]")];
  const panels = [...navigatorElement.querySelectorAll("[data-formulation-panel]")];
  navigatorElement.dataset.enhanced = "true";

  const activate = (tab, focus = false) => {
    const id = tab.dataset.formulationTab;
    tabs.forEach((candidate) => {
      const active = candidate === tab;
      candidate.setAttribute("aria-selected", String(active));
      candidate.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.formulationPanel !== id;
    });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index - 1 + tabs.length) % tabs.length;
      if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      activate(tabs[next], true);
    });
  });

  activate(tabs[0]);
}
