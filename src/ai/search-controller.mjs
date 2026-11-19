import { buildExtractiveAnswer, resolveCitations } from "./citation-resolver.mjs";
import { searchKeywordIndex } from "./keyword-index.mjs";
import { tokenize } from "./model-registry.mjs";
import { ABSTENTION, evaluatePublicPolicy } from "./policy-engine.mjs";

const INDEX_URL = "/assets/ai/company-knowledge-index.json";
const MANIFEST_URL = "/assets/ai/company-source-manifest.json";

let knowledgePromise;
let manifestPromise;

async function fetchJson(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("evidence_unavailable");
  return response.json();
}

function knowledgeIndex() {
  knowledgePromise ||= fetchJson(INDEX_URL).catch((error) => {
    knowledgePromise = null;
    throw error;
  });
  return knowledgePromise;
}

function sourceManifest() {
  manifestPromise ||= fetchJson(MANIFEST_URL).catch((error) => {
    manifestPromise = null;
    throw error;
  });
  return manifestPromise;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "a small local asset";
  if (bytes < 1024) return `${bytes} bytes`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function mergeResults(primary, secondary, limit = 8) {
  const merged = new Map();
  for (const result of [...primary, ...secondary]) {
    const existing = merged.get(result.id);
    if (!existing || result.score > existing.score) merged.set(result.id, result);
  }
  return [...merged.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}

function createSourceCard(citation) {
  const item = document.createElement("article");
  item.className = "ai-source-card";
  const heading = document.createElement("h3");
  const link = document.createElement("a");
  link.href = citation.url;
  link.textContent = citation.title;
  link.dataset.aiSourceLink = "true";
  heading.append(link);
  const location = document.createElement("p");
  location.className = "ai-source-location";
  location.textContent = citation.heading;
  const passage = document.createElement("blockquote");
  passage.textContent = citation.passage;
  const meta = document.createElement("p");
  meta.className = "ai-source-meta";
  meta.textContent = [citation.evidenceStatus, citation.date || null].filter(Boolean).join(" · ");
  item.append(heading, location, passage, meta);
  return item;
}

function createSearchResult(result) {
  const item = document.createElement("article");
  item.className = "ai-search-result";
  const heading = document.createElement("h3");
  const link = document.createElement("a");
  link.href = result.sourceUrl;
  link.textContent = result.heading === result.sourceTitle ? result.sourceTitle : `${result.sourceTitle}: ${result.heading}`;
  heading.append(link);
  const text = document.createElement("p");
  text.textContent = result.text.length > 260 ? `${result.text.slice(0, 257).trim()}...` : result.text;
  item.append(heading, text);
  return item;
}

export async function initialiseSearchDialog(dialog) {
  if (dialog.dataset.initialised === "true") return;
  dialog.dataset.initialised = "true";
  const form = dialog.querySelector("[data-ai-search-form]");
  const input = dialog.querySelector("[data-ai-search-input]");
  const status = dialog.querySelector("[data-ai-status]");
  const results = dialog.querySelector("[data-ai-results]");
  const modeButtons = [...dialog.querySelectorAll("[data-ai-mode]")];
  const semanticEnable = dialog.querySelector("[data-ai-semantic-enable]");
  const semanticCancel = dialog.querySelector("[data-ai-semantic-cancel]");
  const cacheClear = dialog.querySelector("[data-ai-cache-clear]");
  const progress = dialog.querySelector("[data-ai-progress]");
  const progressLabel = dialog.querySelector("[data-ai-progress-label]");
  const disclosureSize = dialog.querySelector("[data-ai-model-size]");
  const copyButton = dialog.querySelector("[data-ai-copy]");
  let mode = "search";
  let semanticReady = false;
  let worker = null;
  let currentAnswer = "";
  let semanticRequest = null;
  let previousFocus = null;
  let persistentCacheAvailable = typeof indexedDB !== "undefined";
  cacheClear.hidden = !persistentCacheAvailable;
  let queryVersion = 0;
  let semanticGeneration = 0;

  const announce = (message) => {
    status.textContent = message;
  };

  const renderMessage = (message, kind = "information") => {
    results.replaceChildren();
    const panel = document.createElement("div");
    panel.className = `ai-answer ai-answer-${kind}`;
    const heading = document.createElement("h2");
    heading.textContent = kind === "refusal" ? "Safety boundary" : kind === "abstention" ? "Evidence not found" : "Search status";
    const text = document.createElement("p");
    text.textContent = message;
    panel.append(heading, text);
    results.append(panel);
    currentAnswer = message;
    copyButton.hidden = false;
  };

  const renderSearchResults = (items) => {
    results.replaceChildren();
    if (!items.length) return renderMessage(ABSTENTION, "abstention");
    const heading = document.createElement("h2");
    heading.textContent = `Website results (${items.length})`;
    const list = document.createElement("div");
    list.className = "ai-search-results-list";
    items.forEach((item) => list.append(createSearchResult(item)));
    results.append(heading, list);
    copyButton.hidden = true;
    announce(`${items.length} website results found.`);
  };

  const renderAnswer = (items, query) => {
    const citations = resolveCitations(items, tokenize(query));
    const answer = buildExtractiveAnswer(citations);
    if (!answer) return renderMessage(ABSTENTION, "abstention");
    results.replaceChildren();
    const answerPanel = document.createElement("section");
    answerPanel.className = "ai-answer";
    const heading = document.createElement("h2");
    heading.textContent = "Answer from published evidence";
    const text = document.createElement("p");
    text.textContent = answer;
    const boundary = document.createElement("p");
    boundary.className = "ai-answer-boundary";
    boundary.textContent = citations[0].capabilityBoundary;
    const evidence = document.createElement("p");
    evidence.className = "ai-answer-evidence";
    evidence.textContent = `Evidence status: ${citations[0].evidenceStatus}. ${semanticReady ? "Private on-device semantic retrieval enabled." : "Conventional evidence retrieval."}`;
    answerPanel.append(heading, text, boundary, evidence);
    const sourceHeading = document.createElement("h2");
    sourceHeading.textContent = "Supporting sources";
    const sourceList = document.createElement("div");
    sourceList.className = "ai-source-list";
    citations.forEach((citation) => sourceList.append(createSourceCard(citation)));
    results.append(answerPanel, sourceHeading, sourceList);
    currentAnswer = `${answer}\n\nSources:\n${citations.map((citation) => `${citation.title} - ${citation.url}`).join("\n")}`;
    copyButton.hidden = false;
    announce(`Answer supported by ${citations.length} published source${citations.length === 1 ? "" : "s"}.`);
  };

  const semanticSearch = (query) => new Promise((resolve, reject) => {
    if (!worker || !semanticReady) return resolve([]);
    const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    if (semanticRequest) semanticRequest.resolve([]);
    semanticRequest = { requestId, resolve, reject };
    worker.postMessage({ type: "search", requestId, query, limit: 8 });
    setTimeout(() => {
      if (semanticRequest?.requestId !== requestId) return;
      semanticRequest = null;
      resolve([]);
    }, 5000);
  });

  const runSearch = async (query) => {
    const version = ++queryVersion;
    results.removeAttribute("aria-busy");
    const isCurrent = () => version === queryVersion && dialog.open;
    if (!query) return renderMessage("Enter a question or search term.");
    // Check sensitive AI requests before loading or ranking any source material.
    if (mode !== "search") {
      const policy = evaluatePublicPolicy(query);
      if (!policy.allowed) return renderMessage(policy.message, policy.category === "empty" ? "information" : "refusal");
    }
    announce(mode === "search" ? "Searching published pages..." : "Checking approved published evidence...");
    results.setAttribute("aria-busy", "true");
    try {
      const knowledge = await knowledgeIndex();
      if (!isCurrent()) return;
      const keywordResults = searchKeywordIndex(knowledge.keywordIndex, knowledge.chunks, query);
      if (mode === "search") return renderSearchResults(keywordResults);
      const semanticResults = semanticReady ? await semanticSearch(query) : [];
      if (!isCurrent()) return;
      renderAnswer(mergeResults(keywordResults, semanticResults), query);
    } catch {
      if (isCurrent()) renderMessage("Published-evidence search is temporarily unavailable. Conventional navigation remains available; retry the search when ready.", "information");
    } finally {
      if (isCurrent()) results.removeAttribute("aria-busy");
    }
  };

  const startSemantic = async () => {
    const generation = ++semanticGeneration;
    semanticEnable.disabled = true;
    semanticCancel.hidden = false;
    progress.hidden = false;
    announce("Preparing private on-device semantic retrieval...");
    try {
      const knowledge = await knowledgeIndex();
      // Closing/cancelling during index loading must never start a new worker.
      if (generation !== semanticGeneration || !dialog.open) return;
      const activeWorker = new Worker("/assets/ai/runtime/semantic-worker.mjs", { type: "module", name: "novapharm-private-semantic-search" });
      worker = activeWorker;
      activeWorker.addEventListener("message", (event) => {
        if (generation !== semanticGeneration || worker !== activeWorker || !dialog.open) return;
      if (event.data.type === "progress") {
        progress.max = event.data.total || 1;
        progress.value = event.data.total ? event.data.loaded : 0;
        progressLabel.textContent = event.data.cached
          ? `${event.data.label} loaded from the browser cache.`
          : `${event.data.label}: ${formatBytes(event.data.loaded)}${event.data.total ? ` of ${formatBytes(event.data.total)}` : " downloaded"}.`;
      }
      if (event.data.type === "ready") {
        semanticReady = true;
        semanticEnable.disabled = false;
        semanticEnable.textContent = "Disable private semantic retrieval";
        semanticCancel.hidden = true;
        cacheClear.hidden = !persistentCacheAvailable;
        progress.hidden = true;
        progressLabel.textContent = persistentCacheAvailable
          ? "The local retrieval model is ready. Queries remain in this browser."
          : "The local retrieval model is ready for this tab only. Browser storage is unavailable, so the optional assets will not be retained.";
        announce("Private on-device semantic retrieval is ready.");
      }
      if (event.data.type === "storage" && event.data.available === false) {
        persistentCacheAvailable = false;
        cacheClear.hidden = true;
        progressLabel.textContent = "Browser storage is unavailable. Semantic retrieval can continue for this tab without retaining the optional assets.";
      }
      if (event.data.type === "results" && semanticRequest?.requestId === event.data.requestId) {
        const pending = semanticRequest;
        semanticRequest = null;
        pending.resolve(event.data.results || []);
      }
      if (event.data.type === "cache-cleared") {
        progressLabel.textContent = "The optional semantic cache has been cleared.";
        announce("Optional semantic cache cleared.");
      }
      if (event.data.type === "error") {
        semanticReady = false;
        semanticEnable.disabled = false;
        semanticEnable.textContent = "Try private semantic retrieval again";
        semanticCancel.hidden = true;
        progress.hidden = true;
        progressLabel.textContent = "Semantic retrieval is unavailable. Conventional search still works.";
        announce("Semantic retrieval is unavailable. Conventional search remains available.");
        if (semanticRequest) {
          semanticRequest.resolve([]);
          semanticRequest = null;
        }
      }
    });
      activeWorker.postMessage({ type: "init", knowledge, useCache: true });
    } catch {
      if (generation !== semanticGeneration || !dialog.open) return;
      stopSemantic();
      announce("Semantic retrieval could not be enabled. Conventional search remains available.");
    }
  };

  const stopSemantic = (reason = "disabled") => {
    ++semanticGeneration;
    if (semanticRequest) {
      semanticRequest.resolve([]);
      semanticRequest = null;
    }
    worker?.terminate();
    worker = null;
    semanticReady = false;
    semanticEnable.disabled = false;
    semanticEnable.textContent = "Enable private semantic retrieval";
    semanticCancel.hidden = true;
    cacheClear.hidden = !persistentCacheAvailable;
    progress.hidden = true;
    if (reason !== "closed") {
      progressLabel.textContent = reason === "cancelled"
        ? "Download cancelled. Conventional search still works."
        : "Semantic retrieval disabled. Optional downloaded assets may remain in this browser; use Clear cached assets to delete them.";
    }
  };

  // Removing browser assets is separate from inference: users can clear data while AI is off.
  const clearStoredSemanticAssets = () => new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(false);
    const request = indexedDB.deleteDatabase("novapharm-public-ai");
    request.onsuccess = () => resolve(true);
    request.onerror = request.onblocked = () => resolve(false);
  });

  modeButtons.forEach((button) => button.addEventListener("click", () => {
    // Mode changes invalidate prior in-flight answers and their visible output.
    ++queryVersion;
    if (semanticRequest) {
      semanticRequest.resolve([]);
      semanticRequest = null;
    }
    results.replaceChildren();
    currentAnswer = "";
    copyButton.hidden = true;
    results.removeAttribute("aria-busy");
    announce("");
    mode = button.dataset.aiMode;
    modeButtons.forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
    dialog.querySelector("[data-ai-mode-help]").textContent = mode === "search"
      ? "Fast keyword and metadata search. No model is used."
      : "Extractive answers from approved public evidence, with citations and safety boundaries.";
    input.placeholder = mode === "search" ? "Search NovaPharm pages and Insights" : "Ask about NovaPharm's published information";
    input.focus();
  }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch(input.value.trim());
  });
  semanticEnable.addEventListener("click", () => {
    if (semanticReady) {
      stopSemantic();
      announce("Semantic retrieval disabled. Conventional search remains available.");
      return;
    }
    void startSemantic();
  });
  semanticCancel.addEventListener("click", () => {
    stopSemantic("cancelled");
    announce("Semantic model download cancelled.");
  });
  cacheClear.addEventListener("click", async () => {
    // Terminate live retrieval before deleting its optional persistent cache.
    stopSemantic();
    announce("Clearing optional browser retrieval assets...");
    const cleared = await clearStoredSemanticAssets();
    if (cleared) {
      progressLabel.textContent = "Optional browser retrieval assets cleared. Conventional search is available.";
      announce("Optional browser retrieval assets cleared.");
    } else {
      progressLabel.textContent = "Could not clear optional assets. Check browser storage settings and try again.";
      announce("Optional assets could not be cleared.");
    }
  });
  copyButton.addEventListener("click", async () => {
    if (!currentAnswer) return;
    try {
      await navigator.clipboard.writeText(currentAnswer);
      announce("Answer and source links copied.");
    } catch {
      announce("Copy is unavailable in this browser. Select the answer text instead.");
    }
  });
  dialog.querySelector("[data-ai-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    // Clear retained text and in-memory retrieval state when the user exits.
    ++queryVersion;
    stopSemantic("closed");
    input.value = "";
    currentAnswer = "";
    results.replaceChildren();
    results.removeAttribute("aria-busy");
    copyButton.hidden = true;
    announce("");
    previousFocus?.focus();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("cancel", () => announce("Search closed."));
  dialog.addEventListener("ai:open", async (event) => {
    previousFocus = event.detail?.trigger || document.activeElement;
    if (!dialog.open) dialog.showModal();
    input.focus();
    try {
      const manifest = await sourceManifest();
      const bytes = manifest.assets.knowledgeIndex.bytes + manifest.assets.semanticModel.bytes + manifest.assets.embeddings.bytes;
      disclosureSize.textContent = formatBytes(bytes);
    } catch {
      disclosureSize.textContent = "size unavailable";
    }
  });
}
