import assert from "node:assert/strict";
import test from "node:test";
import { initialiseSearchDialog } from "../src/ai/search-controller.mjs";

function control() {
  const listeners = new Map();
  return {
    disabled: false, hidden: false, textContent: "", value: "",
    dataset: {}, attributes: {},
    addEventListener(type, handler) {
      const existing = listeners.get(type) || [];
      existing.push(handler);
      listeners.set(type, existing);
    },
    emit(type, payload = {}) {
      for (const handler of listeners.get(type) || []) handler(payload);
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    replaceChildren() {},
    append() {},
    focus() {}
  };
}

function fixture() {
  const names = [
    "search-form", "search-input", "status", "results",
    "semantic-enable", "semantic-cancel", "cache-clear", "progress",
    "progress-label", "model-size", "copy", "close", "mode-help"
  ];
  const nodes = Object.fromEntries(names.map((name) => [name, control()]));
  const dialog = control();
  dialog.open = true;
  dialog.dataset = {};
  dialog.querySelector = (selector) => nodes[selector.slice(9, -1)];
  dialog.querySelectorAll = () => [];
  dialog.close = () => { dialog.open = false; dialog.emit("close"); };
  dialog.showModal = () => { dialog.open = true; };
  return { dialog, nodes };
}

const knowledge = {
  keywordIndex: { version: 1, documentCount: 0, postings: {}, documentFrequency: {} },
  chunks: []
};

const turn = () => new Promise((resolve) => setImmediate(resolve));

test("cancel/close before index fetch completes never constructs a detached semantic worker", async () => {
  const savedFetch = globalThis.fetch;
  const savedWorker = globalThis.Worker;
  let resolveFetch;
  const created = [];
  try {
    globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });
    globalThis.Worker = class { constructor() { created.push(this); } };
    const { dialog, nodes } = fixture();
    await initialiseSearchDialog(dialog);
    nodes["search-input"].value = "temporary search";
    nodes["semantic-enable"].emit("click");
    assert.equal(typeof resolveFetch, "function");
    dialog.close();
    resolveFetch({ ok: true, json: async () => knowledge });
    await turn();
    assert.equal(created.length, 0);
    assert.equal(nodes["search-input"].value, "");
    assert.equal(nodes.results.attributes["aria-busy"], undefined);
    assert.equal(nodes["semantic-enable"].disabled, false);
  } finally {
    globalThis.fetch = savedFetch;
    globalThis.Worker = savedWorker;
  }
});

test("enabled semantic retrieval can be turned off and its worker terminated", async () => {
  const savedWorker = globalThis.Worker;
  const savedDocument = globalThis.document;
  const savedIndexedDB = globalThis.indexedDB;
  const workers = [];
  const deleted = [];
  try {
    globalThis.document = { createElement: control };
    globalThis.indexedDB = {
      deleteDatabase(name) {
        deleted.push(name);
        const request = {};
        queueMicrotask(() => request.onsuccess?.());
        return request;
      }
    };
    globalThis.Worker = class {
      constructor() { this.terminated = false; this.callbacks = []; workers.push(this); }
      addEventListener(type, cb) { if (type === "message") this.callbacks.push(cb); }
      postMessage(message) {
        if (message.type === "init") queueMicrotask(() => {
          for (const callback of this.callbacks) callback({ data: { type: "ready" } });
        });
      }
      terminate() { this.terminated = true; }
    };
    const { dialog, nodes } = fixture();
    await initialiseSearchDialog(dialog);
    nodes["semantic-enable"].emit("click");
    await turn();
    assert.equal(workers.length, 1);
    assert.equal(nodes["semantic-enable"].textContent, "Disable private semantic retrieval");
    assert.equal(nodes["semantic-enable"].disabled, false);
    nodes["semantic-enable"].emit("click");
    assert.equal(workers[0].terminated, true);
    assert.equal(nodes["semantic-enable"].textContent, "Enable private semantic retrieval");
    assert.equal(nodes["cache-clear"].hidden, false);
    nodes["cache-clear"].emit("click");
    await turn();
    assert.deepEqual(deleted, ["novapharm-public-ai"]);
    assert.match(nodes.status.textContent, /assets cleared/);
    dialog.close();
  } finally {
    globalThis.Worker = savedWorker;
    globalThis.document = savedDocument;
    globalThis.indexedDB = savedIndexedDB;
  }
});
