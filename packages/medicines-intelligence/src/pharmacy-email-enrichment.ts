import { normalisePostcode } from "./geography.ts";
import type { DohsOrganisation } from "./nhs-api-clients.ts";

export interface PharmacyEmailEnrichmentSubject {
  readonly pharmacyId: string;
  readonly odsCode: string;
  readonly postcode: string;
  readonly lastEvidenceCutoffAt?: string | null;
}

export interface PharmacyEmailCandidateEvidence {
  readonly pharmacyId: string;
  readonly odsCode: string;
  readonly contactType: "public_business_email" | "nhs_shared_email";
  readonly contactValue: string;
  readonly sourceType: "nhs_dohs_v3";
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly status: "candidate";
  readonly confidence: "exact_ods_and_postcode";
  readonly evidenceExcerpt: string;
  readonly marketingEligible: false;
}

export interface PharmacyEmailEnrichmentAssessment {
  readonly decision: "candidate_evidence_found" | "no_email_evidence" | "organisation_mismatch" | "cutoff_not_advanced";
  readonly matchedOrganisations: number;
  readonly rejectedContacts: number;
  readonly candidates: readonly PharmacyEmailCandidateEvidence[];
  readonly marketingEligible: false;
}

const emailShape = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/u;

function normaliseOdsCode(value: string): string {
  const code = value.normalize("NFKC").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,15}$/u.test(code)) throw new Error("Pharmacy ODS code has an invalid format.");
  return code;
}

function normaliseEmail(value: string): string | null {
  const email = value.normalize("NFKC").trim().toLowerCase();
  if (!email || email.length > 320 || !emailShape.test(email) || /[\u0000-\u001F\u007F]/u.test(email)) return null;
  return email;
}

function isNhsSharedEmail(email: string): boolean {
  const domain = email.split("@").at(-1) ?? "";
  return ["nhs.uk", "nhs.net", "hscni.net"].some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`));
}

function isoTimestamp(value: string, label: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(`${label} must be an ISO-8601 timestamp.`);
  return new Date(time).toISOString();
}

function governedSourceUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || !(url.hostname === "nhs.uk" || url.hostname.endsWith(".nhs.uk"))) {
    throw new Error("DoHS evidence URL must remain within an HTTPS NHS boundary.");
  }
  url.username = "";
  url.password = "";
  return url.href;
}

export function assessDohsEmailEvidence(
  subject: PharmacyEmailEnrichmentSubject,
  organisations: readonly DohsOrganisation[],
  options: Readonly<{ checkedAt: string; sourceUrl: string }>,
): PharmacyEmailEnrichmentAssessment {
  if (!subject.pharmacyId.trim() || subject.pharmacyId.length > 128) throw new Error("Pharmacy identity is invalid.");
  const odsCode = normaliseOdsCode(subject.odsCode);
  const postcode = normalisePostcode(subject.postcode);
  const checkedAt = isoTimestamp(options.checkedAt, "DoHS observation time");
  const sourceUrl = governedSourceUrl(options.sourceUrl);
  if (subject.lastEvidenceCutoffAt) {
    const cutoff = isoTimestamp(subject.lastEvidenceCutoffAt, "Evidence cutoff");
    if (Date.parse(checkedAt) <= Date.parse(cutoff)) {
      return Object.freeze({ decision: "cutoff_not_advanced", matchedOrganisations: 0, rejectedContacts: 0, candidates: Object.freeze([]), marketingEligible: false });
    }
  }
  const matched = organisations.filter((organisation) => {
    if (organisation.odsCode !== odsCode || !organisation.postcode) return false;
    try { return normalisePostcode(organisation.postcode) === postcode; } catch { return false; }
  });
  if (!matched.length) {
    return Object.freeze({ decision: "organisation_mismatch", matchedOrganisations: 0, rejectedContacts: 0, candidates: Object.freeze([]), marketingEligible: false });
  }
  let rejectedContacts = 0;
  const observed = new Map<string, PharmacyEmailCandidateEvidence>();
  for (const organisation of matched) {
    for (const contact of organisation.contacts) {
      const email = contact.method?.toLowerCase().includes("email") ? normaliseEmail(contact.value) : null;
      if (!email) {
        rejectedContacts += 1;
        continue;
      }
      const contactType = isNhsSharedEmail(email) ? "nhs_shared_email" : "public_business_email";
      const key = `${contactType}\u001f${email}`;
      observed.set(key, Object.freeze({
        pharmacyId: subject.pharmacyId,
        odsCode,
        contactType,
        contactValue: email,
        sourceType: "nhs_dohs_v3",
        sourceUrl,
        checkedAt,
        status: "candidate",
        confidence: "exact_ods_and_postcode",
        evidenceExcerpt: "DoHS v3 contact matched the exact current ODS code and postcode; human approval remains required.",
        marketingEligible: false,
      }));
    }
  }
  const candidates = Object.freeze([...observed.values()]);
  return Object.freeze({
    decision: candidates.length ? "candidate_evidence_found" : "no_email_evidence",
    matchedOrganisations: matched.length,
    rejectedContacts,
    candidates,
    marketingEligible: false,
  });
}
