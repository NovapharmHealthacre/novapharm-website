export const site = {
  name: "Novapharm Innovation Technology",
  shortName: "NIT",
  url: "https://nit.novapharmhealthcare.com",
  email: "bd@novapharmhealthcare.com",
  address: [
    "403, R.K Plaza",
    "Near Utkarsh School, Diwalipura",
    "Vadodara, Gujarat 390007",
    "India",
  ],
  description:
    "Pharmaceutical strategy and execution advisory across growth, portfolio, product development, technology transfer, market entry, commercial readiness, supply resilience, and digital transformation.",
} as const;

export const navigation = [
  { href: "/expertise", label: "Expertise" },
  { href: "/sectors", label: "Sectors" },
  { href: "/approach", label: "How we work" },
  { href: "/insights", label: "Insights" },
  { href: "/about", label: "About" },
] as const;

export type Capability = {
  id: string;
  index: string;
  title: string;
  short: string;
  statement: string;
  questions: readonly string[];
  deliverables: readonly string[];
};

export const capabilities: readonly Capability[] = [
  {
    id: "strategy-growth",
    index: "01",
    title: "Strategy & growth",
    short: "Choose where to play—and what it will take to win.",
    statement:
      "We help leadership teams turn broad growth ambition into a focused set of choices across markets, categories, channels, capabilities, and investment priorities.",
    questions: [
      "Which growth spaces are strategically attractive and operationally credible?",
      "What should be built, acquired, licensed, partnered, or exited?",
      "Which assumptions matter most to the investment case?",
    ],
    deliverables: [
      "Growth thesis and strategic choices",
      "Opportunity prioritisation",
      "Scenario and risk architecture",
      "Execution roadmap and governance",
    ],
  },
  {
    id: "portfolio-product",
    index: "02",
    title: "Portfolio & product strategy",
    short: "Build a portfolio around evidence, not enthusiasm.",
    statement:
      "We connect market need, clinical relevance, technical feasibility, competitive intensity, regulatory pathway, and commercial economics before resources are committed.",
    questions: [
      "Which assets deserve investment, acceleration, redesign, or removal?",
      "Where are the portfolio gaps, overlaps, and concentration risks?",
      "How should product concepts be translated into decision-ready briefs?",
    ],
    deliverables: [
      "Portfolio architecture",
      "Product opportunity assessment",
      "Target product and evidence logic",
      "Prioritised development sequence",
    ],
  },
  {
    id: "market-entry",
    index: "03",
    title: "Market entry & access",
    short: "Approval is one gate. Access is the full system.",
    statement:
      "We design market-entry pathways that connect regulatory feasibility with route to market, partner economics, reimbursement realities, channel structure, and launch readiness.",
    questions: [
      "Which market-entry model fits the product, capital base, and risk appetite?",
      "What must be true before a distributor, licensee, or commercial partner is appointed?",
      "How do regulatory, pricing, channel, and evidence decisions interact?",
    ],
    deliverables: [
      "Market-entry strategy",
      "Partner and channel model",
      "Access and launch readiness map",
      "Decision gates and dependency plan",
    ],
  },
  {
    id: "development-cmc",
    index: "04",
    title: "Development, CMC & technology transfer",
    short: "Translate the product ambition into a controllable programme.",
    statement:
      "We structure product-development and transfer programmes across formulation, CMC, analytical, manufacturing, stability, documentation, partners, timelines, and governance.",
    questions: [
      "Is the development pathway technically coherent and submission-aware?",
      "Is the manufacturing partner genuinely suitable for the intended market?",
      "Where can transfer, scale-up, stability, or documentation fail?",
    ],
    deliverables: [
      "Development and CMC programme design",
      "CMO/CDMO evaluation framework",
      "Technology-transfer governance",
      "Risk register and stage-gate plan",
    ],
  },
  {
    id: "operations-supply",
    index: "05",
    title: "Operations, sourcing & resilience",
    short: "Design the operating model before volume exposes it.",
    statement:
      "We help companies reduce single-point dependency across suppliers, geographies, routes, inventory, information, and decision rights—without confusing resilience with unnecessary complexity.",
    questions: [
      "Where is the business structurally fragile?",
      "Which capabilities belong in-house, with partners, or in a managed network?",
      "How should sourcing, quality, inventory, and information flows be governed?",
    ],
    deliverables: [
      "Operating-model design",
      "Strategic sourcing architecture",
      "Supply resilience assessment",
      "Partner governance and performance model",
    ],
  },
  {
    id: "commercialisation",
    index: "06",
    title: "Commercial readiness & launch",
    short: "Make the launch system ready before the launch date arrives.",
    statement:
      "We align proposition, evidence, pricing logic, channels, partners, demand assumptions, launch sequencing, and execution ownership into a practical commercial readiness plan.",
    questions: [
      "Is the proposition specific enough to win with the intended customer?",
      "Are forecasts grounded in channel and adoption reality?",
      "What must be built, tested, and decided before launch?",
    ],
    deliverables: [
      "Commercial strategy and value proposition",
      "Launch readiness assessment",
      "Demand and scenario logic",
      "Channel and account activation plan",
    ],
  },
  {
    id: "digital-ai",
    index: "07",
    title: "Digital, data & AI strategy",
    short: "Use technology to improve decisions—not decorate them.",
    statement:
      "We define practical digital and AI use cases around forecasting, portfolio intelligence, traceability, partner visibility, workflow control, and management decision-making.",
    questions: [
      "Which use cases create measurable operational or strategic value?",
      "What data, governance, and workflow conditions are required?",
      "Should the capability be bought, built, partnered, or deferred?",
    ],
    deliverables: [
      "Digital and AI opportunity map",
      "Use-case prioritisation",
      "Data and governance requirements",
      "Prototype-to-scale roadmap",
    ],
  },
  {
    id: "partnerships-diligence",
    index: "08",
    title: "Partnerships, licensing & diligence",
    short: "Make the relationship investable before making it contractual.",
    statement:
      "We help clients frame, evaluate, and govern strategic partnerships, licensing opportunities, manufacturers, distributors, and market-entry counterparties.",
    questions: [
      "Does the strategic logic survive operational and commercial scrutiny?",
      "What diligence matters before exclusivity, investment, or transfer?",
      "How should economics, responsibilities, milestones, and governance align?",
    ],
    deliverables: [
      "Strategic and commercial diligence",
      "Partner evaluation and shortlist",
      "Deal logic and responsibility map",
      "Post-signing governance design",
    ],
  },
] as const;

export type Sector = {
  index: string;
  title: string;
  description: string;
  priorities: readonly string[];
};

export const sectors: readonly Sector[] = [
  {
    index: "01",
    title: "Pharmaceuticals & generics",
    description:
      "Portfolio choices, development pathways, international market entry, product acquisition, commercial readiness, and resilient supply models for established and growth-stage pharmaceutical businesses.",
    priorities: ["Portfolio productivity", "Market expansion", "Product development", "Supply resilience"],
  },
  {
    index: "02",
    title: "Biotech & specialty pharma",
    description:
      "Decision support for focused portfolios, external innovation, partner strategy, asset positioning, development planning, and commercial pathway design where capital and specialist capability must be tightly allocated.",
    priorities: ["Asset strategy", "Partnering", "Development governance", "Launch pathway"],
  },
  {
    index: "03",
    title: "Consumer health & nutraceuticals",
    description:
      "Category, portfolio, evidence, formulation, channel, brand, distribution, and international market-entry strategy for science-led consumer health businesses.",
    priorities: ["Category strategy", "Portfolio design", "Channel economics", "Market entry"],
  },
  {
    index: "04",
    title: "Medical devices & diagnostics",
    description:
      "Product-market fit, partner selection, market-entry model, evidence and regulatory dependency mapping, launch readiness, and commercial pathway planning.",
    priorities: ["Market assessment", "Partner strategy", "Access pathway", "Commercial readiness"],
  },
  {
    index: "05",
    title: "Manufacturers & CDMOs",
    description:
      "Growth strategy, capability positioning, target-market alignment, customer proposition, technology-transfer readiness, programme governance, and partnership development for manufacturing organisations.",
    priorities: ["Growth positioning", "Capability strategy", "Transfer readiness", "Customer development"],
  },
  {
    index: "06",
    title: "Distributors & market-access organisations",
    description:
      "Portfolio strategy, supplier architecture, channel model, differentiated proposition, account strategy, data visibility, and operating resilience for organisations connecting products to markets.",
    priorities: ["Portfolio quality", "Channel strategy", "Supplier model", "Operating intelligence"],
  },
] as const;

export const decisions = [
  "Which products and markets deserve capital now?",
  "How should we enter without overbuilding the organisation?",
  "Which partner can execute—not merely promise?",
  "Where will development or transfer fail before it becomes visible?",
  "How do we build resilience without creating waste?",
  "What should data and AI actually change in the operating model?",
] as const;

export const approach = [
  {
    index: "01",
    title: "Frame the decision",
    text: "Define the decision, the owner, the time horizon, the alternatives, and the consequence of getting it wrong. We do not begin with a slide template; we begin with decision clarity.",
  },
  {
    index: "02",
    title: "Build the evidence base",
    text: "Connect market, technical, regulatory, operational, commercial, and financial evidence. Separate known facts, informed assumptions, unresolved questions, and genuine uncertainty.",
  },
  {
    index: "03",
    title: "Design the choices",
    text: "Create distinct strategic options with explicit trade-offs, dependencies, economics, capability demands, and risk. Good strategy is choice architecture—not a list of ambitions.",
  },
  {
    index: "04",
    title: "Mobilise the pathway",
    text: "Translate the chosen direction into workstreams, decision gates, owners, partners, milestones, information flows, and a sequenced implementation roadmap.",
  },
  {
    index: "05",
    title: "Govern the outcome",
    text: "Install a practical cadence for decisions, risks, dependencies, escalation, and performance so the strategy continues to function after the presentation ends.",
  },
] as const;

export type Insight = {
  slug: string;
  category: string;
  title: string;
  dek: string;
  readTime: string;
  published: string;
  publishedIso: string;
  modifiedIso: string;
  thesis: string;
  sections: readonly {
    heading: string;
    paragraphs: readonly string[];
  }[];
};

export const insights: readonly Insight[] = [
  {
    slug: "approval-is-not-access",
    category: "Market entry",
    title: "Approval is not access",
    dek: "A regulatory milestone creates permission to compete. It does not create demand, distribution, reimbursement, partner commitment, or operational readiness.",
    readTime: "6 min read",
    published: "21 July 2026",
    publishedIso: "2026-07-21",
    modifiedIso: "2026-07-21",
    thesis:
      "The strongest market-entry plans treat regulatory, commercial, channel, supply, evidence, and operating decisions as one connected system.",
    sections: [
      {
        heading: "The milestone that can distort the plan",
        paragraphs: [
          "In pharmaceutical expansion, approval is visible, binary, and easy to celebrate. Access is distributed across many less visible decisions: who will buy, who will prescribe or recommend, who will stock, who will pay, who will carry inventory, which evidence will change behaviour, and which organisation will own each dependency.",
          "When approval becomes the centre of the strategy, teams often postpone the harder questions until the product is technically ready but commercially unprepared. The result is a launch date without a launch system.",
        ],
      },
      {
        heading: "Build the market backwards from adoption",
        paragraphs: [
          "A credible pathway begins with the intended adoption mechanism. Define the customer, decision-maker, patient or end user, channel, purchasing logic, evidence threshold, economic incentive, and operational hand-off. Then work backwards to determine what the regulatory and development programme must enable.",
          "This changes the sequence of work. Partner selection becomes an operating-model decision rather than a late-stage transaction. Packaging, pack size, pricing, evidence generation, supply configuration, and service expectations are designed for the market rather than inherited from the product's origin country.",
        ],
      },
      {
        heading: "Use gates, not optimism",
        paragraphs: [
          "Market entry should move through explicit decision gates: strategic attractiveness, pathway feasibility, partner viability, unit economics, supply readiness, evidence readiness, and launch control. Each gate should have an owner, a minimum evidence standard, and a stop-or-redesign condition.",
          "The objective is not to slow expansion. It is to prevent capital and credibility from being committed to a pathway that depends on unresolved assumptions behaving like facts.",
        ],
      },
    ],
  },
  {
    slug: "portfolio-resilience-before-sourcing",
    category: "Portfolio & supply",
    title: "Portfolio resilience begins before sourcing",
    dek: "A second supplier cannot repair a portfolio whose economics, specifications, market dependencies, and decision rights were fragile from the start.",
    readTime: "7 min read",
    published: "21 July 2026",
    publishedIso: "2026-07-21",
    modifiedIso: "2026-07-21",
    thesis:
      "Resilience is a portfolio and operating-model discipline first; supplier redundancy is only one of its tools.",
    sections: [
      {
        heading: "Redundancy is not the same as resilience",
        paragraphs: [
          "Organisations often respond to supply risk by adding another manufacturer or another geography. That can help, but it can also add transfer cost, quality complexity, fragmented volume, and more interfaces without reducing the underlying exposure.",
          "The first question is not how many suppliers exist. It is how failure travels through the portfolio. A single API, analytical method, packaging component, release dependency, forecast assumption, or market-specific specification can remain the true point of concentration even when two finished-dose sites are available.",
        ],
      },
      {
        heading: "Map fragility at product level",
        paragraphs: [
          "Resilience should be designed product by product. Examine technical substitutability, lead times, minimum batches, shelf life, demand volatility, regulatory change burden, margin headroom, partner responsiveness, inventory visibility, and the time required to qualify an alternative.",
          "This produces a differentiated answer. Some products justify dual sourcing. Others are better protected through specification strategy, inventory policy, contractual controls, demand shaping, transfer-ready documentation, or a planned exit before risk becomes loss.",
        ],
      },
      {
        heading: "Govern the signals before the disruption",
        paragraphs: [
          "Resilient systems identify weakening signals early: delayed responses, repeated deviations, capacity changes, ownership transitions, raw-material concentration, quality drift, forecast error, and deteriorating economics.",
          "The operating model must define who sees those signals, who interprets them, who can trigger action, and what evidence is required. A risk register that is reviewed after disruption is an archive, not a control system.",
        ],
      },
    ],
  },
  {
    slug: "technology-transfer-is-governance",
    category: "Development & manufacturing",
    title: "Technology transfer is a governance problem before it is a technical one",
    dek: "Most transfer programmes do not fail because nobody understands the formulation. They fail because knowledge, responsibilities, evidence, decisions, and escalation are poorly controlled.",
    readTime: "8 min read",
    published: "21 July 2026",
    publishedIso: "2026-07-21",
    modifiedIso: "2026-07-21",
    thesis:
      "Technical transfer succeeds when the programme architecture makes ambiguity visible early and assigns authority to resolve it.",
    sections: [
      {
        heading: "The document package is not the transfer",
        paragraphs: [
          "A dossier, method, master formula, or batch record can describe the product, but it cannot carry all tacit knowledge about process sensitivity, historical failures, analytical behaviour, operator judgement, equipment interaction, or the rationale behind development choices.",
          "A transfer plan that focuses only on document exchange assumes knowledge is complete, explicit, current, understood, and compatible with the receiving site. Those assumptions should be tested rather than inherited.",
        ],
      },
      {
        heading: "Design a decision system around the science",
        paragraphs: [
          "The programme needs one integrated view of technical questions, evidence gaps, responsibilities, dependencies, changes, risks, and decisions. Every unresolved item should have an owner, due date, impact assessment, and escalation route.",
          "Governance should also protect technical integrity from schedule pressure. When commercial dates move faster than evidence, the programme must make the trade-off explicit rather than allowing risk to migrate silently into validation, stability, submission, or routine supply.",
        ],
      },
      {
        heading: "Measure readiness, not activity",
        paragraphs: [
          "Meetings held, documents shared, and batches scheduled are activity measures. Readiness asks different questions: Is critical knowledge understood? Are methods suitable at the receiving site? Are equipment differences resolved? Are materials and specifications controlled? Are deviations and changes decision-ready? Is the regulatory impact understood?",
          "The transfer is ready when the receiving organisation can reproduce the product and control the process with evidence—not when the project plan is full.",
        ],
      },
    ],
  },
] as const;

export function getInsight(slug: string) {
  return insights.find((insight) => insight.slug === slug);
}
