import { createNoneProvider } from "./provider-none.mjs";
import { createOllamaProvider } from "./provider-ollama.mjs";

export const internalModelRegister = Object.freeze([
  Object.freeze({ id: "none", provider: "none", maturity: "production-default", dataBoundary: "No model invocation", licence: "Not applicable" }),
  Object.freeze({ id: "ollama-loopback", provider: "ollama", maturity: "local-development-adapter", dataBoundary: "Loopback host only", licence: "Model-specific review required before activation" })
]);

export function configuredInternalProvider(environment = process.env) {
  const provider = String(environment.INTERNAL_AI_PROVIDER || "none").trim().toLowerCase();
  if (provider === "none") return createNoneProvider();
  if (provider !== "ollama") throw new Error("Unsupported internal AI provider.");
  if (environment.NODE_ENV === "production") throw new Error("The Ollama adapter is disabled in production.");
  return createOllamaProvider({
    endpoint: environment.OLLAMA_ENDPOINT || "http://127.0.0.1:11434",
    model: environment.OLLAMA_MODEL || ""
  });
}
