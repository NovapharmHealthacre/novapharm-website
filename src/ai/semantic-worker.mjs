import { cosineSparse, embedText, tokenize } from "./model-registry.mjs";

const DB_NAME = "novapharm-public-ai";
const STORE_NAME = "semantic-assets";
let knowledge = null;
let embeddings = null;
let model = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in self)) return reject(new Error("storage_unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("storage_unavailable"));
  });
}

async function readCache(key) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function writeCache(key, value) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

async function clearCache() {
  if (!("indexedDB" in self)) return;
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
}

async function fetchJson(url, label, useCache) {
  if (useCache) {
    try {
      const cached = await readCache(url);
      if (cached) {
        self.postMessage({ type: "progress", label, loaded: cached.bytes || 0, total: cached.bytes || 0, cached: true });
        return cached.value;
      }
    } catch {
      self.postMessage({ type: "storage", available: false });
    }
  }
  const response = await fetch(url, { credentials: "same-origin", cache: "force-cache" });
  if (!response.ok) throw new Error(`asset_${response.status}`);
  const total = Number(response.headers.get("content-length") || 0);
  if (!response.body?.getReader) {
    const value = await response.json();
    self.postMessage({ type: "progress", label, loaded: total, total });
    if (useCache) await writeCache(url, { value, bytes: total }).catch(() => self.postMessage({ type: "storage", available: false }));
    return value;
  }
  const reader = response.body.getReader();
  const parts = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.byteLength;
    self.postMessage({ type: "progress", label, loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (useCache) await writeCache(url, { value, bytes: loaded }).catch(() => self.postMessage({ type: "storage", available: false }));
  return value;
}

async function initialise(message) {
  knowledge = message.knowledge;
  model = await fetchJson(message.modelUrl, "model", message.useCache);
  embeddings = await fetchJson(message.embeddingsUrl, "embeddings", message.useCache);
  if (embeddings.corpusHash !== knowledge.corpusHash) throw new Error("corpus_mismatch");
  self.postMessage({ type: "ready", model: { id: model.id, revision: model.revision, dimensions: model.dimensions } });
}

function search(message) {
  const queryVector = embedText(message.query, { dimensions: model.dimensions, groups: model.semanticGroups });
  const queryTerms = [...new Set(tokenize(message.query))];
  const minimumMatches = queryTerms.length === 1 ? 1 : 2;
  const chunkById = new Map(knowledge.chunks.map((chunk) => [chunk.id, chunk]));
  const results = embeddings.vectors
    .map((record) => {
      const chunk = chunkById.get(record.id);
      const terms = new Set(tokenize(`${chunk.sourceTitle} ${chunk.heading} ${chunk.text}`));
      const matchedQueryTerms = queryTerms.reduce((count, term) => count + (terms.has(term) ? 1 : 0), 0);
      return { ...chunk, score: Number(cosineSparse(queryVector, record.vector).toFixed(6)), method: "semantic", matchedQueryTerms };
    })
    .filter((result) => result.text && result.score >= 0.08 && result.matchedQueryTerms >= minimumMatches)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, message.limit || 8);
  self.postMessage({ type: "results", requestId: message.requestId, results });
}

self.addEventListener("message", async (event) => {
  try {
    if (event.data.type === "init") await initialise(event.data);
    if (event.data.type === "search") search(event.data);
    if (event.data.type === "clear-cache") {
      await clearCache();
      self.postMessage({ type: "cache-cleared" });
    }
  } catch (error) {
    self.postMessage({ type: "error", requestId: event.data.requestId, code: error?.message || "semantic_unavailable" });
  }
});
