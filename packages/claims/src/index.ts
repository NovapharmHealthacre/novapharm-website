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
    id: "leadership.nishita-current-title",
    statement: "Dr Nishita Trivedi's owner-approved current public title is Chief Technology Officer and Responsible Person. Chief Technology Officer is the executive responsibility; Responsible Person is a distinct regulated appointment. The title does not represent MHRA authority, regulatory approval powers, or prescribing, medical or clinical authority.",
    maturity: "current",
    evidence: "owner_attested",
    publication: "approved",
    risk: "corporate",
    owner: "Board and regulatory governance",
    reviewedOn: "2026-08-07",
    reviewBy: "2026-11-07"
  }),
  Object.freeze({
    id: "leadership.prabhakar-current-title",
    statement: "Prabhakar Vitthal Lahare's owner-approved current executive title is Chief Operating Officer; founder and statutory-director status are separate governance facts.",
    maturity: "current",
    evidence: "owner_attested",
    publication: "approved",
    risk: "corporate",
    owner: "Board and corporate governance",
    reviewedOn: "2026-08-07",
    reviewBy: "2026-11-07"
  }),
  Object.freeze({
    id: "company.regulated-wholesale-authorisation-boundary",
    statement: "NovaPharm Healthcare is an active UK company undertaking corporate, product, partnership and commercial-development work. Regulated wholesale supply has not commenced and will begin only after the required authorisations and applicable operating controls are in place.",
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
    id: "logistics.polar-speed-contracted-infrastructure",
    statement: "NovaPharm has owner-attested contracted logistics and warehousing arrangements with Polar Speed for intended operations, governed by the applicable service and quality-agreement controls. This does not attribute Polar Speed's authorisations or certificates to NovaPharm and does not authorise NovaPharm regulated wholesale supply.",
    maturity: "current",
    evidence: "owner_attested",
    publication: "approved",
    risk: "commercial",
    owner: "Operations and legal",
    reviewedOn: "2026-07-30",
    reviewBy: "2026-10-30"
  }),
  Object.freeze({
    id: "logistics.polar-speed-certificate-boundary",
    statement: "No Polar Speed WDA(H), GDP certificate or site authorisation is represented as a NovaPharm authorisation; certificate-specific public wording remains on hold until the exact holder, number, site, scope, effective date and restrictions are verified from official evidence.",
    maturity: "subject_to_authorisation",
    evidence: "pending",
    publication: "approved",
    risk: "regulated",
    owner: "Regulatory governance and operations",
    reviewedOn: "2026-08-01",
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
    statement: "The formal controlled appointment record for NovaPharm's named Responsible Person remains pending documentary verification for the applicable legal entity, authorisation, site and scope.",
    maturity: "current",
    evidence: "pending",
    publication: "hold",
    risk: "regulated",
    owner: "Regulatory governance",
    reviewedOn: "2026-08-07",
    reviewBy: "2026-09-07"
  })
]);

const safeFutureLanguage = /\b(plans?|planned|preparing|in development|subject to|will not|will begin only after|has not commenced|does not currently|not operational|does not assert|remains on hold)\b/i;

export function evaluateClaim(claim: GovernedClaim, onDate = new Date()): ClaimDecision {
  if (claim.publication !== "approved") return { publishable: false, reason: `Publication state is ${claim.publication}.` };
  if (Date.parse(`${claim.reviewBy}T23:59:59Z`) < onDate.getTime()) return { publishable: false, reason: "The evidence review date has expired." };
  if (claim.maturity === "current" && !["verified", "owner_attested"].includes(claim.evidence)) {
    return { publishable: false, reason: "A current operational claim requires verified or controlled owner-attested evidence." };
  }
  if (claim.risk === "regulated" && claim.maturity === "current" && claim.evidence !== "verified") {
    return { publishable: false, reason: "A current regulated claim requires verified evidence." };
  }
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
