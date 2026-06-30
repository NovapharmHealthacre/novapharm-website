function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function polarSpeedConfigFromEnv() {
  return {
    baseUrl: stripTrailingSlash(process.env.POLAR_SPEED_API_BASE_URL),
    apiKey: process.env.POLAR_SPEED_API_KEY || "",
    accountNumber: process.env.POLAR_SPEED_ACCOUNT_NUMBER || "",
    reserveStockPath: process.env.POLAR_SPEED_RESERVE_STOCK_PATH || "",
    dispatchPath: process.env.POLAR_SPEED_DISPATCH_PATH || "",
    trackingPath: process.env.POLAR_SPEED_TRACKING_PATH || "",
    inventoryPath: process.env.POLAR_SPEED_INVENTORY_PATH || "",
    timeoutMs: Number(process.env.POLAR_SPEED_TIMEOUT_MS || 30000)
  };
}

export function hasPolarSpeedCredentials(config = polarSpeedConfigFromEnv()) {
  return Boolean(config.baseUrl && config.apiKey && config.accountNumber);
}

export class PolarSpeedClient {
  constructor(config = polarSpeedConfigFromEnv()) {
    this.config = config;
  }

  async request(path, options = {}) {
    if (!path) {
      const error = new Error("Polar Speed endpoint path is not configured.");
      error.code = "polar_speed_endpoint_missing";
      throw error;
    }
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      ...options,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
        "X-NovaPharm-Account": this.config.accountNumber,
        ...(options.headers || {})
      },
      signal: options.signal || AbortSignal.timeout(this.config.timeoutMs)
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = new Error(`Polar Speed request failed with ${response.status}.`);
      error.code = `polar_speed_${response.status}`;
      error.details = payload;
      throw error;
    }
    return payload;
  }

  reserveStock(orderPayload) {
    return this.request(this.config.reserveStockPath, { method: "POST", body: JSON.stringify(orderPayload) });
  }

  createDispatch(dispatchPayload) {
    return this.request(this.config.dispatchPath, { method: "POST", body: JSON.stringify(dispatchPayload) });
  }

  trackingStatus(reference) {
    const path = this.config.trackingPath.replace("{reference}", encodeURIComponent(reference));
    return this.request(path);
  }

  inventorySnapshot() {
    return this.request(this.config.inventoryPath);
  }
}
