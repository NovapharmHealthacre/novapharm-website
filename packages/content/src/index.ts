export type EvidenceState = "verified" | "owner_attested" | "pending_evidence" | "blocked";
export type PublicationDecision = "approved" | "hold" | "not_public";

export interface EvidenceReference {
  readonly state: EvidenceState;
  readonly source: string;
  readonly checkedOn: string;
  readonly publicUrl?: string;
}

export interface OrganisationEntity {
  readonly id: string;
  readonly websiteId: string;
  readonly publicName: string;
  readonly legalName: string;
  readonly companyNumber: string;
  readonly incorporatedOn: string;
  readonly website: string;
  readonly registeredJurisdiction: string;
  readonly registeredLocation: string;
  readonly registeredOfficeUse: "legal-record-only";
  readonly operatingStatus: {
    readonly corporate: "active";
    readonly commercialDevelopment: "active";
    readonly regulatedWholesaleSupply: "not_commenced_subject_to_authorisation";
    readonly logisticsInfrastructure: "contracted_third_party_owner_attested";
  };
  readonly evidence: readonly EvidenceReference[];
}

export interface PersonEntity {
  readonly id: string;
  readonly slug: string;
  readonly canonicalUrl: string;
  readonly canonicalName: string;
  readonly displayName: string;
  readonly publicTitle: string;
  readonly executiveRole: string;
  readonly previousPublishedTitle?: string;
  readonly titleDecision: PublicationDecision;
  readonly titleEvidence: EvidenceReference;
  readonly governanceFacts: readonly string[];
  readonly statutoryDirector: boolean;
  readonly regulatedAppointment?: {
    readonly title: string;
    readonly evidenceState: EvidenceState;
    readonly publicationDecision: PublicationDecision;
    readonly documentaryEvidenceState: EvidenceState;
    readonly evidenceRegister: string;
  };
  readonly imagePath?: string;
  readonly canonicalImageUrl?: string;
  readonly sameAs: readonly string[];
}

export const novapharmOrganisation: OrganisationEntity = Object.freeze({
  id: "https://novapharmhealthcare.com/#organization",
  websiteId: "https://novapharmhealthcare.com/#website",
  publicName: "NovaPharm Healthcare",
  legalName: "NOVAPHARM HEALTHCARE LTD",
  companyNumber: "16716501",
  incorporatedOn: "2025-09-15",
  website: "https://novapharmhealthcare.com",
  registeredJurisdiction: "England and Wales",
  registeredLocation: "Feltham, England",
  registeredOfficeUse: "legal-record-only",
  operatingStatus: Object.freeze({
    corporate: "active",
    commercialDevelopment: "active",
    regulatedWholesaleSupply: "not_commenced_subject_to_authorisation",
    logisticsInfrastructure: "contracted_third_party_owner_attested"
  }),
  evidence: Object.freeze([
    Object.freeze({
      state: "verified",
      source: "Companies House company record",
      checkedOn: "2026-07-30",
      publicUrl: "https://find-and-update.company-information.service.gov.uk/company/16716501"
    })
  ])
});

export const people: readonly PersonEntity[] = Object.freeze([
  Object.freeze({
    id: "https://vishal.novapharmhealthcare.com/#person",
    slug: "vishal-chakravarty",
    canonicalUrl: "https://vishal.novapharmhealthcare.com/about/",
    canonicalName: "Vishal Om Prakash Chakravarty",
    displayName: "Vishal Chakravarty",
    publicTitle: "Chief Executive Officer",
    executiveRole: "Chief Executive Officer",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "NovaPharm master specification", checkedOn: "2026-07-30" }),
    governanceFacts: Object.freeze(["Founder", "Statutory director"]),
    statutoryDirector: true,
    imagePath: "/assets/vishalchakravarty.jpeg",
    canonicalImageUrl: "https://vishal.novapharmhealthcare.com/images/portrait/vishal-chakravarty-1440.jpg",
    sameAs: Object.freeze([
      "https://uk.linkedin.com/in/vishal-chakravarty",
      "https://find-and-update.company-information.service.gov.uk/officers/GCJvCvEf20rHFbzF_T9LKAGEJic/appointments"
    ])
  }),
  Object.freeze({
    id: "https://novapharmhealthcare.com/leadership/prabhakar-lahare/#person",
    slug: "prabhakar-lahare",
    canonicalUrl: "https://novapharmhealthcare.com/leadership/prabhakar-lahare/",
    canonicalName: "Prabhakar Vitthal Lahare",
    displayName: "Prabhakar Vitthal Lahare",
    publicTitle: "Chief Operating Officer",
    executiveRole: "Chief Operating Officer",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "Owner-approved leadership-title record dated 2026-08-07", checkedOn: "2026-08-07" }),
    governanceFacts: Object.freeze(["Founder", "Statutory director"]),
    statutoryDirector: true,
    imagePath: "/assets/prabhakarvitthallahare.jpeg",
    sameAs: Object.freeze(["https://find-and-update.company-information.service.gov.uk/officers/WbYqt5GNwcUztqJmSS1Q-zuIra4/appointments"])
  }),
  Object.freeze({
    id: "https://novapharmhealthcare.com/leadership/girish-achliya/#person",
    slug: "girish-achliya",
    canonicalUrl: "https://novapharmhealthcare.com/leadership/girish-achliya/",
    canonicalName: "Dr Girish Shantilal Achliya",
    displayName: "Dr Girish Shantilal Achliya",
    publicTitle: "Chief Scientific Officer",
    executiveRole: "Chief Scientific Officer",
    previousPublishedTitle: "Chief Technical Director",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "Owner-approved leadership-title update dated 2026-08-17", checkedOn: "2026-08-17" }),
    governanceFacts: Object.freeze(["Statutory director"]),
    statutoryDirector: true,
    imagePath: "/assets/girishshantilalachliya.jpeg",
    sameAs: Object.freeze(["https://find-and-update.company-information.service.gov.uk/officers/ySPfnJGidBuLkYcU7u9BKT9Iyew/appointments"])
  }),
  Object.freeze({
    id: "https://novapharmhealthcare.com/leadership/helly-panchal/#person",
    slug: "helly-panchal",
    canonicalUrl: "https://novapharmhealthcare.com/leadership/helly-panchal/",
    canonicalName: "Dr Helly Kamlesh Panchal",
    displayName: "Dr Helly Panchal",
    publicTitle: "Chief Medical Director",
    executiveRole: "Chief Medical Director",
    previousPublishedTitle: "Director, Technical and Formulation",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "NovaPharm master specification", checkedOn: "2026-07-30" }),
    governanceFacts: Object.freeze(["Statutory director"]),
    statutoryDirector: true,
    sameAs: Object.freeze(["https://find-and-update.company-information.service.gov.uk/officers/bq-JYKh-sLwG0D5J5ooGbQb37xQ/appointments"])
  }),
  Object.freeze({
    id: "https://novapharmhealthcare.com/leadership/nishita-trivedi/#person",
    slug: "nishita-trivedi",
    canonicalUrl: "https://novapharmhealthcare.com/leadership/nishita-trivedi/",
    canonicalName: "Dr Nishita Trivedi",
    displayName: "Dr Nishita Trivedi",
    publicTitle: "Chief Technology Officer and Responsible Person",
    executiveRole: "Chief Technology Officer",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "Owner-approved leadership-title record dated 2026-08-07", checkedOn: "2026-08-07" }),
    governanceFacts: Object.freeze(["Responsible Person appointment", "Not a statutory director"]),
    statutoryDirector: false,
    regulatedAppointment: Object.freeze({
      title: "Responsible Person",
      evidenceState: "owner_attested",
      publicationDecision: "approved",
      documentaryEvidenceState: "pending_evidence",
      evidenceRegister: "docs/programme/owner-evidence-request-dr-nishita-responsible-person.md"
    }),
    sameAs: Object.freeze([])
  })
]);

export function personBySlug(slug: string): PersonEntity {
  const person = people.find((candidate) => candidate.slug === slug);
  if (!person) throw new Error(`Unknown NovaPharm person slug: ${slug}`);
  return person;
}
