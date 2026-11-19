/* Public official-source lookup enhancement.
 * US label/registry data only; no customer login, NOVA or commercial analytics.
 * Safe DOM text rendering, fixed provider URL allowlist, no cookies or storage.
 */
(() => {
  "use strict";
  const root = document.querySelector("[data-npi-research]");
  if (!root) return;
  const form = root.querySelector("[data-npi-research-form]");
  const medicineInput = root.querySelector("[data-npi-query]");
  const marketInput = root.querySelector("[data-npi-market]");
  const focusInput = root.querySelector("[data-npi-focus]");
  const results = root.querySelector("[data-npi-results]");
  const list = root.querySelector("[data-npi-results-list]");
  const status = root.querySelector("[data-npi-research-status]");
  if (!form || !medicineInput || !marketInput || !focusInput || !results || !list || !status) return;

  const endpoint = "https://5pcszvyqm1.execute-api.eu-north-1.amazonaws.com/intelligence/public/research";
  const approvedOrigins = new Set(["https://clinicaltrials.gov", "https://dailymed.nlm.nih.gov"]);
  let generation = 0;
  let inflight = null;

  const invalidate = () => {
    generation++;
    if (inflight) inflight.abort();
    inflight = null;
  };
  for (const field of [medicineInput, marketInput, focusInput]) {
    field.addEventListener("input", invalidate);
    field.addEventListener("change", invalidate);
  }

  function recordLink(value) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && approvedOrigins.has(url.origin) && !url.username && !url.password) return url;
    } catch { /* Ignore publisher record without approved link. */ }
    return null;
  }

  function appendOfficialRecord(record, publisher) {
    if (!record || typeof record.title !== "string" || record.title.length < 1 || record.title.length > 180) return false;
    const url = recordLink(record.sourceUrl);
    if (!url) return false;
    const item = document.createElement("li");
    item.className = "npi-research-result npi-live-research-result";
    const head = document.createElement("div");
    head.className = "npi-research-result-top";
    const title = document.createElement("strong");
    title.textContent = record.title;
    const authority = document.createElement("span");
    authority.textContent = "LIVE OFFICIAL RECORD · " + publisher;
    head.append(title, authority);
    const summary = document.createElement("p");
    const details = [
      typeof record.subtitle === "string" ? record.subtitle.slice(0, 160) : "",
      typeof record.updated === "string" && /^\d{4}(?:-?\d{2}){0,2}$/.test(record.updated) ? "Recorded date: " + record.updated : "",
    ].filter(Boolean);
    summary.textContent = details.join(" · ") || "Review the full source record and its date.";
    const link = document.createElement("a");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View official record";
    item.append(head, summary, link);
    list.prepend(item);
    return true;
  }

  form.addEventListener("submit", async () => {
    invalidate();
    const sequence = generation;
    const medicine = String(medicineInput.value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
    const market = String(marketInput.value || "");
    const focus = String(focusInput.value || "");
    const provider = focus === "trials" ? "trials" : focus === "regulatory" ? "fda" : null;
    if (!provider || !["US", "ALL"].includes(market) ||
        !/^[A-Za-z0-9][A-Za-z0-9 .-]{1,79}$/.test(medicine)) return;

    const controller = new AbortController();
    inflight = controller;
    status.textContent = "Checking live official records for " + medicine + "…";
    try {
      const url = new URL(endpoint);
      url.searchParams.set("medicine", medicine);
      url.searchParams.set("source", provider);
      const response = await fetch(url, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      if (sequence !== generation) return;
      if (!response.ok) throw new Error("Official source did not respond.");
      const data = await response.json();
      if (sequence !== generation || data?.source !== provider || !Array.isArray(data.results)) throw new Error("Source response invalid.");
      let count = 0;
      for (const record of data.results.slice(0, 5)) if (appendOfficialRecord(record, data.publisher || "Official publisher")) count++;
      results.hidden = false;
      status.textContent = count
        ? count + " live official " + (count === 1 ? "record" : "records") + " found for " + medicine + ". Verify the publication and source before using them."
        : "No live records were returned for " + medicine + ". This does not mean the medicine or evidence is absent. Official source links remain available.";
    } catch {
      if (sequence !== generation) return;
      status.textContent = "Live official lookup is temporarily unavailable. You can still use the official source links shown below.";
    } finally {
      if (sequence === generation) inflight = null;
    }
  });
})();
