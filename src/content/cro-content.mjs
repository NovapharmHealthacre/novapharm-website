export const croContent = Object.freeze({
  route: "/cro/",
  title: "Clinical Research & CRO Support",
  proposition: "Clinical development, connected to evidence and accountability.",
  introduction: "NovaPharm coordinates UK-focused development programmes by aligning regulatory pathways, quality governance and qualified specialist delivery, with responsibilities visible from the start.",
  status: "NovaPharm provides scoped programme coordination. It is not represented as a sponsor or full-service CRO. Specialist functions require appropriately qualified providers; sponsor duties and authority decisions remain with their accountable owners.",
  audiences: Object.freeze([
    ["Emerging biotechnology and pharmaceutical developers", "Programmes that need a clear UK route before specialist work is commissioned."],
    ["Specialty-pharma and product owners", "Assets with connected scientific, quality, supply and market decisions."],
    ["International development organisations", "Teams seeking UK pathway context and an explicit responsibility model."],
    ["Sponsors using specialist providers", "Programmes that need coherent evidence, decisions and escalation across vendors."]
  ]),
  challenges: Object.freeze([
    "Fragmented specialist vendors",
    "Unclear responsibilities and escalation",
    "Regulatory and operational disconnects",
    "Supply dependencies addressed too late"
  ]),
  deliveryLanes: Object.freeze([
    {
      key: "novapharm",
      label: "NovaPharm-led",
      summary: "Programme architecture and governed coordination within an agreed scope.",
      items: ["Evidence assessment", "Responsibility mapping", "UK pathway coordination", "Development continuity"]
    },
    {
      key: "specialist",
      label: "Qualified specialist delivery",
      summary: "Functions requiring proven infrastructure or professional accountability.",
      items: ["Clinical operations", "Data and biometrics", "Medical and safety oversight", "Laboratories and specialist writing"]
    },
    {
      key: "sponsor",
      label: "Sponsor-retained",
      summary: "Duties that remain with the sponsor when activities are delegated.",
      items: ["Sponsor designation and duties", "Provider oversight", "Protocol and risk decisions", "Safety and compliance accountability"]
    }
  ]),
  lifecycle: Object.freeze([
    { number: "01", title: "Development strategy", text: "Define the asset question, evidence gap and decision the programme must enable.", mode: "NovaPharm-led framing" },
    { number: "02", title: "Feasibility and planning", text: "Map specialist functions, supply dependencies, assumptions and decision gates.", mode: "Coordinated input" },
    { number: "03", title: "Regulatory and ethics preparation", text: "Coordinate the UK pathway and evidence package with qualified specialists.", mode: "NovaPharm-led coordination" },
    { number: "04", title: "Study start-up", text: "Set provider interfaces, records, escalation and readiness before activation.", mode: "Specialist delivery" },
    { number: "05", title: "Study conduct and oversight", text: "Keep milestones, issues and provider decisions visible to the sponsor.", mode: "Sponsor oversight supported" },
    { number: "06", title: "Data, safety and documentation", text: "Connect specialist work to controlled, attributable records.", mode: "Qualified specialist delivery" },
    { number: "07", title: "Close-out and reporting", text: "Reconcile decisions, essential records and unresolved actions.", mode: "Coordinated close-out" },
    { number: "08", title: "Regulatory and market continuity", text: "Carry verified evidence into the next regulatory or market decision.", mode: "NovaPharm-led continuity" }
  ]),
  services: Object.freeze([
    {
      id: "programme-strategy",
      title: "Clinical-development strategy and programme planning",
      problem: "A programme can commission activity before its critical decisions, evidence gaps and UK route are explicit.",
      approach: "NovaPharm structures the development question, dependencies, decision gates and required specialist inputs with the sponsor.",
      outcome: "A programme brief, responsibility map and staged delivery architecture suitable for provider selection and governance.",
      status: "NovaPharm-led",
      cta: "Discuss programme strategy"
    },
    {
      id: "uk-pathway",
      title: "UK regulatory and ethics pathway coordination",
      problem: "MHRA, Research Ethics Committee and operational preparation can become disconnected or sequenced incorrectly.",
      approach: "Coordinate requirements, submission dependencies and evidence ownership with qualified regulatory contributors and the sponsor.",
      outcome: "A visible UK pathway plan; authorisation and favourable ethics opinion remain decisions of the relevant authorities.",
      status: "Coordinated specialist input",
      cta: "Discuss UK pathway planning"
    },
    {
      id: "delivery-architecture",
      title: "Clinical project and specialist-vendor architecture",
      problem: "Multiple providers create gaps when interfaces, decisions and escalation routes are not designed before delivery.",
      approach: "Map accountable roles, delegated activities, dependencies, governance forums, milestones and exception routes.",
      outcome: "A transparent delivery model that preserves sponsor visibility across appointed providers.",
      status: "NovaPharm-led",
      cta: "Map a delivery model"
    },
    {
      id: "document-governance",
      title: "Study documentation and evidence governance",
      problem: "Important records lose context when document ownership, versioning, decisions and quality checks are fragmented.",
      approach: "Design controlled document structures, review states, decision records and inspection-readiness checkpoints; specialist TMF services are qualified separately.",
      outcome: "A governed evidence architecture aligned to the agreed programme and provider model.",
      status: "NovaPharm-led with specialist support",
      cta: "Review document governance"
    },
    {
      id: "quality-oversight",
      title: "Quality-by-design and risk-proportionate oversight planning",
      problem: "Quality activity can become retrospective when critical-to-quality factors and oversight evidence are not defined early.",
      approach: "Support responsibility definition, risk framing, issue escalation, CAPA awareness and oversight records without transferring sponsor accountability.",
      outcome: "A proportionate governance plan focused on material risks, data integrity and patient-safety boundaries.",
      status: "NovaPharm-led planning",
      cta: "Discuss quality oversight"
    },
    {
      id: "data-safety",
      title: "Data, biometrics and safety-function coordination",
      problem: "Specialist data and safety functions can operate as separate workstreams without a shared decision context.",
      approach: "Define interfaces, inputs, outputs, timelines and escalation expectations before appointing appropriately qualified providers.",
      outcome: "Coherent specialist work packages with explicit sponsor and provider responsibilities.",
      status: "Qualified specialist delivery",
      cta: "Scope specialist functions"
    },
    {
      id: "clinical-supply",
      title: "Clinical-supply and IMP logistics coordination",
      problem: "Product, packaging, release, storage and distribution dependencies can threaten start-up or continuity when addressed late.",
      approach: "Map supply assumptions and coordinate qualified manufacturers, release professionals and logistics providers within the authorised programme.",
      outcome: "A clinical-supply responsibility and evidence plan; NovaPharm does not claim owned manufacturing, depots or current IMP distribution.",
      status: "Planning and specialist orchestration",
      cta: "Discuss clinical-supply planning"
    },
    {
      id: "market-continuity",
      title: "Post-study regulatory and market-access continuity",
      problem: "Development evidence, supply design and commercial pathway decisions are often reconsidered too late or without their original context.",
      approach: "Connect programme outputs to the next verified regulatory, quality, product and market-access decision.",
      outcome: "A controlled transition brief that preserves evidence lineage and unresolved dependencies.",
      status: "NovaPharm-led",
      cta: "Plan development continuity"
    }
  ]),
  decisionOptions: Object.freeze([
    {
      question: "What decision must the programme enable?",
      signal: "Strategy and evidence",
      title: "Strategy and evidence",
      output: "A concise programme question, decision map and evidence-gap view before specialist functions are commissioned."
    },
    {
      question: "Which UK approval and ethics dependencies apply?",
      signal: "Pathway and timing",
      title: "Pathway and timing",
      output: "A current UK pathway view showing regulatory, ethics, evidence and operational dependencies without predicting an authority outcome."
    },
    {
      question: "Which functions require proven specialist infrastructure?",
      signal: "Provider architecture",
      title: "Provider architecture",
      output: "A function-by-function map of NovaPharm-led, qualified specialist and sponsor-retained responsibilities."
    },
    {
      question: "What must remain visible to the sponsor?",
      signal: "Oversight evidence",
      title: "Oversight evidence",
      output: "A proportionate view of milestones, decisions, issues, actions, records and escalation routes required for sponsor oversight."
    },
    {
      question: "Which product and supply dependencies begin now?",
      signal: "Continuity planning",
      title: "Continuity planning",
      output: "A connected view of product, supply, quality and later market dependencies that should be considered during development."
    },
    {
      question: "Does delivery require owned global sites, laboratories or a recruitment network?",
      signal: "Conventional CRO fit",
      title: "A conventional full-service CRO may be the better fit",
      output: "A conventional global full-service CRO should be assessed where the programme depends on owned international infrastructure, established site or patient networks, or integrated operational capacity outside NovaPharm's evidenced scope."
    }
  ]),
  operatingSteps: Object.freeze([
    ["01", "Initial discussion", "Define the programme question, stage and intended decision without requesting patient-identifiable information."],
    ["02", "Evidence and need assessment", "Review non-confidential evidence, assumptions, dependencies and gaps."],
    ["03", "Responsibility mapping", "Separate sponsor, NovaPharm and specialist-provider duties before scope is agreed."],
    ["04", "Proposed engagement route", "Set the suitable work packages, evidence outputs and governance route without guaranteeing acceptance or timing."]
  ]),
  qualityPrinciples: Object.freeze([
    ["Defined responsibility", "Every material activity has an accountable owner and visible interface."],
    ["Quality by design", "Critical-to-quality factors are considered before avoidable complexity is embedded."],
    ["Risk-proportionate oversight", "Attention and evidence are directed to material programme and participant risks."],
    ["Controlled records", "Decisions, versions, issues and actions remain attributable and reviewable."],
    ["Patient-safety boundary", "Medical and safety decisions remain with appropriately qualified and authorised people."]
  ]),
  focusAreas: Object.freeze([
    ["Oncology", "Strategic scientific and portfolio focus; not a claim of completed NovaPharm clinical trials."],
    ["Specialty medicines", "Programme and product focus where evidence, supply and governance dependencies require closer integration."],
    ["Oral-liquid formulations", "Formulation and technology-transfer interest supported by senior scientific input."],
    ["Selected complex or hard-to-source products", "Partner-development priority subject to product, rights, regulatory and supply evidence."]
  ]),
  technology: Object.freeze([
    ["Programme record", "A structured view of scope, responsibilities, milestones and verified status."],
    ["Controlled documents", "Document relationships, versions, review states and access boundaries."],
    ["Decision and issue trail", "Attributable decisions, actions, exceptions and escalation history."],
    ["Role-based visibility", "Access architecture is implemented in NovaPharm's platform; a live sponsor workspace is not claimed."]
  ]),
  differentiators: Object.freeze([
    ["UK pathway context", "Development planning connected to current MHRA, ethics and regulated-market considerations."],
    ["Senior, focused attention", "A deliberately scoped engagement model rather than an unsupported claim of global scale."],
    ["Transparent responsibilities", "Direct, specialist-partner and sponsor-retained activities remain visible."],
    ["Development continuity", "Scientific, regulatory, quality and supply decisions remain connected."]
  ]),
  insightLinks: Object.freeze([
    ["GDP, QMS and the Practical Foundations of Reliable Pharmaceutical Distribution", "/news-insights/gdp-qms-pharmaceutical-distribution-foundations/", "Quality"],
    ["From Batch to Buyer: Designing More Traceable Pharmaceutical Supply Chains", "/news-insights/batch-to-buyer-pharmaceutical-traceability/", "Technology"],
    ["Building a Compliance-First Pharmaceutical Distribution Model in the UK", "/news-insights/compliance-first-pharmaceutical-distribution-uk/", "Regulatory"]
  ]),
  plannedInsights: Object.freeze([
    "Choosing between full-service and functional CRO support",
    "UK clinical-trial approval planning after the 2026 regulatory changes",
    "Building an inspection-ready trial documentation model",
    "Sponsor oversight when using multiple specialist vendors"
  ]),
  faqs: Object.freeze([
    ["What clinical-development support does NovaPharm provide?", "NovaPharm's current public offer is centred on programme framing, UK pathway coordination, responsibility mapping, document and decision governance, specialist-vendor coordination, clinical-supply planning and development-to-market continuity."],
    ["Is NovaPharm a full-service CRO?", "No. NovaPharm does not present itself as a global full-service CRO, investigator-site network, clinical-trial sponsor or in-house biometrics organisation. Functions outside its evidenced scope require appropriately qualified specialists."],
    ["Can NovaPharm coordinate specialist CRO functions?", "Potentially, following programme assessment and capability mapping. Any specialist provider must be appropriately qualified, contracted and governed for the agreed function."],
    ["Does NovaPharm support UK regulatory and ethics preparation?", "NovaPharm can coordinate pathway planning and evidence responsibilities with qualified regulatory contributors. MHRA authorisation and a favourable Research Ethics Committee opinion are decisions of the relevant authorities."],
    ["Can NovaPharm support clinical-supply coordination?", "NovaPharm can help map clinical-supply responsibilities and coordinate qualified parties. It does not claim owned manufacturing, clinical depots or an operational IMP distribution network."],
    ["How do we begin a discussion?", "Use the clinical-development enquiry route to share high-level, non-confidential programme context. Do not submit patient-identifiable data, adverse-event information or urgent medical information through the form."]
  ]),
  officialSources: Object.freeze([
    ["MHRA: Clinical trials for medicines, apply for approval in the UK", "https://www.gov.uk/guidance/clinical-trials-for-medicines-apply-for-approval-in-the-uk"],
    ["MHRA: Clinical trials for medicines, roles and responsibilities", "https://www.gov.uk/government/publications/clinical-trials-for-medicines-roles-and-responsibilities/clinical-trials-for-medicines-roles-and-responsibilities"],
    ["MHRA: Guidance on quality and risk proportionality", "https://www.gov.uk/guidance/clinical-trials-for-medicines-guidance-on-quality-and-risk-proportionality"],
    ["MHRA: Compliance with ICH E6 GCP in the United Kingdom", "https://www.gov.uk/guidance/clinical-trials-for-medicines-compliance-with-ich-e6-good-clinical-practice-gcp-in-the-united-kingdom"],
    ["Health Research Authority: Combined Review", "https://www.hra.nhs.uk/planning-and-improving-research/policies-standards-legislation/clinical-trials-investigational-medicinal-products-ctimps/combined-ways-working-pilot/"],
    ["Health Research Authority: Research roles and responsibilities", "https://www.hra.nhs.uk/planning-and-improving-research/research-planning/roles-and-responsibilities/"],
    ["ICH E6(R3) Good Clinical Practice", "https://www.ich.org/page/efficacy-guidelines"]
  ])
});
