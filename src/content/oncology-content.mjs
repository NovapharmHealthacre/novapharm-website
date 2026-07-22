export const oncologyContent = Object.freeze({
  scope: {
    eyebrow: "Oncology continuity",
    title: "Oncology continuity starts before supply.",
    lead: "NovaPharm is developing an evidence-led B2B model for oncology and specialist-medicine opportunities across formulation, source, quality, regulatory readiness and controlled market access.",
    boundary: "Strategic focus only. NovaPharm does not present oncology products as approved, stocked or available, and does not provide patient, treatment or prescribing advice. Regulated wholesale activity will begin only after the required authorisations are granted."
  },
  principles: [
    ["Product-specific evidence", "Each opportunity needs its own identity, rights, source, quality, regulatory, handling and commercial evidence. A category label is never enough."],
    ["Accountable hand-offs", "The product owner, manufacturer, specialist provider, logistics organisation and future wholesale operator retain clearly assigned responsibilities."],
    ["Condition-led planning", "Storage, transport, packaging, monitoring and excursion decisions follow the approved or proposed product requirements and qualified lane evidence."],
    ["Release after readiness", "Commercial interest does not override authorisation, quality review, document completeness or an accountable release decision."]
  ],
  continuityAxes: [
    ["Product", "Identity, formulation, presentation and intended regulated route"],
    ["Evidence", "Dossier, licences, approved information, quality and stability records"],
    ["Source", "Rights, manufacturer, supplier, qualification and ongoing oversight"],
    ["Condition", "Storage range, packaging, monitoring, custody and excursions"],
    ["Demand", "Approved planning inputs, uncertainty, lead times and continuity scenarios"],
    ["Decision", "Accountable review, exceptions, release status and audit evidence"]
  ],
  formulations: [
    {
      id: "oral-solid",
      label: "Oral solid programmes",
      title: "Trace the marketed or proposed presentation back to controlled evidence.",
      text: "Tablets and capsules may appear operationally familiar, yet strength, pack, source product, shelf life, labelling, repackaging, storage and licence pathway remain product-specific. The review begins with identity and rights, not a sales catalogue.",
      evidence: ["Identity and reference-product evidence", "Manufacturer and supply rights", "Pack and labelling requirements", "Stability, shelf life and storage", "Applicable authorisation pathway"]
    },
    {
      id: "oral-liquid",
      label: "Oral liquid programmes",
      title: "Formulation complexity must be resolved before batch and transfer planning.",
      text: "A liquid opportunity can involve concentration, excipients, container closure, dosing presentation, in-use conditions, microbiological controls, palatability and technology-transfer questions. NovaPharm's role is to make those dependencies visible to the qualified organisations that own them.",
      evidence: ["Formula and development rationale", "Container-closure compatibility", "Analytical and microbiological strategy", "Stability and in-use evidence", "Manufacturing and transfer responsibilities"]
    },
    {
      id: "sterile",
      label: "Sterile and temperature-sensitive",
      title: "Sterility and temperature controls require specialist owners and qualified evidence.",
      text: "Sterile, injectable or temperature-sensitive opportunities demand appropriately authorised manufacturers, laboratories, release arrangements, packaging systems and logistics providers. NovaPharm does not claim in-house sterile manufacture, laboratory testing or an owned cold chain.",
      evidence: ["Authorised specialist organisations", "Sterility and release evidence", "Qualified packaging and lanes", "Temperature-monitoring strategy", "Excursion and recall responsibilities"]
    },
    {
      id: "supportive",
      label: "Specialist and supportive care",
      title: "Clinical importance does not remove the need for a controlled commercial pathway.",
      text: "Specialist and supportive-care categories may be assessed where there is a substantiated B2B need. Product availability, approval, price and customer demand are not inferred from a strategic category and must be verified at the decision point.",
      evidence: ["Substantiated B2B need", "Product and supplier authority", "Quality and handling evidence", "Commercial viability boundaries", "Approved communication and audience"]
    }
  ],
  sourcing: [
    ["01", "Qualified manufacturing relationships", "Evaluate rights, site authorisation, product evidence, quality culture, capacity assumptions and accountable technology transfer. No manufacturer is named publicly without evidence and permission."],
    ["02", "Product-specific regulatory pathways", "Assess whether a proposed product and source fit an applicable UK route. A PLPI or other pathway is not assumed, and every licence remains product-specific and subject to authority decision."],
    ["03", "Diversified authorised supply", "Consider qualified European and other permitted sources to reduce single-route dependency, with licences, quality evidence, custody and continuity reviewed for each relationship."]
  ],
  readiness: [
    {
      dimension: "Identity and rights",
      question: "Is the exact product, source, presentation and right to supply evidenced?",
      required: "Identity records, rights, source-product evidence and approved scope",
      stop: "Ambiguous product or unverified commercial rights"
    },
    {
      dimension: "Regulatory route",
      question: "Is the applicable UK pathway defined without assuming approval?",
      required: "Pathway assessment, authority requirements and accountable owner",
      stop: "Required authorisation absent or route unsupported"
    },
    {
      dimension: "Quality and manufacture",
      question: "Can qualified parties support manufacture, testing, release and oversight?",
      required: "Authorisations, quality evidence, agreements and release architecture",
      stop: "Critical evidence, role or agreement gap"
    },
    {
      dimension: "Condition and custody",
      question: "Are storage, transport, packaging and exception controls product-specific?",
      required: "Lane, pack-out, monitoring, custody and excursion evidence",
      stop: "Unqualified lane or unresolved condition risk"
    },
    {
      dimension: "Demand and continuity",
      question: "Are planning inputs approved, bounded and resilient to uncertainty?",
      required: "Demand basis, lead times, constraints, scenarios and human review",
      stop: "Forecast presented as certainty or unsupported demand claim"
    },
    {
      dimension: "Release and communication",
      question: "Are release authority, audience, claims and records controlled?",
      required: "Accountable decision, release evidence, approved copy and audit trail",
      stop: "Product promoted or supplied before readiness"
    }
  ],
  temperatureControls: [
    ["Define", "Confirm the product-specific condition range, stability basis, presentation and risk points."],
    ["Qualify", "Select appropriately qualified packaging, monitoring, storage and transport arrangements."],
    ["Observe", "Maintain time, temperature, custody and exception evidence across accountable hand-offs."],
    ["Assess", "Route excursions to qualified review; a sensor reading alone does not release or reject a batch."],
    ["Learn", "Use deviations, CAPA, complaints and lane performance to improve the controlled process."]
  ],
  continuityStages: [
    ["Opportunity", "Define the problem, audience and evidence boundary."],
    ["Development", "Resolve formulation, analytical, manufacturing and stability responsibilities."],
    ["Clinical", "Preserve sponsor duties, approvals and qualified specialist delivery."],
    ["Regulatory", "Prepare the applicable evidence and await authority decisions."],
    ["Supply design", "Qualify source, custody, condition, documents and continuity controls."],
    ["Market readiness", "Confirm authorised scope, accountable release and approved communication."],
    ["Lifecycle", "Monitor quality, changes, complaints, safety escalation and continuity evidence."]
  ],
  aiRoadmap: [
    ["Live", "Published-evidence retrieval", "Website search can retrieve approved public material with citations and deterministic safety boundaries."],
    ["Experimental", "Private on-device semantic retrieval", "Visitors may explicitly activate a small local retrieval model. Query text stays in the browser and no external AI provider is contacted."],
    ["Internal development", "Evidence and document review", "Bounded tools can flag claim contradictions or document gaps for human review; they cannot approve records or regulated decisions."],
    ["Planned", "Demand and continuity planning", "Forecasting requires lawful, representative historical data, baselines, backtesting, human override and monitored performance. No stockout-reduction claim is made."]
  ],
  partners: [
    ["Product and dossier owners", "Bring an intended market, rights position and controlled evidence set."],
    ["Manufacturers and CMO/CDMOs", "Clarify authorised scope, technical capability, transfer, quality and batch responsibilities."],
    ["Authorised supply partners", "Provide current licences, product provenance, quality evidence and custody controls."],
    ["Specialist logistics providers", "Define condition, lane, monitoring, exception and document responsibilities."],
    ["Qualified B2B stakeholders", "Frame the need without implying procurement commitment, availability or patient use."]
  ],
  faqs: [
    ["Does NovaPharm currently sell oncology medicines?", "No. Oncology and specialist medicines are strategic areas for B2B opportunity assessment. This page does not state that any oncology medicine is approved, stocked or available from NovaPharm. Regulated wholesale activity will begin only after the required authorisations are granted."],
    ["Is NovaPharm an MHRA-authorised pharmaceutical wholesaler?", "NovaPharm does not present itself as holding a WDA(H) or another unverified pharmaceutical authorisation. The public website distinguishes company incorporation and preparatory work from permissions that must be granted before regulated activity."],
    ["Can patients use this page to choose or order medicines?", "No. The website is corporate and B2B. It does not provide diagnosis, treatment, dosage, medicine-selection or prescribing advice and does not accept patient orders."],
    ["What does oncology continuity mean here?", "It means connecting product identity, evidence, source, condition, demand assumptions and accountable decisions so that gaps are visible before a release or supply decision. It is a governance framework, not a guarantee of availability."],
    ["Does NovaPharm operate its own cold chain, laboratory or manufacturing site?", "No such ownership is claimed. Product-specific manufacture, testing, release, storage and transport would require appropriately qualified and authorised organisations with explicit responsibilities and evidence."],
    ["How can a product owner or qualified partner begin a discussion?", "Use the oncology and specialist-medicines enquiry route with a non-confidential summary of the opportunity. Do not upload patient information, adverse-event reports, urgent medical information or a confidential dossier through the general form."]
  ],
  sources: [
    ["MHRA: clinical trials for medicines from 28 April 2026", "https://www.gov.uk/guidance/clinical-trials-for-medicines-apply-for-approval-in-the-uk"],
    ["Health Research Authority: Combined Review", "https://www.hra.nhs.uk/planning-and-improving-research/policies-standards-legislation/clinical-trials-investigational-medicinal-products-ctimps/combined-review/"],
    ["MHRA: manufacturer and wholesaler licensing", "https://www.gov.uk/guidance/apply-for-manufacturer-or-wholesaler-of-medicines-licences"],
    ["MHRA: good manufacturing and distribution practice", "https://www.gov.uk/guidance/good-manufacturing-practice-and-good-distribution-practice"],
    ["NICE: technology appraisal guidance", "https://www.nice.org.uk/what-nice-does/our-guidance/about-technology-appraisal-guidance"],
    ["NHS England Digital: National Disease Registration Service", "https://digital.nhs.uk/services/national-disease-registration-service"],
    ["Cancer Research UK: cancer statistics for the UK", "https://www.cancerresearchuk.org/health-professional/cancer-statistics"]
  ]
});
