/**
 * Read-only UK procurement discovery. An initial bounded inspection of public OCDS
 * releases, NOT a complete tender index, eligibility check, or bid recommendation.
 * No records are written, no notifications or tender applications are sent.
 */
const sourceUrl = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";
const sourceId = "uk-cabinet-office.find-a-tender.ocds-release";
const officialNotice = /^\d{6}-\d{4}$/u;
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

export async function discoverUkTenderNotices(queryInput, context, {
  fetchImpl = globalThis.fetch, now = new Date(),
} = {}) {
  requireBoard(context);
  const query = validQuery(queryInput);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw invalid("An invalid search window was supplied.");
  const updatedFrom = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 19);
  const updatedTo = now.toISOString().slice(0, 19);
  const url = new URL(sourceUrl);
  url.searchParams.set("updatedFrom", updatedFrom);
  url.searchParams.set("updatedTo", updatedTo);
  url.searchParams.set("limit", "50");

  let body;
  try {
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || !String(response.headers.get("content-type") || "").includes("json")) throw upstreamError();
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 4000000) throw upstreamError();
    const raw = await response.text();
    if (raw.length > 4000000) throw upstreamError();
    body = JSON.parse(raw);
  } catch {
    throw upstreamError();
  }
  if (!Array.isArray(body?.releases) || body.releases.length > 50) throw upstreamError();
  const phrase = query.toLocaleLowerCase("en-GB");
  const matches = [];
  for (const release of body.releases) {
    if (!release || typeof release !== "object") continue;
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
  return {
    contract: "novapharm.intelligence.uk-tender-discovery.v1",
    sourceId, publisher: "UK Cabinet Office / Find a Tender",
    sourceUrl, sourceLicence: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    query, updatedFrom, updatedTo, retrievedAt: now.toISOString(),
    examinedReleases: body.releases.length, matches,
    truncated: Boolean(body.links?.next) || body.releases.length === 50,
    coverage: "First 50 notices updated in the last seven days, filtered locally by exact phrase. Not a complete tender search.",
    decisionReady: false, customerAvailable: false, automaticApplication: false,
    limitations: [
      "The sampled update window is not an exhaustive market, and absence of matches is not proof of no opportunities.",
      "The publisher notice is not proof of medicine-level matching, application eligibility, status or deadline.",
      "Check the official notice, legal procurement terms, product rights and commercial qualification with a human reviewer.",
      "No tender application, notification, inventory claim or supplier communication is performed.",
    ],
  };
}
