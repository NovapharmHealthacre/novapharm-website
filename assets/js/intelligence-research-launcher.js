/* NovaPharm Intelligence: public research entry, not a clinical or authenticated data API.
   The browser only prepares verified official-source links after deliberate user submission.
   No tracking, storage, credential access or automatic external request. */
(() => {
  "use strict";
  const root = document.querySelector("[data-npi-research]");
  if (!root) return;

  const form = root.querySelector("[data-npi-research-form]");
  const queryInput = root.querySelector("[data-npi-query]");
  const marketInput = root.querySelector("[data-npi-market]");
  const focusInput = root.querySelector("[data-npi-focus]");
  const results = root.querySelector("[data-npi-results]");
  const list = root.querySelector("[data-npi-results-list]");
  const status = root.querySelector("[data-npi-research-status]");
  if (!form || !queryInput || !marketInput || !focusInput || !results || !list || !status) return;

  // Approved starting destinations; not a claim of licensed data ingestion or API integration.
  // searchParam is used only where the provider's public search URL is known.
  const sources = Object.freeze([
    { name: "PubMed", authority: "U.S. National Library of Medicine", markets: ["ALL"], focuses: ["evidence"], url: "https://pubmed.ncbi.nlm.nih.gov/", searchParam: "term", description: "Biomedical publication index. Verify study design and publication details." },
    { name: "ClinicalTrials.gov", authority: "U.S. National Library of Medicine", markets: ["ALL"], focuses: ["trials"], url: "https://clinicaltrials.gov/search", searchParam: "term", description: "Registered trials and published registry results; not evidence of clinical efficacy." },
    { name: "MHRA Products", authority: "UK Medicines and Healthcare products Regulatory Agency", markets: ["GB"], focuses: ["identity", "regulatory"], url: "https://products.mhra.gov.uk/", description: "Review UK product information and authorisation details at the official source." },
    { name: "NHSBSA English prescribing data", authority: "NHS Business Services Authority", markets: ["GB"], focuses: ["market"], url: "https://www.nhsbsa.nhs.uk/prescription-data/prescribing-data/english-prescribing-data-epd", description: "Published England prescribing activity; does not represent NovaPharm sales." },
    { name: "NICE guidance", authority: "National Institute for Health and Care Excellence", markets: ["GB"], focuses: ["evidence", "regulatory"], url: "https://www.nice.org.uk/guidance", description: "Published UK guidance; commercial reuse and AI rights require separate approval." },
    { name: "DailyMed", authority: "U.S. National Library of Medicine", markets: ["US"], focuses: ["identity", "regulatory"], url: "https://dailymed.nlm.nih.gov/dailymed/", description: "Current U.S. product labelling and structured product information." },
    { name: "Drugs@FDA", authority: "U.S. Food and Drug Administration", markets: ["US"], focuses: ["regulatory"], url: "https://www.accessdata.fda.gov/scripts/cder/daf/", description: "Official U.S. application and regulatory information." },
    { name: "EMA medicines", authority: "European Medicines Agency", markets: ["EU"], focuses: ["identity", "regulatory"], url: "https://www.ema.europa.eu/en/medicines", description: "EU centralised medicine information; national authorisations need national sources." },
    { name: "CDSCO", authority: "Central Drugs Standard Control Organization", markets: ["IN"], focuses: ["identity", "regulatory"], url: "https://cdsco.gov.in/opencms/opencms/en/Home/", description: "Indian national regulator; product coverage varies by approval pathway." },
    { name: "CTRI", authority: "Clinical Trials Registry - India", markets: ["IN"], focuses: ["trials"], url: "https://ctri.nic.in/Clinicaltrials/advancesearchmain.php", description: "Indian clinical-trial registry; search within the official site." },
    { name: "Health Canada Drug Product Database", authority: "Health Canada", markets: ["CA"], focuses: ["identity", "regulatory"], url: "https://health-products.canada.ca/dpd-bdpp/search?lang=eng", description: "Canadian product authorisation and information records." },
    { name: "TGA Australian Register of Therapeutic Goods", authority: "Therapeutic Goods Administration", markets: ["AU"], focuses: ["identity", "regulatory"], url: "https://www.tga.gov.au/resources/artg", description: "Australian therapeutic goods registration and listing information." }
  ]);

  const allowedMarkets = new Set(["GB", "US", "EU", "IN", "CA", "AU", "ALL"]);
  const allowedFocuses = new Set(["identity", "evidence", "regulatory", "trials", "market"]);

  // A changed query or selection invalidates previously prepared source links.
  // This also covers native form validation blocking a subsequent submit event.
  for (const field of [queryInput, marketInput, focusInput]) {
    for (const eventName of ["input", "change"]) {
      field.addEventListener(eventName, () => {
        results.hidden = true;
        list.replaceChildren();
        status.textContent = "Selection changed. Choose Find official sources to update results.";
      });
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const medicine = String(queryInput.value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
    const market = String(marketInput.value || "");
    const focus = String(focusInput.value || "");
    list.replaceChildren();
    results.hidden = true;

    if (medicine.length < 2 || medicine.length > 120) {
      status.textContent = "Enter a medicine or substance between 2 and 120 characters.";
      queryInput.focus();
      return;
    }
    if (!allowedMarkets.has(market) || !allowedFocuses.has(focus)) {
      status.textContent = "Choose a valid market and research area.";
      return;
    }

    const matches = sources.filter((source) =>
      source.focuses.includes(focus) && (source.markets.includes(market) || source.markets.includes("ALL"))
    );
    if (!matches.length) {
      status.textContent = "No source is configured for this combination. This does not mean the medicine or evidence is absent.";
      return;
    }

    for (const source of matches) {
      const destination = new URL(source.url);
      if (source.searchParam) destination.searchParams.set(source.searchParam, medicine);
      const item = document.createElement("li");
      item.className = "npi-research-result";
      const heading = document.createElement("div");
      heading.className = "npi-research-result-top";
      const title = document.createElement("strong");
      title.textContent = source.name;
      const provider = document.createElement("span");
      provider.textContent = source.authority;
      heading.append(title, provider);
      const description = document.createElement("p");
      description.textContent = source.description;
      const link = document.createElement("a");
      link.href = destination.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.searchParam ? "Search official source" : "Open official source";
      link.setAttribute("aria-label", link.textContent + ": " + source.name);
      item.append(heading, description, link);
      list.append(item);
    }
    results.hidden = false;
    status.textContent = matches.length + " official " + (matches.length === 1 ? "destination" : "destinations") + " prepared for " + medicine + ". Nothing has been sent to an external provider.";
  });
})();
