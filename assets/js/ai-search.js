let controllerPromise;

async function openSearch(trigger) {
  const dialog = document.querySelector("[data-ai-search-dialog]");
  if (!dialog || typeof dialog.showModal !== "function") {
    window.location.href = "/search/";
    return;
  }
  controllerPromise ||= import("/assets/ai/runtime/search-controller.mjs");
  const controller = await controllerPromise;
  await controller.initialiseSearchDialog(dialog);
  dialog.dispatchEvent(new CustomEvent("ai:open", { detail: { trigger } }));
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-ai-search-open]");
  if (!trigger) return;
  event.preventDefault();
  openSearch(trigger).catch(() => { window.location.href = "/search/"; });
});

document.addEventListener("keydown", (event) => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
  event.preventDefault();
  openSearch(document.activeElement).catch(() => { window.location.href = "/search/"; });
});
