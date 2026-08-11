import type { CorporatePage, NarrativeSection } from "./pages";

interface NarrativePresentation {
  readonly heroTitle: string;
  readonly intro: string;
  readonly sections: readonly NarrativeSection[];
}

const conciseNarrativeBySlug: Readonly<Record<string, NarrativePresentation>> = Object.freeze({
  about: {
    heroTitle: "Pharmaceutical access, governed from the start.",
    intro: "NovaPharm is building a qualified route between supply, regulation and UK healthcare demand.",
    sections: [
      {
        kicker: "Operating model",
        title: "Connect the evidence before the product moves.",
        paragraphs: [
          "Product rights, source qualification, regulatory status, quality evidence and custody are treated as one controlled decision chain.",
        ],
        bullets: ["Compliance before release", "Product-specific evidence", "Qualified partners", "Accountable decisions"],
      },
      {
        kicker: "Current status",
        title: "Development is not authorisation.",
        paragraphs: ["NovaPharm is in corporate and commercial development. Regulated wholesale supply has not commenced."],
        source: { label: "Review regulatory readiness", href: "/regulatory-services/" },
      },
    ],
  },
  "about/company": {
    heroTitle: "A UK company building a controlled pharmaceutical model.",
    intro: "NovaPharm Healthcare Ltd is incorporated in England and Wales. Incorporation does not authorise pharmaceutical wholesale activity.",
    sections: [
      {
        kicker: "Company",
        title: "Verified corporate identity.",
        paragraphs: ["NOVAPHARM HEALTHCARE LTD is registered under company number 16716501."],
        source: { label: "View Companies House", href: "https://find-and-update.company-information.service.gov.uk/company/16716501" },
      },
      {
        kicker: "Model",
        title: "Diversified sourcing. One qualification standard.",
        paragraphs: ["The proposed model combines manufacturing relationships, product-specific parallel-import assessment, qualified European sourcing and controlled third-party logistics."],
      },
    ],
  },
  "about/governance": {
    heroTitle: "Governance that keeps claims and decisions accountable.",
    intro: "Board oversight, quality independence and evidence boundaries shape every material decision.",
    sections: [
      {
        kicker: "Accountability",
        title: "Commercial interest cannot approve regulated activity.",
        paragraphs: ["Material product, supplier, customer, quality and release decisions require named owners, evidence and escalation routes."],
        bullets: ["Board oversight", "Quality escalation", "Approval boundaries", "Audit-ready records"],
      },
      {
        kicker: "Claims",
        title: "State only what the evidence supports.",
        paragraphs: ["Licences, products, partnerships, facilities and technology are not presented as operational until evidence supports that status."],
      },
    ],
  },
  "trust-centre": {
    heroTitle: "Trust should be verifiable.",
    intro: "Corporate identity, security, privacy, accessibility and pharmaceutical claims each have an explicit evidence boundary.",
    sections: [
      {
        kicker: "Corporate status",
        title: "Incorporated does not mean authorised.",
        paragraphs: ["NOVAPHARM HEALTHCARE LTD is registered under company number 16716501. That record does not confer pharmaceutical licences or authority to begin regulated wholesale supply."],
        source: { label: "Verify Companies House", href: "https://find-and-update.company-information.service.gov.uk/company/16716501" },
      },
      {
        kicker: "Assurance",
        title: "Built, deployed and independently verified are different states.",
        paragraphs: ["Repository controls do not by themselves prove live Azure services, Entra enforcement, third-party permissions, penetration testing or regulatory approval."],
      },
      {
        kicker: "Security & privacy",
        title: "Protected systems use server-side trust boundaries.",
        paragraphs: ["Authentication, organisation isolation, CSRF protection, sessions, private documents and audit events are governed server-side."],
        source: { label: "Read the privacy notice", href: "/legal/privacy/" },
      },
      {
        kicker: "Access & concerns",
        title: "Accessibility and concerns have a clear route.",
        paragraphs: ["NovaPharm targets WCAG 2.2 AA. Privacy, security, accessibility and factual concerns can be raised through the corporate contact route."],
        source: { label: "Contact NovaPharm", href: "/contact/" },
      },
    ],
  },
  "investor-information": {
    heroTitle: "Investor information, without inflated claims.",
    intro: "A concise view of the planned operating model, governance and execution boundaries.",
    sections: [
      {
        kicker: "Strategy",
        title: "Compliance-first and capital-efficient.",
        paragraphs: ["NovaPharm plans to coordinate qualified supply, regulatory pathways, outsourced logistics and digital control without claiming facilities it does not own."],
        bullets: ["Oncology and specialty focus", "Diversified sourcing", "Third-party logistics", "Unified digital control"],
      },
      {
        kicker: "Boundary",
        title: "Targets are not achievements.",
        paragraphs: ["Revenue, fundraising, approvals and commercial relationships are not presented as fact without supporting evidence."],
        source: { label: "Discuss a strategic opportunity", href: "/contact/?enquiry=Strategic%20partnership" },
      },
    ],
  },
  careers: {
    heroTitle: "Build disciplined systems before scale.",
    intro: "Future roles may span quality, regulatory affairs, sourcing, operations, partnerships, data and technology.",
    sections: [
      {
        kicker: "Working principles",
        title: "Judgement. Evidence. Accountability.",
        paragraphs: ["NovaPharm values specialist thinking, respectful challenge and decisions that can be explained and traced."],
        bullets: ["Regulatory integrity", "Respectful challenge", "Documented decisions", "Inclusive work"],
      },
      {
        kicker: "Open roles",
        title: "Only live vacancies are advertised.",
        paragraphs: ["Professional interest can be submitted without sending identity documents or unnecessary sensitive data."],
        source: { label: "Submit a careers enquiry", href: "/contact/?enquiry=Careers" },
      },
    ],
  },
});

export function presentationPage(page: CorporatePage): CorporatePage {
  const presentation = conciseNarrativeBySlug[page.slug];
  if (!presentation || page.kind !== "narrative") return page;

  return Object.freeze({
    ...page,
    heroTitle: presentation.heroTitle,
    intro: presentation.intro,
    sections: presentation.sections,
  });
}
