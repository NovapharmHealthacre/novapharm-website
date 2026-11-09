const CLINICAL_TRIALS_ENDPOINT = "https://clinicaltrials.gov/api/v2/studies";
const MAX_RESULTS = 5;

function deny(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function normaliseIntervention(value) {
  const term = String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!/^[a-zA-Z][a-zA-Z0-9 -]{1,79}$/u.test(term)) {
    throw deny("Enter an intervention or medicine name using 2–80 letters, numbers, spaces or hyphens.", 400);
  }
  return term;
}

function safeText(value, maximum = 240) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/gu, " ").trim().slice(0, maximum) : null;
}

function safeDate(value) {
  const text = safeText(value, 20);
  return text && /^\d{4}-\d{2}(?:-\d{2})?$/u.test(text) ? text : null;
}

function normaliseStudy(value) {
  const p = value?.protocolSection;
  const identification = p?.identificationModule ?? {};
  const status = p?.statusModule ?? {};
  const design = p?.designModule ?? {};
  const sponsor = p?.sponsorCollaboratorsModule ?? {};
  const nctId = /^NCT\d{8}$/u.test(String(identification.nctId || "")) ? identification.nctId : null;
  return {
    nctId,
    title: safeText(identification.briefTitle, 300),
    overallStatus: safeText(status.overallStatus, 50),
    phases: Array.isArray(design.phases) ? design.phases.filter((phase) => typeof phase === "string").slice(0, 4).map((phase) => safeText(phase, 40)) : [],
    studyType: safeText(design.studyType, 60),
    sponsor: safeText(sponsor.leadSponsor?.name, 180),
    firstPosted: safeDate(status.studyFirstPostDateStruct?.date),
    lastUpdatePosted: safeDate(status.lastUpdatePostDateStruct?.date),
    sourceUrl: nctId ? `https://clinicaltrials.gov/study/${nctId}` : null,
  };
}

/**
 * Board-only discovery of public registry metadata; no trial eligibility,
 * treatment suitability, regulatory approval or commercial source rights are inferred.
 * Caller must enforce private session scope and request rate limits.
 */
export async function searchClinicalTrialsStudies(intervention, context, options = {}) {
  if (!context?.accessScopes?.includes("board") && !context?.accessScopes?.includes("admin")) {
    throw deny("Executive Medicines Intelligence access required.", 403);
  }
  const query = normaliseIntervention(intervention);
  const url = new URL(CLINICAL_TRIALS_ENDPOINT);
  url.searchParams.set("query.intr", query);
  url.searchParams.set("pageSize", String(MAX_RESULTS));
  url.searchParams.set("format", "json");
  url.searchParams.set("countTotal", "true");

  let upstream;
  try {
    upstream = await (options.fetchImpl ?? fetch)(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    throw deny("The ClinicalTrials.gov source could not be reached. No study state was inferred.", 503);
  }
  if (!upstream.ok) throw deny("The ClinicalTrials.gov source is unavailable. No study state was inferred.", 503);

  let data;
  try {
    data = await upstream.json();
  } catch {
    throw deny("The ClinicalTrials.gov source returned an invalid response.", 503);
  }
  if (!data || !Array.isArray(data.studies)) {
    throw deny("The ClinicalTrials.gov source response does not match the accepted registry contract.", 503);
  }
  const studies = data.studies.slice(0, MAX_RESULTS).map(normaliseStudy);
  const total = Number.isSafeInteger(data.totalCount) && data.totalCount >= 0 ? data.totalCount : null;
  return {
    query,
    sourceId: "us.nlm.clinicaltrials-gov-v2",
    publisher: "U.S. National Library of Medicine / ClinicalTrials.gov",
    sourceEndpoint: CLINICAL_TRIALS_ENDPOINT,
    jurisdiction: "International study registrations (US registry)",
    recordType: "public-clinical-study-registry",
    retrievedAt: new Date().toISOString(),
    dataState: studies.length ? "public_registry_records" : "no_source_matches",
    records: studies,
    truncated: Boolean(data.nextPageToken) || (total !== null && total > MAX_RESULTS),
    matchedCountReported: total,
    productionReuseRightsCertified: false,
    limitations: [
      "Study registration does not prove clinical efficacy, trial enrolment availability or regulatory approval.",
      "Registry entries are sponsor-submitted and must be checked against the dated primary record.",
      "These records are not patient-specific advice or approved market/commercial intelligence.",
      "Persistent commercial reuse, derivatives and external AI processing require independent source-rights review.",
    ],
  };
}
