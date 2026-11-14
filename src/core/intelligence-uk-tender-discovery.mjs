/**
 * Read-only UK procurement discovery. A bounded inspection of public OCDS
 * releases, NOT a complete tender index, eligibility check, or bid recommendation.
 * No records are written, no notifications or tender applications are sent.
 */
const sourceUrl = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";
const sourceId = "uk-cabinet-office.find-a-tender.ocds-release";
const officialNotice = /^\d{6}-\d{4}$/u;
const PAGE_LIMIT = 50;
const MAX_PAGES = 3;
const MAX_PAGE_BYTES = 4_000_000;
const MAX_TOTAL_BYTES = MAX_PAGE_BYTES * MAX_PAGES;
const MAX_CURSOR_CHARS = 1024;
const MAX_NEXT_URL_CHARS = 4096;
const invalid = (message) => Object.assign(new Error(message), { statusCode: 400 });
const upstreamError = () => Object.assign(new Error("The official UK tender source is temporarily unavailable."), { statusCode: 503 });

function requireBoard(context) {
  if (!context?.accessScopes?.includes("board") && !context?.accessScopes?.includes("admin")) {
    throw Object.assign(new Error("This professional research endpoint requires an authorised board session."), { statusCode: 403 });
  }
}

function validQuery(value) {
  const query = String(value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (query.length < 2 || query.length > 80 || !/^[\p{L}][\p{L}\p{N} .,'-]*$/u.test(query)) {
    throw invalid("Use a medicine or procurement phrase of 2–80 characters without URLs or special commands.");
  }
  return query;
}

function boundedString(value, limit = 240) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/gu, " ").trim().slice(0, limit) : "";
}

function nextPageUrl(value, currentUrl, updatedFrom, updatedTo) {
  if (typeof value !== "string" || !value.trim()) throw upstreamError();
  let next;
  try { next = new URL(value, currentUrl); } catch { throw upstreamError(); }
  const origin = new URL(sourceUrl);
  if (next.protocol !== "https:" || next.origin !== origin.origin ||
      next.pathname !== origin.pathname || next.username || next.password || next.hash ||
      next.href.length > MAX_NEXT_URL_CHARS) throw upstreamError();

  const allowed = new Set(["updatedFrom", "updatedTo", "limit", "cursor"]);
  const seen = new Set();
  for (const key of next.searchParams.keys()) {
    if (seen.has(key) || !allowed.has(key)) throw upstreamError();
    seen.add(key);
  }

  const cursors = next.searchParams.getAll("cursor");
  if (cursors.length !== 1 || cursors[0].length === 0 ||
      cursors[0].length > MAX_CURSOR_CHARS) throw upstreamError();

  // Only the publisher's opaque cursor may advance the frozen seven-day window.
  for (const [key, expected] of [
    ["updatedFrom", updatedFrom],
    ["updatedTo", updatedTo],
    ["limit", String(PAGE_LIMIT)],
  ]) {
    const values = next.searchParams.getAll(key);
    if (values.length > 1 || (values.length === 1 && values[0] !== expected)) throw upstreamError();
    next.searchParams.set(key, expected);
  }
  return next;
}

async function readBoundedBody(response, maxBytes) {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && contentLength !== undefined) {
    const value = String(contentLength);
    if (!/^(?:0|[1-9]\d*)$/u.test(value)) throw upstreamError();
    const length = Number(value);
    if (!Number.isSafeInteger(length) || length > maxBytes) throw upstreamError();
  }

  const reader = typeof response.body?.getReader === "function"
    ? response.body.getReader()
    : null;
  if (reader) {
    const chunks = [];
    let byteLength = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        if (!(part.value instanceof Uint8Array)) throw upstreamError();
        byteLength += part.value.byteLength;
        if (byteLength > maxBytes) {
          try { await reader.cancel(); } catch { /* preserve the bounded refusal */ }
          throw upstreamError();
        }
        chunks.push(part.value);
      }
    } finally {
      try { reader.releaseLock?.(); } catch { /* reader may already be cancelled */ }
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw upstreamError();
    }
  }

  // Compatibility path for injected test adapters without a streaming body.
  // Production Fetch responses use the bounded reader above.
  const raw = await response.text();
  if (typeof raw !== "string" || Buffer.byteLength(raw, "utf8") > maxBytes) throw upstreamError();
  return raw;
}

async function fetchReleasePage(url, fetchImpl) {
  try {
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    const contentType = String(response.headers.get("content-type") || "")
      .split(";", 1)[0].trim().toLowerCase();
    if (!response.ok ||
        (contentType !== "application/json" &&
          !/^application\/[a-z0-9][a-z0-9!#$&^_.+-]*\+json$/u.test(contentType))) {
      throw upstreamError();
    }
    const raw = await readBoundedBody(response, MAX_PAGE_BYTES);
    const body = JSON.parse(raw);
    if (!Array.isArray(body?.releases) || body.releases.length > PAGE_LIMIT) throw upstreamError();
    return { body, bytes: Buffer.byteLength(raw, "utf8") };
  } catch {
    throw upstreamError();
  }
}

export async function discoverUkTenderNotices(queryInput, context, {
  fetchImpl = globalThis.fetch, now = new Date(),
} = {}) {
  requireBoard(context);
  const query = validQuery(queryInput);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw invalid("An invalid search window was supplied.");
  const updatedFrom = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 19);
  const updatedTo = now.toISOString().slice(0, 19);
  const firstUrl = new URL(sourceUrl);
  firstUrl.searchParams.set("updatedFrom", updatedFrom);
  firstUrl.searchParams.set("updatedTo", updatedTo);
  firstUrl.searchParams.set("limit", String(PAGE_LIMIT));

  const releases = [];
  const visited = new Set();
  let pageUrl = firstUrl;
  let pageCount = 0;
  let examinedReleases = 0;
  let totalBytes = 0;
  let lastPageFull = false;
  while (pageUrl && pageCount < MAX_PAGES) {
    const key = pageUrl.toString();
    if (visited.has(key)) throw upstreamError();
    visited.add(key);
    const { body, bytes } = await fetchReleasePage(pageUrl, fetchImpl);
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) throw upstreamError();
    pageCount += 1;
    examinedReleases += body.releases.length;
    lastPageFull = body.releases.length === PAGE_LIMIT;
    releases.push(...body.releases);
    const next = body.links?.next;
    if (next == null || next === "") {
      pageUrl = null;
    } else {
      pageUrl = nextPageUrl(next, pageUrl, updatedFrom, updatedTo);
    }
  }

  const phrase = query.toLocaleLowerCase("en-GB");
  const matches = [];
  const seenReleaseIds = new Set();
  for (const release of releases) {
    if (!release || typeof release !== "object") continue;
    const releaseId = boundedString(release.id, 128);
    if (releaseId && seenReleaseIds.has(releaseId)) continue;
    if (releaseId) seenReleaseIds.add(releaseId);
    const title = boundedString(release.tender?.title);
    const description = boundedString(release.tender?.description, 1200);
    if (!(title + " " + description).toLocaleLowerCase("en-GB").includes(phrase)) continue;
    const noticeId = boundedString(release.id, 30);
    const tender = release.tender ?? {};
    matches.push({
      sourceId, releaseId: noticeId || null, ocid: boundedString(release.ocid, 128) || null,
      title: title || "Title not recorded in release",
      buyer: boundedString(tender.procuringEntity?.name, 200) || null,
      publishedAt: boundedString(release.date, 35) || null,
      tenderStatus: boundedString(tender.status, 40) || "not_assessed",
      noticeUrl: officialNotice.test(noticeId) ? "https://www.find-tender.service.gov.uk/Notice/" + noticeId : null,
      classification: "public_procurement_notice_unverified_for_medicine",
    });
  }

  const truncated = Boolean(pageUrl) ||
    examinedReleases >= PAGE_LIMIT * MAX_PAGES || lastPageFull;
  return {
    contract: "novapharm.intelligence.uk-tender-discovery.v1",
    sourceId, publisher: "UK Cabinet Office / Find a Tender",
    sourceUrl, sourceLicence: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    query, updatedFrom, updatedTo, retrievedAt: now.toISOString(),
    pageCount, examinedReleases, matches,
    truncated,
    coverage: "Up to " + (PAGE_LIMIT * MAX_PAGES) + " notices (" + MAX_PAGES + " pages of " + PAGE_LIMIT + ") updated in the last seven days, filtered locally by exact phrase. Still a bounded sample, not a complete tender search.",
    decisionReady: false, customerAvailable: false, automaticApplication: false,
    limitations: [
      "The bounded update window is not an exhaustive market, and absence of matches is not proof of no opportunities.",
      "The publisher notice is not proof of medicine-level matching, application eligibility, status or deadline.",
      "Check the official notice, legal procurement terms, product rights and commercial qualification with a human reviewer.",
      "No tender application, notification, inventory claim or supplier communication is performed.",
    ],
  };
}
