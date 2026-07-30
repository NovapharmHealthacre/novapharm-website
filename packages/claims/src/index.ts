export type ClaimMaturity = "current" | "in_development" | "planned" | "subject_to_authorisation" | "not_operational";
export type ClaimEvidence = "verified" | "owner_attested" | "pending" | "not_applicable";
export type ClaimPublication = "approved" | "hold" | "blocked";
export type ClaimRisk = "corporate" | "regulated" | "commercial" | "technology";

export interface GovernedClaim {
  readonly id: string;
  readonly statement: string;
  readonly maturity: ClaimMaturity;
  readonly evidence: ClaimEvidence;
  readonly publication: ClaimPublication;
  readonly risk: ClaimRisk;
  readonly owner: string;
  readonly reviewedOn: string;
  readonly reviewBy: string;
  readonly evidenceUrl?: string;
}

export interface ClaimDecision {
  readonly publishable: boolean;
  readonly reason: string;
}

export const claimRegistry: readonly GovernedClaim[] = Object.freeze([
  Object.freeze({
    id: "company.pre-operational-wholesale",
    statement: "NovaPharm is pre-operational for regulated wholesale supply and will not commence regulated wholesale activities until the required authorisations and other applicable permissions are in place.",
    maturity: "subject_to_authorisation",
    evidence: "owner_attested",
    publication: "approved",
    risk: "regulated",
    owner: "Regulatory and corporate governance",
    reviewedOn: "2026-07-30",
    reviewBy: "2026-10-30"
  }),
  Object.freeze({
    id: "company.no-product-availability-assertion",
    statement: "Portfolio content describes strategic categories and planning priorities; it does not assert that a medicine is currently available from NovaPharm.",
    maturity: "not_operational",
    evidence: "not_applicable",
    publication: "approved",
    risk: "commercial",
    owner: "Commercial and regulatory review",
    reviewedOn: "2026-07-30",
    reviewBy: "2026-10-30"
  }),
  Object.freeze({
    id: "company.no-nhs-supply-assertion",
    statement: "NovaPharm does not currently claim achieved commercial supply to NHS trusts.",
    maturity: "not_operational",
    evidence: "not_applicable",
    publication: "approved",
    risk: "commercial",
    owner: "Commercial governance",
    reviewedOn: "2026-07-30",
    reviewBy: "2026-10-30"
  }),
  Object.freeze({
    id: "logistics.partner-plan",
    statement: "NovaPharm plans to use qualified third-party pharmaceutical logistics; provider identity, scope and operating commitments remain subject to contract, authorisation and onboarding.",
    maturity: "planned",
    evidence: "owner_attested",
    publication: "approved",
    risk: "commercial",
    owner: "Operations and legal",
    reviewedOn: "2026-07-30",
    reviewBy: "2026-10-30"
  }),
  Object.freeze({
    id: "technology.ai-governance",
    statement: "NovaPharm's internal AI capabilities are governed prototypes in development; they do not make autonomous regulatory, quality, clinical or commercial decisions.",
    maturity: "in_development",
    evidence: "owner_attested",
    publication: "approved",
    risk: "technology",
    owner: "Technology and information governance",
    reviewedOn: "2026-07-30",
    reviewBy: "2026-10-30"
  }),
  Object.freeze({
    id: "regulatory.responsible-person-appointment",
    statement: "A named NovaPharm Responsible Person appointment is operational.",
    maturity: "current",
    evidence: "pending",
    publication: "hold",
    risk: "regulated",
    owner: "Regulatory governance",
    reviewedOn: "2026-07-30",
    reviewBy: "2026-08-30"
  })
]);

const safeFutureLanguage = /\b(plans?|planned|preparing|in development|subject to|will not|does not currently|not operational|does not assert)\b/i;

export function evaluateClaim(claim: GovernedClaim, onDate = new Date()): ClaimDecision {
  if (claim.publication !== "approved") return { publishable: false, reason: `Publication state is ${claim.publication}.` };
  if (Date.parse(`${claim.reviewBy}T23:59:59Z`) < onDate.getTime()) return { publishable: false, reason: "The evidence review date has expired." };
  if (claim.maturity === "current" && claim.evidence !== "verified") return { publishable: false, reason: "A current operational claim requires verified evidence." };
  if (claim.risk === "regulated" && claim.maturity === "current" && !claim.evidenceUrl) return { publishable: false, reason: "A current regulated claim requires a public or controlled evidence reference." };
  if (["planned", "in_development", "subject_to_authorisation", "not_operational"].includes(claim.maturity) && !safeFutureLanguage.test(claim.statement)) {
    return { publishable: false, reason: "A non-current claim must state its maturity clearly in visible wording." };
  }
  return { publishable: true, reason: "The wording, evidence and review gates permit publication." };
}

export function claimById(id: string): GovernedClaim {
  const claim = claimRegistry.find((candidate) => candidate.id === id);
  if (!claim) throw new Error(`Unknown governed claim: ${id}`);
  return claim;
}
