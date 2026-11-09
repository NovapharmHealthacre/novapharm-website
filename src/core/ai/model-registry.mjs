import { createNoneProvider } from "./provider-none.mjs";
import { createOllamaProvider } from "./provider-ollama.mjs";
import { createOpenAiZdrProvider } from "./provider-openai-zdr.mjs";

export const internalModelRegister = Object.freeze([
  Object.freeze({ id: "none", provider: "none", maturity: "production-default", dataBoundary: "No model invocation", licence: "Not applicable" }),
  Object.freeze({ id: "ollama-loopback", provider: "ollama", maturity: "local-development-adapter", dataBoundary: "Loopback host only", licence: "Model-specific review required before activation" }),
  Object.freeze({ id: "openai-zdr", provider: "openai", maturity: "approval-gated-adapter-not-operational", dataBoundary: "Explicitly approved EU-only, store:false, rights-certified sources", licence: "Independent production ZDR and external-AI rights confirmation required" })
]);

export function configuredInternalProvider(environment = process.env) {
  const provider = String(environment.INTERNAL_AI_PROVIDER || "none").trim().toLowerCase();
  if (provider === "none") return createNoneProvider();
  if (provider === "openai-zdr") return createOpenAiZdrProvider({
    apiKey: environment.OPENAI_API_KEY || "",
    model: environment.NOVAPHARM_NOVA_MODEL || "gpt-6-luna",
    endpoint: environment.NOVAPHARM_OPENAI_EU_API_ORIGIN || "https://eu.api.openai.com",
    productionApproved: environment.NOVAPHARM_NOVA_PRODUCTION_APPROVED === "true",
    euZdrApproved: environment.NOVAPHARM_OPENAI_EU_ZDR_APPROVED === "true"
  });
  if (provider !== "ollama") throw new Error("Unsupported internal AI provider.");
  if (environment.NODE_ENV === "production") throw new Error("The Ollama adapter is disabled in production.");
  return createOllamaProvider({
    endpoint: environment.OLLAMA_ENDPOINT || "http://127.0.0.1:11434",
    model: environment.OLLAMA_MODEL || ""
  });
}
