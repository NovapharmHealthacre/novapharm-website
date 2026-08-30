import { normalisePostcode } from "./geography.ts";

export interface OnsPostcodeRecord {
  readonly postcode: string;
  readonly introduced: string | null;
  readonly terminated: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly coordinateStatus: "published" | "not_published";
  readonly countryCode: string | null;
  readonly localAuthorityCode: string | null;
  readonly nhsRegionCode: string | null;
  readonly icbCode: string | null;
  readonly subIcbCode: string | null;
  readonly lsoa2021Code: string | null;
  readonly msoa2021Code: string | null;
  readonly rurality2021Code: string | null;
}

interface ArcGisResponse {
  readonly features?: readonly Readonly<{ attributes?: Readonly<Record<string, unknown>> }>[];
  readonly error?: Readonly<{ code?: number; message?: string; details?: readonly string[] }>;
  readonly exceededTransferLimit?: boolean;
}

export interface OnsPostcodeClientOptions {
  readonly endpoint?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

const officialEndpoint = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Online_ONS_Postcode_Directory_Live/FeatureServer/1";
const officialQuarterlyEndpoint = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/ONS_Postcode_Directory_(May_2026)_for_the_United_Kingdom_(Hosted_Table)/FeatureServer/0";
const outFields = "PCDS,DOINTR,DOTERM,LAT,LONG,CTRY25CD,LAD25CD,NHSER24CD,ICB26CD,SICBL26CD,LSOA21CD,MSOA21CD,RUC21IND";

function monthDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return /^(?:19|20)\d{4}$/u.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-01` : null;
}

function stringOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function attribute(values: Readonly<Record<string, unknown>>, name: string): unknown {
  if (Object.hasOwn(values, name)) return values[name];
  const key = Object.keys(values).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? values[key] : undefined;
}

function coordinates(latitudeValue: unknown, longitudeValue: unknown, postcode: string): Readonly<{
  latitude: number | null;
  longitude: number | null;
  coordinateStatus: "published" | "not_published";
}> {
  const latitudeMissing = latitudeValue === null || latitudeValue === undefined || String(latitudeValue).trim() === "";
  const longitudeMissing = longitudeValue === null || longitudeValue === undefined || String(longitudeValue).trim() === "";
  if (latitudeMissing && longitudeMissing) return Object.freeze({ latitude: null, longitude: null, coordinateStatus: "not_published" });
  if (latitudeMissing !== longitudeMissing) throw new Error(`ONS postcode ${postcode} has incomplete coordinates.`);
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (latitude >= 99.999 && latitude <= 100 && longitude === 0) return Object.freeze({ latitude: null, longitude: null, coordinateStatus: "not_published" });
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error(`ONS postcode ${postcode} latitude is invalid.`);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error(`ONS postcode ${postcode} longitude is invalid.`);
  return Object.freeze({ latitude, longitude, coordinateStatus: "published" });
}

function retryDelay(attempt: number, retryAfter: string | null): number {
  const seconds = Number(retryAfter);
  if (retryAfter && Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 30_000);
  return Math.min(500 * (2 ** attempt), 8_000);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

export class OnsPostcodeClient {
  readonly endpoint: URL;
  readonly fetchImplementation: typeof fetch;
  readonly timeoutMs: number;
  readonly maxRetries: number;

  constructor(options: OnsPostcodeClientOptions = {}) {
    this.endpoint = new URL(options.endpoint ?? officialEndpoint);
    const loopback = this.endpoint.hostname === "localhost" || this.endpoint.hostname === "127.0.0.1";
    if (this.endpoint.protocol !== "https:" && !(loopback && this.endpoint.protocol === "http:")) throw new Error("ONS postcode endpoint must use HTTPS outside loopback tests.");
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 3;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 250 || this.timeoutMs > 120_000) throw new Error("ONS postcode timeout is outside the approved bounds.");
    if (!Number.isInteger(this.maxRetries) || this.maxRetries < 0 || this.maxRetries > 5) throw new Error("ONS postcode retry count is outside the approved bounds.");
  }

  async lookup(postcodesInput: readonly string[]): Promise<readonly OnsPostcodeRecord[]> {
    const postcodes = [...new Set(postcodesInput.map(normalisePostcode))];
    if (!postcodes.length || postcodes.length > 200) throw new Error("ONS postcode lookup requires between one and 200 unique postcodes.");
    const query = new URL("./query", this.endpoint.href.endsWith("/") ? this.endpoint : `${this.endpoint.href}/`);
    const body = new URLSearchParams({
      f: "json",
      where: `PCDS IN (${postcodes.map((postcode) => `'${postcode}'`).join(",")})`,
      outFields,
      returnGeometry: "false",
    });
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchImplementation(query, {
          method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NovaPharm-Medicines-Intelligence/0.1 (+https://novapharmhealthcare.com)" },
          body, signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
          const error = new Error(`ONS postcode service returned HTTP ${response.status}.`);
          if ((response.status === 429 || response.status >= 500) && attempt < this.maxRetries) {
            await delay(retryDelay(attempt, response.headers.get("retry-after")));
            lastError = error;
            continue;
          }
          throw error;
        }
        const payload = await response.json() as ArcGisResponse;
        if (payload.error) throw new Error(`ONS postcode service error ${payload.error.code ?? "unknown"}: ${payload.error.message ?? "no message"}`);
        if (payload.exceededTransferLimit) throw new Error("ONS postcode response exceeded the transfer limit; reduce the batch size.");
        const records = (payload.features ?? []).map((feature): OnsPostcodeRecord => {
          const attributes = feature.attributes ?? {};
          const postcode = normalisePostcode(String(attribute(attributes, "PCDS") ?? ""));
          const coordinate = coordinates(attribute(attributes, "LAT"), attribute(attributes, "LONG"), postcode);
          return Object.freeze({
            postcode, introduced: monthDate(attribute(attributes, "DOINTR")),
            terminated: monthDate(attribute(attributes, "DOTERM")), latitude: coordinate.latitude, longitude: coordinate.longitude,
            coordinateStatus: coordinate.coordinateStatus,
            countryCode: stringOrNull(attribute(attributes, "CTRY25CD")),
            localAuthorityCode: stringOrNull(attribute(attributes, "LAD25CD")), nhsRegionCode: stringOrNull(attribute(attributes, "NHSER24CD")),
            icbCode: stringOrNull(attribute(attributes, "ICB26CD")), subIcbCode: stringOrNull(attribute(attributes, "SICBL26CD")),
            lsoa2021Code: stringOrNull(attribute(attributes, "LSOA21CD")), msoa2021Code: stringOrNull(attribute(attributes, "MSOA21CD")),
            rurality2021Code: stringOrNull(attribute(attributes, "RUC21IND")),
          });
        });
        return Object.freeze(records);
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxRetries || (error instanceof Error && /invalid|transfer limit|service error/iu.test(error.message))) throw error;
        await delay(retryDelay(attempt, null));
      }
    }
    throw lastError;
  }
}

export const onsPostcodeEndpoint = officialEndpoint;
export const onsPostcodeQuarterlyEndpoint = officialQuarterlyEndpoint;
