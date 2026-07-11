(() => {
  const configuredBase = document.documentElement.dataset.apiBase?.trim() || window.location.origin;
  const requestTimeoutMs = 15000;
  let cachedCsrfToken = "";

  function apiUrl(path) {
    try {
      return new URL(path, configuredBase).toString();
    } catch {
      return new URL(path, window.location.origin).toString();
    }
  }

  async function readJson(response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return {};
    return response.json().catch(() => ({}));
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), options.timeoutMs || requestTimeoutMs);
    try {
      const response = await fetch(apiUrl(path), {
        credentials: "include",
        ...options,
        signal: controller.signal
      });
      const payload = await readJson(response);
      if (!response.ok) {
        const error = new Error("NovaPharm service request failed.");
        error.status = response.status;
        error.code = payload.code || "request_failed";
        error.payload = payload;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error?.status) throw error;
      const serviceError = new Error("NovaPharm service is unavailable.");
      serviceError.status = 0;
      serviceError.code = error?.name === "AbortError" ? "request_timeout" : "network_unavailable";
      throw serviceError;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function csrf({ refresh = false } = {}) {
    if (cachedCsrfToken && !refresh) return cachedCsrfToken;
    const payload = await request("/api/security/csrf");
    cachedCsrfToken = payload.csrfToken || "";
    if (!cachedCsrfToken) {
      const error = new Error("Security token was not issued.");
      error.status = 503;
      error.code = "csrf_unavailable";
      throw error;
    }
    return cachedCsrfToken;
  }

  function friendlyError(error, context = "request") {
    if (error?.status === 400 || error?.status === 422) return "Please check the information entered and try again.";
    if (error?.status === 401) return context === "login" ? "The username or password is not recognised." : "Your secure session has expired. Please sign in again.";
    if (error?.status === 403) return context === "login" ? "This account does not have access to the selected portal." : "The security check could not be completed. Refresh the page and try again.";
    if (error?.status === 413) return "One or more files are too large. Please reduce the file size and try again.";
    if (error?.status === 429) return "Too many attempts were received. Please wait a few minutes before trying again.";
    if (error?.code === "request_timeout") return "The secure service took too long to respond. Please try again.";
    if (!navigator.onLine) return "You appear to be offline. Reconnect to the internet and try again.";
    if (error?.status === 404 || error?.status === 0) return "The secure NovaPharm service is not active on this host. Please try again later or use the corporate contact route.";
    return "The secure NovaPharm service is temporarily unavailable. Please try again later.";
  }

  window.NovaPharmApi = { apiUrl, csrf, friendlyError, request };
})();
