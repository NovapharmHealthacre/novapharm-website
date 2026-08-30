import { createHash } from "node:crypto";

export interface CsvResourceSample {
  readonly bytes: Uint8Array;
  readonly byteCount: number;
  readonly totalResourceBytes: number;
  readonly contentRange: string;
  readonly sha256: string;
  readonly sourceUrl: string;
}

function approvedUrl(value: string): URL {
  const url = new URL(value);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error("Source samples require HTTPS outside loopback tests.");
  return url;
}

export async function downloadCsvResourceSample(
  sourceUrl: string,
  maximumBytes: number,
  options: Readonly<{ fetchImplementation?: typeof fetch; signal?: AbortSignal; userAgent?: string }> = {},
): Promise<CsvResourceSample> {
  const url = approvedUrl(sourceUrl);
  if (!Number.isInteger(maximumBytes) || maximumBytes < 65_536 || maximumBytes > 16 * 1024 * 1024) throw new Error("CSV sample size must be between 64 KiB and 16 MiB.");
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const response = await fetchImplementation(url, {
    headers: {
      Accept: "text/csv, text/plain, application/octet-stream",
      Range: `bytes=0-${maximumBytes - 1}`,
      "User-Agent": options.userAgent ?? "NovaPharm-Medicines-Intelligence/0.1 (+https://novapharmhealthcare.com)",
    },
    redirect: "follow",
    signal: options.signal ?? AbortSignal.timeout(120_000),
  });
  if (response.status !== 206) throw new Error(`Source sample endpoint did not honour the bounded byte range (HTTP ${response.status}).`);
  const type = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (type && !type.includes("csv") && !type.includes("text/plain") && !type.includes("octet-stream")) throw new Error("Source sample returned an unexpected content type.");
  const contentRange = String(response.headers.get("content-range") ?? "");
  const match = /^bytes 0-(\d+)\/(\d+)$/u.exec(contentRange);
  if (!match) throw new Error("Source sample response has no valid Content-Range evidence.");
  const lastByte = Number(match[1]);
  const totalResourceBytes = Number(match[2]);
  if (!Number.isSafeInteger(lastByte) || !Number.isSafeInteger(totalResourceBytes) || totalResourceBytes <= lastByte) throw new Error("Source sample Content-Range is invalid.");
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maximumBytes) throw new Error("Source sample response exceeds the approved byte limit.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maximumBytes || bytes.length !== lastByte + 1) throw new Error("Source sample byte count does not match its range evidence.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return Object.freeze({ bytes, byteCount: bytes.length, totalResourceBytes, contentRange, sha256, sourceUrl: url.href });
}
