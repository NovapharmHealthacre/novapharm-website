(async () => {
  try {
    const response = await fetch("/api/health", { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!response.ok) return;
    const health = await response.json();
    if (health.environment !== "local_validation") return;
    const banner = document.createElement("div");
    banner.className = "local-validation-banner";
    banner.setAttribute("role", "status");
    banner.textContent = "Local owner validation — synthetic data only. External email, SharePoint, analytics and production services are disabled.";
    document.body.prepend(banner);
    document.documentElement.dataset.environment = "local-validation";
  } catch {
    // Static public hosting and an unavailable local runtime intentionally show no validation banner.
  }
})();
