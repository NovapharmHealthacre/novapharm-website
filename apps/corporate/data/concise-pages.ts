import type { CorporatePage } from "./pages";

const heroCopy: Readonly<Record<string, { readonly title: string; readonly intro: string }>> = Object.freeze({
  about: {
    title: "Pharmaceutical access, governed from the start.",
    intro: "NovaPharm connects qualified supply, regulatory readiness and UK healthcare demand through one controlled B2B model.",
  },
  "about/company": {
    title: "A UK pharmaceutical company built for controlled growth.",
    intro: "NovaPharm Healthcare Ltd is active in England and Wales. Regulated wholesale activity begins only after the required authorisations.",
  },
  "about/governance": {
    title: "Governance before growth.",
    intro: "Clear accountability, independent quality oversight and evidence-led claims define how NovaPharm moves from intent to operation.",
  },
  leadership: {
    title: "Leadership with clear accountability.",
    intro: "Verified governance facts are kept separate from executive, advisory and regulated responsibilities.",
  },
  services: {
    title: "Connected services for regulated market entry.",
    intro: "Sourcing, quality, logistics, product assessment and digital operations—designed as one controlled B2B system.",
  },
  "regulatory-services": {
    title: "Authorisation before supply.",
    intro: "Quality systems, product status, vendor oversight and post-market responsibilities are established before commercial release.",
  },
  cro: {
    title: "Clinical-development support with clear boundaries.",
    intro: "NovaPharm can structure programmes and coordinate qualified specialists without overstating its role or evidence.",
  },
  oncology: {
    title: "Oncology continuity begins before supply.",
    intro: "Source, formulation, quality, condition and regulatory readiness are assessed together before market access.",
  },
  "product-portfolio": {
    title: "A portfolio of governed decisions.",
    intro: "Oncology, specialty, oral-liquid and selected licensed medicine opportunities remain subject to evidence, authorisation and availability.",
  },
  "product-portfolio/nutraxin": {
    title: "Nutraxin references for qualified B2B review.",
    intro: "Approved pack imagery and source-transcribed composition details are presented without implying UK availability or regulatory acceptance.",
  },
  "partner-with-us": {
    title: "Partnerships built through qualification.",
    intro: "Structured routes for manufacturers, product owners, authorised suppliers, qualified buyers, logistics providers and technology partners.",
  },
  technology: {
    title: "Digital infrastructure for governed pharmaceutical operations.",
    intro: "Implemented, in-development and planned capabilities stay visibly separate across one controlled data architecture.",
  },
  "technology/ai-governance": {
    title: "AI can assist. People remain accountable.",
    intro: "Approved sources, privacy, citations, abstention and human authority are required for every material decision.",
  },
  "news-insights": {
    title: "Evidence-led pharmaceutical insight.",
    intro: "Focused analysis on quality, PLPI, oncology continuity, sourcing resilience and traceability.",
  },
  contact: {
    title: "Start a qualified B2B conversation.",
    intro: "Contact NovaPharm about products, distribution, sourcing, CMO/CDMO, regulatory work, media or careers.",
  },
  "account-application": {
    title: "Start your NovaPharm business account journey.",
    intro: "Begin with non-confidential company information. Due diligence and portal access remain controlled later steps.",
  },
  "trust-centre": {
    title: "Trust, with evidence.",
    intro: "Corporate identity, pharmaceutical status, privacy, security, accessibility and service assurance—clearly separated by evidence state.",
  },
  "investor-information": {
    title: "Investor information grounded in verified status.",
    intro: "The operating model, governance and principal risks are presented without turning targets into achievements.",
  },
  careers: {
    title: "Build the systems before scale arrives.",
    intro: "Future roles may span operations, quality, regulatory affairs, sourcing, partnerships, data and technology.",
  },
  legal: {
    title: "Legal and responsible-business information.",
    intro: "Website use, privacy, accessibility, ethical sourcing and developing environmental responsibilities in one place.",
  },
});

export function conciseCorporatePage(page: CorporatePage): CorporatePage {
  const override = heroCopy[page.slug];
  return override ? Object.freeze({ ...page, heroTitle: override.title, intro: override.intro }) : page;
}
