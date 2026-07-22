export function createNoneProvider() {
  return Object.freeze({
    id: "none",
    status: "disabled",
    async complete() {
      throw Object.assign(new Error("No generative provider is enabled."), { code: "provider_disabled", statusCode: 503 });
    }
  });
}
