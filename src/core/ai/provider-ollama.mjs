const allowedHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function createOllamaProvider({ endpoint = "http://127.0.0.1:11434", model = "", fetchImplementation = globalThis.fetch } = {}) {
  const base = new URL(endpoint);
  if (base.protocol !== "http:" || !allowedHosts.has(base.hostname)) throw new Error("Ollama must use a loopback HTTP endpoint.");
  return Object.freeze({
    id: "ollama",
    status: model ? "local-development-only" : "model-not-configured",
    async complete({ system, prompt }) {
      if (!model) throw Object.assign(new Error("A local Ollama model is not configured."), { code: "model_not_configured", statusCode: 503 });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetchImplementation(new URL("/api/generate", base), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, system, prompt, stream: false, options: { temperature: 0 } }),
          signal: controller.signal
        });
        if (!response.ok) throw Object.assign(new Error("The local AI provider is unavailable."), { code: "provider_unavailable", statusCode: 503 });
        const payload = await response.json();
        return String(payload.response || "").trim();
      } finally {
        clearTimeout(timeout);
      }
    }
  });
}
