import { pageMeta } from "./site";

export type PageKind =
  | "home"
  | "narrative"
  | "leadership"
  | "services"
  | "regulatory"
  | "cro"
  | "oncology"
  | "products"
  | "nutraxin"
  | "partners"
  | "technology"
  | "ai-governance"
  | "insights"
  | "contact"
  | "account"
  | "legal-hub"
  | "policy";

export interface NarrativeSection {
  readonly kicker?: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
  readonly source?: { readonly label: string; readonly href: string };
}

export interface CorporatePage {
  readonly slug: string;
  readonly kind: PageKind;
  readonly heroTitle: string;
  readonly intro: string;
  readonly heroImage?: string;
  readonly heroAlt?: string;
  readonly sections?: readonly NarrativeSection[];
}

const page = (
  slug: string,
  kind: PageKind,
  heroTitle: string,
  intro: string,
  sections?: readonly NarrativeSection[],
  heroImage?: string,
  heroAlt?: string,
): CorporatePage => Object.freeze({ slug, kind, heroTitle, intro, sections, heroImage, heroAlt });

export const corporatePages: readonly CorporatePage[] = Object.freeze([
  page("", "home", "Building a more resilient pharmaceutical supply network.", "NovaPharm connects regulatory intelligence, diversified sourcing, quality-led distribution planning and digital infrastructure for qualified B2B healthcare partners."),
  page("about", "narrative", "A pharmaceutical company designed around controlled access.", "NovaPharm Healthcare is preparing a responsible route between qualified pharmaceutical supply, regulatory requirements and UK healthcare demand.", [
    { kicker: "Why NovaPharm", title: "Medicine access is an operating-system problem.", paragraphs: ["Availability depends on product rights, source qualification, regulatory status, quality evidence, demand, custody and accountable decisions working together. NovaPharm is building its model around those connections rather than treating procurement, compliance and distribution as separate activities.", "The company remains pre-operational for regulated wholesale supply. Preparation does not replace authorisation, and no regulated activity will begin before the applicable permissions are granted."], bullets: ["Compliance before commercial release", "Product-specific evidence", "Qualified partner delivery", "One governed data architecture"] },
    { kicker: "Operating principles", title: "Evidence should be visible at every hand-off.", paragraphs: ["A capital-efficient model can use qualified manufacturers, wholesalers, logistics providers and technology partners without misrepresenting third-party infrastructure as NovaPharm-owned. Responsibilities, agreements, records and exceptions must remain traceable across the network."], bullets: ["Truthful capability status", "Quality-led supplier decisions", "B2B-only communication", "Human accountability for regulated decisions"] },
  ], "/assets/media/modules/about-operating-model.jpg", "Pharmaceutical specialists reviewing controlled operational information"),
  page("about/company", "narrative", "A UK company preparing a governed pharmaceutical operating model.", "NovaPharm Healthcare Ltd is an active company incorporated in England and Wales. Incorporation does not itself authorise pharmaceutical wholesale activity.", [
    { kicker: "Company facts", title: "Verified corporate identity.", paragraphs: ["NOVAPHARM HEALTHCARE LTD is registered in England and Wales under company number 16716501. The public registered office is a legal correspondence address and is not presented as a pharmacy, warehouse, manufacturing site or customer-facing trading location."], source: { label: "View the official Companies House record", href: "https://find-and-update.company-information.service.gov.uk/company/16716501" } },
    { kicker: "Business model", title: "Three sourcing routes, one qualification standard.", paragraphs: ["The proposed model combines direct GMP-aligned manufacturing relationships, product-specific parallel-import assessment and a diversified authorised European buying network. Every route remains subject to rights, licence, quality, commercial and supply evidence."], bullets: ["Direct manufacturing relationships", "Product-specific PLPI assessment", "Qualified European sourcing", "Controlled third-party logistics"] },
  ], "/assets/media/modules/company-corporate-structure.jpg", "Professional review of corporate and pharmaceutical planning records"),
  page("about/governance", "narrative", "Governance that separates intention from verified status.", "Board accountability, quality independence and claims discipline shape how NovaPharm evaluates opportunities and communicates progress.", [
    { kicker: "Accountability", title: "Commercial interest cannot approve regulated activity.", paragraphs: ["Material product, supplier, customer, quality and release decisions require named owners, evidence and escalation routes. Formal regulated duties may be assigned only to appropriately qualified and authorised people."], bullets: ["Board oversight", "Independent quality escalation", "Documented approval boundaries", "Audit-ready records"] },
    { kicker: "Claims governance", title: "Current, in development and planned are different states.", paragraphs: ["NovaPharm does not present a licence, product, partnership, warehouse, manufacturing capability or technology outcome as operational until appropriate evidence supports it. Public content is reviewed against this status model."], source: { label: "Review the regulatory roadmap", href: "/regulatory-services/" } },
  ], "/assets/media/modules/governance-quality-oversight.jpg", "Governance team reviewing quality evidence and controlled records"),
  page("leadership", "leadership", "Leadership with verified governance boundaries.", "Public profiles distinguish Companies House facts from executive and advisory responsibilities described in approved NovaPharm materials."),
  page("services", "services", "Connected services for regulated-market preparation.", "NovaPharm is developing a B2B service model across sourcing, product assessment, quality, logistics, market access and controlled digital operations.", undefined, "/assets/media/modules/services-connected-execution.jpg", "Pharmaceutical team coordinating a controlled programme"),
  page("regulatory-services", "regulatory", "No regulated supply before the required permissions.", "The regulatory roadmap connects authorisation, product status, quality systems, vendor oversight and post-market responsibilities before commercial release.", undefined, "/assets/media/modules/regulatory-dossier-control.jpg", "Specialist reviewing a pharmaceutical regulatory dossier"),
  page("cro", "cro", "Clinical-development support with an explicit evidence boundary.", "NovaPharm can frame programmes, map responsibilities and coordinate qualified specialists without presenting itself as a global full-service CRO or clinical-trial sponsor.", undefined, "/assets/media/cro/cro-delivery-architecture-1600.jpg", "Clinical-development specialists reviewing programme evidence"),
  page("oncology", "oncology", "Oncology continuity starts before supply.", "NovaPharm is developing an evidence-led B2B model across formulation, source, quality, condition, regulatory readiness and controlled market access.", undefined, "/assets/media/products/oncology-vial-handling.jpg", "Gloved laboratory professional handling an unbranded vial in a controlled setting"),
  page("product-portfolio", "products", "A portfolio is a set of governed decisions, not a catalogue of promises.", "NovaPharm's strategic focus includes oncology, specialty, oral-liquid and selected licensed medicine opportunities, each subject to evidence, authorisation and availability.", undefined, "/assets/media/modules/product-portfolio-evidence.jpg", "Pharmaceutical portfolio evidence under professional review"),
  page("product-portfolio/nutraxin", "nutraxin", "Nutraxin product references for qualified B2B evaluation.", "The catalogue reproduces approved pack imagery and source-transcribed composition details. It does not assert UK availability, health claims, regulatory acceptance or a supply agreement."),
  page("partner-with-us", "partners", "Partnerships built through qualification, not logo walls.", "NovaPharm is preparing structured routes for manufacturers, product owners, authorised suppliers, qualified buyers, logistics providers and technology partners.", undefined, "/assets/media/modules/partners-qualification.jpg", "Business and pharmaceutical specialists reviewing partnership evidence"),
  page("technology", "technology", "Digital infrastructure that makes evidence easier to govern.", "The technology roadmap separates implemented foundations from capabilities in development and future plans, with Microsoft 365 and a unified data model at its core.", undefined, "/assets/media/modules/technology-traceability.jpg", "Controlled pharmaceutical data and traceability workflow"),
  page("technology/ai-governance", "ai-governance", "AI may support review; it cannot become the authority.", "NovaPharm's AI policy requires approved sources, explicit capability boundaries, privacy, citations, abstention and accountable human decisions."),
  page("news-insights", "insights", "Evidence-led perspectives for regulated pharmaceutical operators.", "Six substantial articles examine quality, PLPI, oncology continuity, sourcing resilience and traceability without offering patient medical advice."),
  page("contact", "contact", "Start a qualified B2B conversation.", "Use the secure enquiry route for product, distribution, sourcing, CMO/CDMO, regulatory, media or careers discussions. Do not submit patient or urgent medical information.", undefined, "/assets/media/modules/contact-qualified-enquiry.jpg", "Business professionals discussing a qualified pharmaceutical enquiry"),
  page("account-application", "account", "A controlled route to a future NovaPharm business account.", "Account applications require company, regulatory, quality and due-diligence information. Submission never creates privileged portal access automatically.", undefined, "/assets/media/modules/account-controlled-onboarding.jpg", "Controlled business account onboarding documentation"),
  page("investor-information", "narrative", "Investor information grounded in verified status.", "NovaPharm's public investor information explains the planned operating model, governance and risk boundaries without publishing confidential forecasts or presenting targets as achievements.", [
    { kicker: "Investment case", title: "A capital-efficient, compliance-first model under development.", paragraphs: ["NovaPharm's strategy is to coordinate qualified supply, regulatory pathways, outsourced logistics and digital control without claiming ownership of facilities it does not own. The model remains dependent on authorisations, product rights, partner agreements, operating capital and successful execution."], bullets: ["Oncology and specialty focus", "Diversified sourcing architecture", "Third-party logistics strategy", "Unified digital control environment"] },
    { kicker: "Risk discipline", title: "Forward-looking information is not an achieved result.", paragraphs: ["No revenue forecast, fundraising target, product approval, NHS relationship or commercial partnership is published as fact. Qualified investors should rely on approved confidential materials, independent due diligence and professional advice."], source: { label: "Contact NovaPharm about a strategic discussion", href: "/contact/?enquiry=Strategic%20partnership" } },
  ], "/assets/media/modules/investors-capital-readiness.jpg", "Corporate leaders reviewing a controlled investment-readiness plan"),
  page("careers", "narrative", "Build controlled systems before scale arrives.", "Future roles may span pharmaceutical operations, quality, regulatory affairs, sourcing, partnerships, data and technology. No vacancy is advertised unless a live role is listed.", [
    { kicker: "Working principles", title: "Judgement, evidence and accountability.", paragraphs: ["NovaPharm's developing culture values people who can connect specialist knowledge with disciplined execution and who are comfortable stating when evidence is incomplete."], bullets: ["Patient safety and regulatory integrity", "Respectful challenge", "Documented decisions", "Inclusive and accessible work"] },
    { kicker: "Current status", title: "No open role is implied by this page.", paragraphs: ["Expressions of professional interest may be submitted through the careers enquiry type. Do not send special-category data, identity documents or unnecessary personal information. A formal application route and privacy information will accompany any approved vacancy."], source: { label: "Submit a careers enquiry", href: "/contact/?enquiry=Careers" } },
  ], "/assets/media/modules/careers-specialist-team.jpg", "Specialist team collaborating in a professional setting"),
  page("legal", "legal-hub", "Legal information, accountability and responsible business.", "This area explains how NovaPharm governs website use, personal data, accessibility, ethical sourcing and its developing environmental responsibilities."),
  page("legal/privacy", "policy", "Privacy notice", "How NovaPharm Healthcare Ltd processes personal data across its website, business relationships, applications and secure systems.", [
    { title: "Controller and contact", paragraphs: ["NOVAPHARM HEALTHCARE LTD, company number 16716501, is the controller for the processing described here. Use the corporate contact route and mark the enquiry for the Privacy Lead. NovaPharm has not formally appointed a Data Protection Officer and does not claim otherwise."] },
    { title: "People and data covered", paragraphs: ["The notice covers visitors, business enquirers, applicants, customers, suppliers, partners, portal users, employees and applicants, board members, advisers, regulatory contacts, email recipients, SharePoint users, business documents, security events, cookies and device data. The general website does not invite patient-identifiable information."] },
    { title: "Purposes and lawful bases", paragraphs: ["Business enquiries are processed to respond, protect the service and preserve an accountable record, usually under legitimate interests or requested pre-contract steps. Account due diligence may also support contract, legal and regulatory obligations. Portal security, audit, employment, governance and quality records use the basis appropriate to the real purpose. Optional marketing remains separate and uses consent where required."], bullets: ["Business relationship administration", "Account due diligence", "Portal identity and security", "Employment and governance", "Regulatory and quality work", "Separate optional marketing"] },
    { title: "Recipients and international transfers", paragraphs: ["Access is limited by role and need. Approved providers may include Microsoft Azure, Microsoft 365, Entra ID, SharePoint and the enabled transactional-email provider. A prospective provider is not described as a recipient until a real data flow exists. Transfers outside the UK require destination review, an adequacy basis or appropriate contractual safeguards and a transfer risk assessment where needed."] },
    { title: "Retention, security and rights", paragraphs: ["Records are retained according to purpose, contract, company, tax, quality, regulatory, security and legal requirements recorded in NovaPharm's retention schedule. Rights may include access, correction, erasure, restriction, portability, objection and consent withdrawal. Identity may need verification. Individuals may complain to the Information Commissioner's Office."], source: { label: "Make a complaint to the ICO", href: "https://ico.org.uk/make-a-complaint/" } },
    { title: "Automated decisions and children", paragraphs: ["NovaPharm does not currently use this website for solely automated decisions with legal or similarly significant effects. The B2B website is not directed to children and does not knowingly seek children's data. Material changes update the version and review record."] },
  ]),
  page("legal/cookies", "policy", "Cookie and storage notice", "Necessary security technologies are distinguished from optional preferences, analytics and marketing. Optional technologies stay off unless a visitor chooses them.", [
    { title: "Current technology register", paragraphs: ["The public application uses a consent record in browser storage. Secure forms and portals may use first-party CSRF and session cookies when those services are requested. No analytics, advertising, social pixel or marketing tag is enabled in the current candidate."], bullets: ["np_cookie_consent: preference record, 180 days", "np_csrf: necessary form and portal security, 1 hour", "np_session: authenticated secure session, inactivity and absolute limits"] },
    { title: "Your choices", paragraphs: ["The first layer provides Accept all, Reject non-essential and Manage preferences. Optional categories are off by default. Cookie settings can be reopened from every page, and rejecting optional technologies does not block ordinary public content."] },
    { title: "Audit and future changes", paragraphs: ["Source, response headers, storage and network requests are reviewed before release. Any future analytics or marketing provider requires a documented purpose, recipient, duration, transfer assessment and consent behaviour before activation."], source: { label: "ICO guidance on storage and access technologies", href: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/" } },
  ]),
  page("legal/terms", "policy", "Website terms of use", "These terms govern the public corporate website and, with applicable account terms, the secure NovaPharm platform.", [
    { title: "Operator and B2B boundary", paragraphs: ["This website is operated by NOVAPHARM HEALTHCARE LTD, company number 16716501. It provides corporate and qualified B2B information, not patient ordering, medical advice, prescribing advice or an offer to supply an unauthorised product."] },
    { title: "Permitted use and intellectual property", paragraphs: ["Public content may be used for legitimate business evaluation. Users must not misrepresent NovaPharm material, scrape secure areas, introduce malicious code, test security without written authorisation or infringe third-party rights. NovaPharm and its licensors retain applicable intellectual-property rights."] },
    { title: "Portal and confidential material", paragraphs: ["Users must protect credentials, use only authorised scopes and report suspected compromise. Customer records, board material, prices, operational data and controlled documents may be confidential. Attempts to bypass access controls or retrieve another organisation's data are prohibited."] },
    { title: "Accuracy, liability and law", paragraphs: ["Information may change and should be independently checked before a regulated or commercial decision. Nothing excludes liability that cannot lawfully be excluded. Intended England and Wales liability, governing-law and jurisdiction language remains subject to final UK solicitor review."] },
  ]),
  page("legal/accessibility", "policy", "Accessibility statement", "NovaPharm targets WCAG 2.2 Level AA and corrects verified barriers rather than treating automated checks as complete proof.", [
    { title: "Commitment and implementation", paragraphs: ["The application uses semantic landmarks, skip links, visible focus, labelled controls, error summaries, responsive layouts, reduced-motion support, intrinsic image dimensions and accessible status messages."] },
    { title: "Testing and current status", paragraphs: ["Automated accessibility checks, Chromium and WebKit rendering, keyboard, zoom, reflow, contrast and screen-reader sampling form the acceptance approach. NovaPharm does not claim full conformance until live and independent review gates pass."] },
    { title: "Help and feedback", paragraphs: ["Use the contact route to identify the page or document and the format or assistance required. NovaPharm will assess a reasonable accessible alternative and an escalation route."], source: { label: "Report an accessibility issue", href: "/contact/?enquiry=General%20enquiry" } },
  ]),
  page("legal/modern-slavery", "policy", "Modern Slavery and Human Rights Policy", "A voluntary policy: NovaPharm has not established that the section 54 turnover threshold currently applies and does not present this as a mandatory statutory statement.", [
    { title: "Applicability", paragraphs: ["NovaPharm is a UK commercial organisation preparing to supply goods and services, but verified evidence does not currently show consolidated global turnover of at least GBP 36 million. Applicability will be reassessed annually and after a material transaction. If the duty applies, a financial-year-specific statement will require board approval and director signature."] },
    { title: "Supply-chain risks", paragraphs: ["Risk review covers manufacturing and raw-material labour, packaging, overseas sourcing, warehousing, temperature-controlled logistics, transport subcontractors, cleaning, facilities, recruitment and temporary labour, CMO/CDMO relationships and subcontractor visibility."] },
    { title: "Due diligence and response", paragraphs: ["Planned onboarding records ownership, licence, site, labour-practice and subcontracting evidence proportionate to risk. NovaPharm will not claim audits, training or remediation that records do not verify. Response may include clarification, corrective action, suspension, termination or lawful reporting, with worker safety prioritised."] },
  ]),
  page("legal/environment-carbon", "policy", "Environmental and Carbon Responsibility Statement", "A voluntary statement: mandatory SECR reporting has not been established and NovaPharm does not publish unverified emissions or reduction claims.", [
    { title: "Applicability and measurement", paragraphs: ["No verified company data currently show that NovaPharm meets the applicable large-company tests. Group position, size, energy use and procurement requirements will be reviewed with the accounts process. Operational emissions measurement and a defensible baseline remain in development."] },
    { title: "Priority sources", paragraphs: ["Materiality review will consider contracted warehousing, temperature-controlled and international freight, purchased logistics, packaging, waste, business travel, digital infrastructure, supplier energy and manufacturing evidence."], bullets: ["Scope 1 direct sources", "Scope 2 purchased electricity", "Material Scope 3 logistics, travel, packaging and suppliers"] },
    { title: "Claims boundary", paragraphs: ["NovaPharm does not claim carbon neutrality, net zero, zero emissions, science-based targets, carbon-negative operation or verified reductions. Any future figure will state period, boundary, method, factors, intensity measure, limitations and review status."] },
  ]),
]);

export const pageBySlug = new Map(corporatePages.map((item) => [item.slug, item]));

export const indexableSlugs = Object.freeze(corporatePages.map((item) => item.slug));

export function assertPageMetaCoverage(): void {
  for (const item of corporatePages) {
    if (!(item.slug in pageMeta)) throw new Error(`Corporate route is missing metadata: ${item.slug || "/"}`);
  }
}
