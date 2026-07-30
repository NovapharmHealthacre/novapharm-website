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
  readonly operatingStatus: "pre_operational_regulated_wholesale";
  readonly evidence: readonly EvidenceReference[];
}

export interface PersonEntity {
  readonly id: string;
  readonly slug: string;
  readonly canonicalUrl: string;
  readonly canonicalName: string;
  readonly displayName: string;
  readonly publicTitle: string;
  readonly previousPublishedTitle?: string;
  readonly titleDecision: PublicationDecision;
  readonly titleEvidence: EvidenceReference;
  readonly governanceFacts: readonly string[];
  readonly statutoryDirector: boolean;
  readonly regulatedAppointment?: {
    readonly requestedTitle: string;
    readonly evidenceState: EvidenceState;
    readonly publicationDecision: PublicationDecision;
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
  operatingStatus: "pre_operational_regulated_wholesale",
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
    publicTitle: "Founder and Director",
    previousPublishedTitle: "Managing Director and Chief Operating Officer",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "NovaPharm master specification", checkedOn: "2026-07-30" }),
    governanceFacts: Object.freeze(["Statutory director"]),
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
    publicTitle: "Chief Technical Director",
    previousPublishedTitle: "Director and Chief Scientific Officer",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "NovaPharm master specification", checkedOn: "2026-07-30" }),
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
    publicTitle: "Quality and Regulatory Adviser",
    titleDecision: "approved",
    titleEvidence: Object.freeze({ state: "owner_attested", source: "Current approved public profile", checkedOn: "2026-07-30" }),
    governanceFacts: Object.freeze(["Specialist adviser", "Not presented as a statutory director"]),
    statutoryDirector: false,
    regulatedAppointment: Object.freeze({ requestedTitle: "Responsible Person", evidenceState: "pending_evidence", publicationDecision: "hold" }),
    sameAs: Object.freeze([])
  })
]);

export function personBySlug(slug: string): PersonEntity {
  const person = people.find((candidate) => candidate.slug === slug);
  if (!person) throw new Error(`Unknown NovaPharm person slug: ${slug}`);
  return person;
}
