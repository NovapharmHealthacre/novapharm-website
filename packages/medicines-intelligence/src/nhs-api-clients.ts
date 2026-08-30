export type NhsApiEnvironment = "sandbox" | "integration" | "production";

export interface NhsApiConfigurationState {
  readonly state: "configured" | "configuration_required";
  readonly environment: NhsApiEnvironment;
  readonly secretName: string;
  readonly message: string;
}

export interface NhsApiClientOptions {
  readonly environment?: NhsApiEnvironment;
  readonly apiKey?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly timeoutMs?: number;
}

export class NhsApiConfigurationError extends Error {
  readonly code = "NHS_API_CONFIGURATION_REQUIRED";

  constructor(readonly secretName: string) {
    super(`${secretName} is required for the selected NHS API environment.`);
    this.name = "NhsApiConfigurationError";
  }
}

export class NhsApiRequestError extends Error {
  constructor(readonly statusCode: number, readonly service: "ods_fhir_r4" | "dohs_v3") {
    super(`${service} request failed with HTTP ${statusCode}.`);
    this.name = "NhsApiRequestError";
  }
}

interface NhsApiTransportOptions extends NhsApiClientOptions {
  readonly service: "ods_fhir_r4" | "dohs_v3";
  readonly secretName: string;
  readonly baseUrls: Readonly<Record<NhsApiEnvironment, string>>;
}

interface JsonObject {
  readonly [key: string]: unknown;
}

const maximumResponseBytes = 10 * 1024 * 1024;

function optionalSecret(value: string | undefined): string | null {
  if (value === undefined || !value.trim()) return null;
  const secret = value.trim();
  if (secret.length < 8 || secret.length > 512 || /[\u0000-\u001F\u007F]/u.test(secret)) throw new Error("NHS API key has an invalid format.");
  return secret;
}

function jsonObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} response is not a JSON object.`);
  return value as JsonObject;
}

function boundedInteger(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${label} is outside the approved bounds.`);
  return value;
}

function odsCode(value: string): string {
  const code = value.normalize("NFKC").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,15}$/u.test(code)) throw new Error("ODS code has an invalid format.");
  return code;
}

function safeString(value: unknown, maximum = 500): string | null {
  if (typeof value !== "string") return null;
  const text = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!text || text.length > maximum || /[\u0000-\u001F\u007F]/u.test(text)) return null;
  return text;
}

class NhsApiTransport {
  readonly configuration: NhsApiConfigurationState;
  readonly #apiKey: string | null;
  readonly #baseUrl: URL;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #service: "ods_fhir_r4" | "dohs_v3";

  constructor(options: NhsApiTransportOptions) {
    const environment = options.environment ?? "production";
    const apiKey = optionalSecret(options.apiKey);
    const timeoutMs = options.timeoutMs ?? 15_000;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 60_000) throw new Error("NHS API timeout is outside the approved bounds.");
    this.#apiKey = apiKey;
    this.#baseUrl = new URL(options.baseUrls[environment]);
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#timeoutMs = timeoutMs;
    this.#service = options.service;
    const configured = environment === "sandbox" || apiKey !== null;
    this.configuration = Object.freeze({
      state: configured ? "configured" : "configuration_required",
      environment,
      secretName: options.secretName,
      message: configured
        ? `${options.service} ${environment} access is configured.`
        : `${options.secretName} must be supplied as a server-side secret before ${environment} access can run.`,
    });
  }

  async get(pathname: string, parameters: Readonly<Record<string, string>>): Promise<JsonObject> {
    if (this.configuration.state !== "configured") throw new NhsApiConfigurationError(this.configuration.secretName);
    const url = new URL(pathname, this.#baseUrl.href.endsWith("/") ? this.#baseUrl : new URL(`${this.#baseUrl.href}/`));
    if (url.origin !== this.#baseUrl.origin || !url.pathname.startsWith(this.#baseUrl.pathname.replace(/\/$/u, ""))) throw new Error("NHS API request escaped its approved service boundary.");
    for (const [key, value] of Object.entries(parameters)) url.searchParams.append(key, value);
    const headers = new Headers({ Accept: this.#service === "ods_fhir_r4" ? "application/fhir+json, application/json" : "application/json" });
    if (this.#apiKey) headers.set("apikey", this.#apiKey);
    const response = await this.#fetch(url, { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(this.#timeoutMs) });
    if (!response.ok) throw new NhsApiRequestError(response.status, this.#service);
    const type = String(response.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("json") && !type.includes("fhir")) throw new Error(`${this.#service} returned an unexpected content type.`);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maximumResponseBytes) throw new Error(`${this.#service} response exceeds the approved size.`);
    const body = await response.text();
    if (!body || Buffer.byteLength(body, "utf8") > maximumResponseBytes) throw new Error(`${this.#service} response is empty or too large.`);
    return jsonObject(JSON.parse(body) as unknown, this.#service);
  }
}

const odsBaseUrls = Object.freeze({
  sandbox: "https://sandbox.api.service.nhs.uk/organisation-data-terminology-api/fhir/",
  integration: "https://int.api.service.nhs.uk/organisation-data-terminology-api/fhir/",
  production: "https://api.service.nhs.uk/organisation-data-terminology-api/fhir/",
});

const dohsBaseUrls = Object.freeze({
  sandbox: "https://sandbox.api.service.nhs.uk/service-search-api/",
  integration: "https://int.api.service.nhs.uk/service-search-api/",
  production: "https://api.service.nhs.uk/service-search-api/",
});

export class OdsFhirR4Client {
  readonly configuration: NhsApiConfigurationState;
  readonly #transport: NhsApiTransport;

  constructor(options: NhsApiClientOptions = {}) {
    this.#transport = new NhsApiTransport({ ...options, service: "ods_fhir_r4", secretName: "NHS_ODS_API_KEY", baseUrls: odsBaseUrls });
    this.configuration = this.#transport.configuration;
  }

  async organisationByCode(value: string): Promise<JsonObject> {
    return this.#transport.get(`Organization/${encodeURIComponent(odsCode(value))}`, {});
  }

  async searchOrganisations(value: string, options: Readonly<{ count?: number; offset?: number }> = {}): Promise<JsonObject> {
    const count = boundedInteger(options.count ?? 25, 1, 100, "ODS result count");
    const offset = boundedInteger(options.offset ?? 0, 0, 100_000, "ODS result offset");
    return this.#transport.get("Organization", { _id: odsCode(value), _count: String(count), _offset: String(offset) });
  }
}

export interface DohsContact {
  readonly type: string | null;
  readonly method: string | null;
  readonly availability: string | null;
  readonly value: string;
}

export interface DohsOrganisation {
  readonly odsCode: string;
  readonly name: string;
  readonly status: string | null;
  readonly organisationType: string | null;
  readonly organisationSubtype: string | null;
  readonly address: readonly string[];
  readonly postcode: string | null;
  readonly epsEnabled: string | null;
  readonly contacts: readonly DohsContact[];
}

function dohsOrganisation(value: unknown): DohsOrganisation | null {
  const item = jsonObject(value, "DoHS organisation");
  const code = safeString(item["ODSCode"], 15);
  const name = safeString(item["OrganisationName"], 300);
  if (!code || !name) return null;
  const contacts = Array.isArray(item["Contacts"])
    ? item["Contacts"].flatMap((candidate): DohsContact[] => {
      const contact = jsonObject(candidate, "DoHS contact");
      const contactValue = safeString(contact["ContactValue"], 500);
      return contactValue ? [Object.freeze({ type: safeString(contact["ContactType"], 100), method: safeString(contact["ContactMethodType"], 100), availability: safeString(contact["ContactAvailabilityType"], 100), value: contactValue })] : [];
    })
    : [];
  const address = ["Address1", "Address2", "Address3", "City", "County"].flatMap((field) => {
    const part = safeString(item[field], 300);
    return part ? [part] : [];
  });
  return Object.freeze({
    odsCode: code.toUpperCase(), name, status: safeString(item["OrganisationStatus"], 100),
    organisationType: safeString(item["OrganisationType"], 150), organisationSubtype: safeString(item["OrganisationSubType"], 150),
    address: Object.freeze(address), postcode: safeString(item["Postcode"], 16), epsEnabled: safeString(item["IsEpsEnabled"], 20),
    contacts: Object.freeze(contacts),
  });
}

export class DohsV3Client {
  readonly configuration: NhsApiConfigurationState;
  readonly #transport: NhsApiTransport;

  constructor(options: NhsApiClientOptions = {}) {
    this.#transport = new NhsApiTransport({ ...options, service: "dohs_v3", secretName: "NHS_DOHS_API_KEY", baseUrls: dohsBaseUrls });
    this.configuration = this.#transport.configuration;
  }

  async organisationsByOdsCode(value: string, limit = 25): Promise<readonly DohsOrganisation[]> {
    const code = odsCode(value);
    const top = boundedInteger(limit, 1, 50, "DoHS result count");
    const response = await this.#transport.get(".", {
      "api-version": "3", search: code, searchFields: "ODSCode", "$top": String(top),
      "$select": "ODSCode,OrganisationName,OrganisationType,OrganisationStatus,Address1,Address2,Address3,City,County,Postcode,OrganisationSubType,IsEpsEnabled,Contacts",
    });
    const values = response["value"];
    if (!Array.isArray(values)) throw new Error("dohs_v3 response has no organisation collection.");
    return Object.freeze(values.flatMap((candidate) => {
      const parsed = dohsOrganisation(candidate);
      return parsed ? [parsed] : [];
    }));
  }
}
