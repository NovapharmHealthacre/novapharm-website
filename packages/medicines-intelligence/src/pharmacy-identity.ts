import { createHash } from "node:crypto";
import type { Jurisdiction } from "./types.ts";

export interface PharmacySeedIdentityInput {
  readonly country: Jurisdiction;
  readonly registration: string;
  readonly contractorCode: string;
  readonly workbookSha256: string;
  readonly masterRow: number;
}

export interface PharmacyIdentifierCandidate {
  readonly type: "GPHC_PREMISES" | "PSNI_SOURCE_REGISTRATION" | "NHS_CONTRACTOR_CODE" | "NI_ODS_OR_REGULATOR_CODE" | "NATION_CONTRACTOR_CODE";
  readonly value: string;
  readonly authority: string;
  readonly priority: 1 | 2;
}

export interface PharmacyEmailAssessment {
  readonly status: "verified" | "no_new_evidence" | "review_required";
  readonly email: string | null;
  readonly verifiedAt: string | null;
  readonly marketingEligible: false;
  readonly reason: string;
}

const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function isNhsOperationalDomain(email: string): boolean {
  const domain = email.split("@").at(-1) ?? "";
  return ["nhs.uk", "nhs.net", "hscni.net"].some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`));
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function pharmacyIdentifierCandidates(country: Jurisdiction, registrationInput: string, contractorInput: string): readonly PharmacyIdentifierCandidate[] {
  const registration = registrationInput.trim().toUpperCase();
  const contractor = contractorInput.trim().toUpperCase();
  const candidates: PharmacyIdentifierCandidate[] = [];
  if (registration) candidates.push(Object.freeze({
    type: country === "Northern Ireland" ? "PSNI_SOURCE_REGISTRATION" : "GPHC_PREMISES",
    value: registration,
    authority: country === "Northern Ireland" ? "Source-supplied PSNI registration field" : "Source-supplied GPhC premises field",
    priority: 1,
  }));
  if (contractor) candidates.push(Object.freeze({
    type: country === "England" ? "NHS_CONTRACTOR_CODE" : country === "Northern Ireland" ? "NI_ODS_OR_REGULATOR_CODE" : "NATION_CONTRACTOR_CODE",
    value: contractor,
    authority: country === "England" ? "NHS dispensing contractor code" : "Nation-specific source identifier",
    priority: 2,
  }));
  return Object.freeze(candidates);
}

export function pharmacySeedIdentity(input: PharmacySeedIdentityInput): string {
  if (!Number.isSafeInteger(input.masterRow) || input.masterRow < 1 || !/^[a-f0-9]{64}$/u.test(input.workbookSha256)) throw new Error("Pharmacy seed identity evidence is invalid.");
  const candidates = pharmacyIdentifierCandidates(input.country, input.registration, input.contractorCode);
  const strongest = candidates[0];
  const material = strongest ? `${strongest.type}\u001f${strongest.value}` : `WORKBOOK_ROW\u001f${input.workbookSha256}\u001f${input.masterRow}`;
  return `pharmacy-${digest(material)}`;
}

export function assessPharmacyEmail(emailInput: string, statusInput: string, checkedAtInput: string): PharmacyEmailAssessment {
  const email = emailInput.trim().toLowerCase();
  const status = statusInput.trim();
  const checkedAt = checkedAtInput.trim() || null;
  const publicBusinessEmail = Boolean(email && emailShape.test(email) && !isNhsOperationalDomain(email));
  if (status === "VERIFIED REAL EMAIL" && publicBusinessEmail) {
    return Object.freeze({ status: "verified", email, verifiedAt: checkedAt, marketingEligible: false, reason: "Evidence-backed public non-NHS business email supplied by the governed workbook." });
  }
  if (!email && status.startsWith("ACTIONED")) {
    return Object.freeze({ status: "no_new_evidence", email: null, verifiedAt: null, marketingEligible: false, reason: "Research was actioned without a defensible public non-NHS email; the value remains blank." });
  }
  return Object.freeze({ status: "review_required", email: email || null, verifiedAt: null, marketingEligible: false, reason: "Email value and evidence status are inconsistent or the address is not an eligible public non-NHS business email." });
}
