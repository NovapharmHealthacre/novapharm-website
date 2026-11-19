// Minimal, lazy NovaPharm public evidence-search entrypoint.
// No model download, tracking or server AI request occurs until a user chooses a task.
(() => {
  let controllerPromise = null;
  let opening = false;

  function initialise() {
    const dialog = document.querySelector("[data-ai-search-dialog]");
    if (!dialog) return;

    async function openSearch(trigger) {
      if (opening || dialog.open) return;
      opening = true;
      try {
        controllerPromise ||= import("/assets/ai/runtime/search-controller.mjs")
          .catch((error) => {
            controllerPromise = null;
            throw error;
          });
        const { initialiseSearchDialog } = await controllerPromise;
        await initialiseSearchDialog(dialog);
        dialog.dispatchEvent(new CustomEvent("ai:open", { detail: { trigger } }));
      } catch {
        // Preserve a real no-model search directory when optional JS is unavailable.
        window.location.assign("/search/");
      } finally {
        opening = false;
      }
    }

    document.addEventListener("click", (event) => {
      const trigger = event.target instanceof Element
        ? event.target.closest("[data-ai-search-open]")
        : null;
      if (!trigger) return;
      event.preventDefault();
      void openSearch(trigger);
    });
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey &&
          !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        void openSearch(document.activeElement);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
