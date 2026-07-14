const connectionString = String(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || "").trim();
const sensitivePrefixes = [
  "/api/auth/",
  "/api/documents/",
  "/api/account-applications/",
  "/api/portal/",
  "/api/admin/",
  "/portal/",
  "/employee/",
  "/board/",
  "/admin/",
  "/docs/",
  "/NP_"
];

function requestPath(request) {
  try {
    return new URL(String(request?.url || "/"), "https://telemetry.invalid").pathname;
  } catch {
    return "/";
  }
}

export const observabilityStatus = connectionString ? "configured" : "owner_configuration_required";

if (connectionString) {
  const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
  useAzureMonitor({
    azureMonitorExporterOptions: { connectionString },
    enableLiveMetrics: false,
    instrumentationOptions: {
      azureSdk: { enabled: false },
      http: {
        enabled: true,
        ignoreIncomingRequestHook: (request) => sensitivePrefixes.some((prefix) => requestPath(request).startsWith(prefix)),
        requestHook: (span, request) => {
          const path = requestPath(request);
          span.setAttribute("url.path", path);
          span.setAttribute("url.full", path);
          span.setAttribute("http.target", path);
        }
      }
    }
  });
}
