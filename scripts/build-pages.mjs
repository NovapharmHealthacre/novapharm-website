import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const siteUrl = "https://www.novapharmhealthcare.com";
const heroImage = "url('/assets/novapharm-healthcare-hero.jpg')";

const nav = [
  ["About", "/about/"],
  ["Services", "/services/"],
  ["Regulatory", "/regulatory-services/"],
  ["Products", "/product-portfolio/"],
  ["Partners", "/partner-with-us/"],
  ["Investors", "/investor-information/"],
  ["Insights", "/news-insights/"],
  ["Careers", "/careers/"],
  ["Open Account", "/account-application/"],
  ["Portal", "/portal/"]
];

const pages = [
  {
    slug: "",
    title: "NovaPharm Healthcare | UK Pharmaceutical Company & MHRA Regulatory Services",
    description: "NovaPharm Healthcare is a UK healthcare and pharmaceutical company focused on MHRA-aware regulatory services, pharmaceutical imports and exports, distribution, product access, and partner-ready healthcare operations.",
    keywords: "UK pharmaceutical company, MHRA regulatory services, UK healthcare company, pharmaceutical distribution UK, pharmaceutical imports UK, pharmaceutical exports UK",
    h1: "A modern UK pharmaceutical company built for regulated healthcare growth.",
    eyebrow: "NovaPharm Healthcare Ltd",
    intro: "We combine regulatory intelligence, compliant sourcing, distributor readiness and investor-grade operations for UK and international healthcare markets.",
    layout: "home"
  },
  {
    slug: "about",
    title: "About NovaPharm Healthcare | UK Healthcare Company",
    description: "Learn about NovaPharm Healthcare Ltd, a UK healthcare company building MHRA-aware pharmaceutical, regulatory, sourcing and distribution capabilities.",
    keywords: "UK healthcare company, NovaPharm Healthcare, pharmaceutical company UK",
    h1: "Healthcare infrastructure for regulated markets.",
    eyebrow: "About Us",
    intro: "NovaPharm Healthcare is building a clean, compliant and commercially disciplined platform for regulatory services, healthcare partnerships and future product distribution.",
    sections: [
      ["Company purpose", "NovaPharm Healthcare exists to help healthcare organisations, distributors, investors and product owners navigate regulated pharmaceutical markets with clarity, discipline and trust."],
      ["Operating philosophy", "The company is designed around compliance by default, clean documentation, practical commercial execution and scalable systems that can support future MHRA, GDP, PV and partner workflows."],
      ["UK focus", "NovaPharm is UK-focused while maintaining international ambition across compliant imports, exports, regulatory advisory and healthcare partnerships."]
    ],
    faqs: [
      ["Is NovaPharm Healthcare a UK company?", "Yes. NovaPharm Healthcare Ltd is positioned as a UK healthcare and pharmaceutical company serving regulated UK and international healthcare opportunities."],
      ["Does NovaPharm provide regulatory support?", "The website presents MHRA-aware regulatory services and UK/international regulatory support capabilities subject to appropriate engagement, scope and professional review."]
    ]
  },
  {
    slug: "company-profile",
    title: "Company Profile | NovaPharm Healthcare Ltd",
    description: "Company profile for NovaPharm Healthcare Ltd, including strategic focus areas, partner readiness, regulatory awareness and investor information.",
    keywords: "NovaPharm company profile, healthcare company profile UK, pharmaceutical company profile",
    h1: "A scalable company profile for partners, distributors and investors.",
    eyebrow: "Company Profile",
    intro: "NovaPharm Healthcare is structured to serve multiple regulated healthcare opportunities: advisory, regulatory services, product access, distribution readiness and strategic partnerships.",
    sections: [
      ["Business model", "A multi-service healthcare platform spanning regulatory affairs, product portfolio development, distributor opportunities, partner engagement and secure client documentation."],
      ["Governance", "The site now includes private portal, admin, security, audit and SharePoint integration architecture to support a more mature operating model."],
      ["Market orientation", "NovaPharm is positioned for UK healthcare stakeholders, pharmaceutical import/export opportunities, regulatory services and future commercial expansion."]
    ]
  },
  {
    slug: "services",
    title: "Pharmaceutical Regulatory Consultancy & Healthcare Services UK | NovaPharm",
    description: "Explore NovaPharm Healthcare services including regulatory affairs consultancy, product access, pharmaceutical imports and exports, partner support and distributor readiness.",
    keywords: "Pharmaceutical regulatory consultancy, regulatory affairs consultancy, UK healthcare services, pharmaceutical imports UK, pharmaceutical exports UK",
    h1: "Services for regulated pharmaceutical and healthcare growth.",
    eyebrow: "Services",
    intro: "A focused service portfolio for companies that need MHRA-aware execution, credible documentation and commercially practical healthcare support.",
    serviceCards: [
      ["Regulatory Affairs Consultancy", "MHRA-aware regulatory planning, document structure, submission readiness and market-entry support."],
      ["Pharmaceutical Imports & Exports", "Commercial and compliance architecture for UK and international medicine movement subject to required authorisations."],
      ["Distributor Readiness", "Partner documentation, product file structure, due diligence packs and operating controls for distribution relationships."],
      ["Healthcare Market Access", "Positioning, stakeholder documentation and opportunity assessment for UK healthcare routes."],
      ["Investor & Board Support", "Investor-ready materials, business planning, performance dashboards and board-level reporting."],
      ["Digital Operations", "Secure portal, file library, executive dashboards, SharePoint architecture and data-room readiness."]
    ],
    faqs: [
      ["What services does NovaPharm Healthcare provide?", "NovaPharm provides regulatory, healthcare, distributor-readiness, partner, investor and digital operations services for regulated pharmaceutical markets."],
      ["Does NovaPharm support pharmaceutical imports and exports?", "The service architecture supports pharmaceutical imports and exports subject to the right licences, due diligence and regulatory requirements."]
    ]
  },
  {
    slug: "regulatory-services",
    title: "MHRA Regulatory Services UK | Pharmaceutical Regulatory Consultancy",
    description: "MHRA-aware regulatory services for pharmaceutical businesses, including regulatory affairs consultancy, document readiness, compliance planning and submission support.",
    keywords: "MHRA regulatory services, Pharmaceutical regulatory consultancy, Regulatory affairs consultancy, UK medical products",
    h1: "MHRA-aware regulatory services for serious healthcare operators.",
    eyebrow: "Regulatory Services",
    intro: "Regulatory confidence starts with precise documentation, clear responsibilities and a realistic understanding of UK healthcare obligations.",
    serviceCards: [
      ["MHRA readiness", "Structured preparation for licence, product, quality and evidence packs."],
      ["Regulatory documentation", "Controlled document frameworks, registers, SOP structures and evidence mapping."],
      ["PV and quality awareness", "Pharmacovigilance, recall, batch traceability and quality process architecture."],
      ["Regulatory operations", "Task tracking, portal document access and SharePoint synchronization architecture."]
    ]
  },
  {
    slug: "uk-international-regulatory-services",
    title: "UK & International Regulatory Services | NovaPharm Healthcare",
    description: "UK and international regulatory services for healthcare companies planning pharmaceutical imports, exports, distribution, product access and compliance documentation.",
    keywords: "UK international regulatory services, pharmaceutical imports UK, pharmaceutical exports UK, regulatory affairs consultancy",
    h1: "UK and international regulatory services for cross-border healthcare growth.",
    eyebrow: "UK & International",
    intro: "NovaPharm supports regulatory planning for UK-focused and international healthcare activities, with emphasis on compliant market entry and disciplined documentation.",
    sections: [
      ["UK services", "MHRA-aware documentation, regulatory readiness, product information architecture and stakeholder-ready compliance packs."],
      ["International services", "Structured support for import/export planning, partner due diligence, distributor file rooms and country-specific evidence workflows."],
      ["Governance", "All services are designed to respect regulatory boundaries and to escalate specialist legal, Responsible Person or regulatory sign-off where required."]
    ]
  },
  {
    slug: "product-portfolio",
    title: "UK Medical Products & Product Portfolio | NovaPharm Healthcare",
    description: "NovaPharm Healthcare product portfolio architecture for UK medical products, pharmaceutical categories, regulatory documentation and future product services.",
    keywords: "UK medical products, pharmaceutical products UK, product portfolio healthcare",
    h1: "A portfolio architecture ready for compliant product growth.",
    eyebrow: "Product Portfolio",
    intro: "The portfolio page is designed for future product categories, distributor materials and regulatory document alignment without making unverified product claims.",
    sections: [
      ["Portfolio governance", "Each future product category can be supported by controlled product catalogues, regulatory files, supplier due diligence and commercial documentation."],
      ["Category readiness", "The portal includes Product Catalogues and Regulatory Documents folders so product information can be synchronized from SharePoint once Microsoft Graph credentials are configured."],
      ["Claims discipline", "Product pages should only publish verified, approved and regulatorily appropriate claims."]
    ]
  },
  {
    slug: "partner-with-us",
    title: "Partner With NovaPharm Healthcare | UK Pharmaceutical Partnerships",
    description: "Partner with NovaPharm Healthcare for regulatory services, distribution readiness, UK healthcare opportunities, product access and strategic growth.",
    keywords: "partner with pharmaceutical company UK, healthcare partnerships UK, pharmaceutical distribution UK",
    h1: "Partner with a disciplined healthcare platform.",
    eyebrow: "Partner With Us",
    intro: "NovaPharm works best with organisations that value compliance, clear documentation, responsive execution and long-term healthcare impact.",
    serviceCards: [
      ["Product owners", "Prepare product documentation, regulatory packs and UK market access planning."],
      ["Distributors", "Create distributor-ready materials, catalogues and qualification files."],
      ["Healthcare providers", "Explore compliant service and product access opportunities."],
      ["Technology partners", "Integrate secure document, workflow, analytics and SharePoint-enabled operations."]
    ]
  },
  {
    slug: "distributor-opportunities",
    title: "Pharmaceutical Distribution UK | Distributor Opportunities",
    description: "Distributor opportunities with NovaPharm Healthcare for UK pharmaceutical distribution readiness, product catalogues, document packs and healthcare partnerships.",
    keywords: "Pharmaceutical distribution UK, distributor opportunities pharma, UK pharmaceutical company",
    h1: "Distributor-ready systems for UK pharmaceutical growth.",
    eyebrow: "Distributor Opportunities",
    intro: "NovaPharm is building partner, product and document infrastructure that helps distributor conversations move faster and more professionally.",
    sections: [
      ["Distributor materials", "Product catalogues, company profiles, regulatory documents and commercial packs can be managed through the private portal."],
      ["Compliance-first workflow", "Distributor opportunities are evaluated through document quality, licence requirements, product status and commercial fit."],
      ["Operational visibility", "The integrated Executive Platform gives leadership visibility across sourcing, logistics, finance, tenders and regulatory workflows."]
    ]
  },
  {
    slug: "investor-information",
    title: "Investor Information | NovaPharm Healthcare Ltd",
    description: "Investor information for NovaPharm Healthcare, including company profile, growth focus, executive platform, business plan file room and investor-ready materials.",
    keywords: "NovaPharm investor information, healthcare investors UK, pharmaceutical company investors",
    h1: "Investor-ready healthcare infrastructure.",
    eyebrow: "Investor Information",
    intro: "The website and private portal now support investor-grade materials, executive dashboards, market narrative, controlled documents and a secure investor file room architecture.",
    sections: [
      ["Why now", "UK healthcare continues to need resilient, compliant, technology-enabled companies that can bridge regulatory knowledge and practical execution."],
      ["What is built", "A premium public website, private portal, admin dashboard, executive platform integration, SharePoint architecture and SEO/GEO content foundation."],
      ["File room", "Investor Files and Business Plans are represented in the portal and can synchronize with SharePoint once Graph credentials are configured."]
    ]
  },
  {
    slug: "contact",
    title: "Contact NovaPharm Healthcare | Regulatory Services & Distribution Enquiries",
    description: "Contact NovaPharm Healthcare for MHRA regulatory services, pharmaceutical distribution UK, regulatory affairs consultancy, partner or investor enquiries.",
    keywords: "contact NovaPharm Healthcare, MHRA regulatory services, pharmaceutical distribution UK",
    h1: "Speak with NovaPharm Healthcare.",
    eyebrow: "Contact Us",
    intro: "For regulatory, product, partner, distributor, investor or portal enquiries, submit the form below and the team will review your request.",
    layout: "contact"
  },
  {
    slug: "news-insights",
    title: "News & Insights | UK Healthcare, MHRA and Pharmaceutical Strategy",
    description: "News and insights from NovaPharm Healthcare covering UK pharmaceutical strategy, MHRA-aware operations, regulatory services and healthcare growth.",
    keywords: "UK healthcare insights, MHRA insights, pharmaceutical strategy UK",
    h1: "News and insights for regulated healthcare growth.",
    eyebrow: "News & Insights",
    intro: "A structured editorial area for market commentary, regulatory explainers, partner updates and company announcements.",
    serviceCards: [
      ["MHRA-aware operating models", "Why documentation, role clarity and controlled processes matter before scale."],
      ["Distributor readiness", "How healthcare companies can prepare cleaner partner packs and faster due diligence."],
      ["AI search and healthcare trust", "Why structured entity content helps serious buyers and AI engines understand your company."]
    ]
  },
  {
    slug: "careers",
    title: "Careers | NovaPharm Healthcare",
    description: "Careers at NovaPharm Healthcare for regulatory, operations, partnerships, digital, product and healthcare growth roles.",
    keywords: "NovaPharm careers, pharmaceutical careers UK, healthcare jobs UK",
    h1: "Build disciplined healthcare infrastructure with NovaPharm.",
    eyebrow: "Careers",
    intro: "NovaPharm is preparing for future roles across regulatory affairs, operations, partnerships, digital systems, product documentation and commercial growth.",
    sections: [
      ["Culture", "High standards, clear documentation, thoughtful execution and respect for healthcare responsibilities."],
      ["Future roles", "Regulatory affairs, operations, supply chain, partnerships, digital systems, marketing, finance and administration."],
      ["How to enquire", "Use the contact form and select Careers to register your interest."]
    ]
  }
];

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function pagePath(slug) {
  return slug ? `/${slug}/` : "/";
}

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function header(currentSlug) {
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="NovaPharm Healthcare home">
        <img src="/assets/Novapharm-logo.svg" alt="" width="42" height="42">
        <span><span class="brand-name">NovaPharm Healthcare</span><span class="brand-meta">UK healthcare and pharmaceutical services</span></span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-label="Open navigation" data-nav-toggle>☰</button>
      <nav class="site-nav" aria-label="Primary navigation" data-site-nav>
        ${nav.map(([label, href]) => `<a href="${href}"${href === pagePath(currentSlug) ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h2>NovaPharm Healthcare</h2>
          <p>UK healthcare and pharmaceutical services company focused on regulatory readiness, partner infrastructure and disciplined growth.</p>
        </div>
        <div><h3>Company</h3><a href="/about/">About</a><a href="/company-profile/">Company Profile</a><a href="/investor-information/">Investors</a><a href="/careers/">Careers</a></div>
        <div><h3>Services</h3><a href="/services/">Services</a><a href="/regulatory-services/">Regulatory</a><a href="/product-portfolio/">Products</a><a href="/distributor-opportunities/">Distribution</a></div>
        <div><h3>Portals</h3><a href="/portal/">Client Portal</a><a href="/admin/dashboard/">Admin Dashboard</a><a href="/contact/">Contact</a></div>
      </div>
      <div class="footer-bottom">© <span data-year></span> NovaPharm Healthcare Ltd. Information is for corporate and service positioning only and does not replace professional regulatory, legal or clinical advice.</div>
    </div>
  </footer>`;
}

function seo(page) {
  const canonical = `${siteUrl}${pagePath(page.slug)}`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "NovaPharm Healthcare Ltd",
      url: siteUrl,
      logo: `${siteUrl}/assets/Novapharm-logo.svg`,
      foundingLocation: "United Kingdom",
      areaServed: ["United Kingdom", "International"],
      description: "UK healthcare and pharmaceutical services company focused on regulatory readiness, product access, partner infrastructure and compliant growth.",
      knowsAbout: ["MHRA regulatory services", "Pharmaceutical regulatory consultancy", "Pharmaceutical distribution UK", "Regulatory affairs consultancy", "Pharmaceutical imports UK", "Pharmaceutical exports UK"]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      url: canonical,
      description: page.description,
      inLanguage: "en-GB",
      isPartOf: { "@type": "WebSite", name: "NovaPharm Healthcare", url: siteUrl }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        ...(page.slug ? [{ "@type": "ListItem", position: 2, name: page.eyebrow, item: canonical }] : [])
      ]
    }
  ];
  if (page.serviceCards || page.slug.includes("regulatory") || page.slug === "services") {
    schema.push({
      "@context": "https://schema.org",
      "@type": "Service",
      name: page.eyebrow,
      provider: { "@type": "Organization", name: "NovaPharm Healthcare Ltd" },
      areaServed: "United Kingdom",
      serviceType: page.keywords
    });
  }
  if (page.faqs) {
    schema.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } }))
    });
  }
  return `
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="keywords" content="${esc(page.keywords)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:image" content="${siteUrl}/assets/novapharm-og.jpg">
  <meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${siteUrl}/assets/novapharm-og.jpg">
  ${schema.map((item) => `<script type="application/ld+json">${JSON.stringify(item)}</script>`).join("\n  ")}`;
}

function head(page) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#c1121f">
  <link rel="icon" href="/assets/Novapharm-logo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700;800&family=Inter:wght@400;500;650;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/novapharm.css">
  ${seo(page)}
</head>`;
}

function home(page) {
  return `${head(page)}
<body style="--hero-image:${heroImage}">
${header(page.slug)}
<main id="main">
  <section class="hero">
    <div class="container hero-content">
      <span class="eyebrow">${esc(page.eyebrow)}</span>
      <h1>${esc(page.h1)}</h1>
      <p>${esc(page.intro)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/contact/">Start a conversation</a>
        <a class="btn btn-outline" href="/investor-information/">Investor information</a>
      </div>
    </div>
  </section>
  <div class="container hero-proof" aria-label="NovaPharm platform highlights">
    <div class="proof-item"><span class="proof-value">UK</span><span class="proof-label">Healthcare and pharmaceutical focus</span></div>
    <div class="proof-item"><span class="proof-value">MHRA</span><span class="proof-label">Regulatory-aware service architecture</span></div>
    <div class="proof-item"><span class="proof-value">M365</span><span class="proof-label">SharePoint-ready client operations</span></div>
    <div class="proof-item"><span class="proof-value">Portal</span><span class="proof-label">Private executive platform integration</span></div>
  </div>
  <section class="section">
    <div class="container feature-split">
      <div>
        <div class="section-head"><h2>Built for serious pharmaceutical, healthcare and investor conversations.</h2><p>NovaPharm now has a premium public website, secure private portal, admin dashboard and Microsoft 365 integration architecture.</p></div>
        <ul class="list-check">
          <li>Regulatory services and MHRA-aware content architecture</li>
          <li>Distributor and partner opportunity pages</li>
          <li>Investor-ready positioning and file-room readiness</li>
          <li>Generative engine optimization with structured entities and FAQs</li>
        </ul>
      </div>
      <div class="feature-media"><img src="/assets/novapharm-healthcare-hero.jpg" alt="Premium pharmaceutical logistics and regulatory operations environment" width="1672" height="941" loading="lazy"></div>
    </div>
  </section>
  <section class="section section-band">
    <div class="container">
      <div class="section-head"><h2>Core capabilities</h2><p>Designed for UK healthcare, regulatory affairs, pharmaceutical distribution and future product services.</p></div>
      <div class="grid grid-3">
        ${[
          ["MHRA-aware regulatory services", "Document readiness, evidence mapping, quality process architecture and regulatory planning."],
          ["Distribution and partner readiness", "Product catalogues, distributor packs, due diligence and controlled document workflows."],
          ["Private client portal", "Secure access to executive dashboards, documents, downloads, announcements and tasks."],
          ["Investor-grade materials", "Company profile, business plan architecture, board-ready reporting and data-room structure."],
          ["SharePoint architecture", "Graph API client, folder provisioning guide and role-based access plan."],
          ["SEO and GEO foundation", "Structured data, entity content, sitemap, robots, FAQs and semantic HTML."]
        ].map(([title, text]) => `<article class="card"><span class="icon">+</span><h3>${title}</h3><p>${text}</p></article>`).join("")}
      </div>
    </div>
  </section>
</main>
${footer()}
<script src="/assets/js/novapharm.js" defer></script>
</body>
</html>`;
}

function generic(page) {
  return `${head(page)}
<body>
${header(page.slug)}
<main id="main">
  <section class="page-hero">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>${esc(page.eyebrow)}</span></nav>
      <span class="eyebrow">${esc(page.eyebrow)}</span>
      <h1>${esc(page.h1)}</h1>
      <p>${esc(page.intro)}</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      ${page.serviceCards ? `<div class="grid grid-3">${page.serviceCards.map(([title, text]) => `<article class="card"><span class="icon">+</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div>` : ""}
      ${page.sections ? `<div class="grid grid-3">${page.sections.map(([title, text]) => `<article class="card"><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join("")}</div>` : ""}
      ${page.layout === "contact" ? contactMarkup() : ""}
      ${page.faqs ? faqMarkup(page.faqs) : ""}
    </div>
  </section>
  ${page.slug === "about" ? leadershipMarkup() : ""}
</main>
${footer()}
<script src="/assets/js/novapharm.js" defer></script>
</body>
</html>`;
}

function contactMarkup() {
  return `<div class="feature-split">
    <form class="card form-grid" data-contact-form>
      <div class="form-row"><div class="field"><label for="name">Name</label><input id="name" name="name" autocomplete="name" required></div><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div></div>
      <div class="form-row"><div class="field"><label for="company">Company</label><input id="company" name="company" autocomplete="organization" required></div><div class="field"><label for="enquiryType">Enquiry type</label><select id="enquiryType" name="enquiryType" required><option value="">Select</option><option>Regulatory services</option><option>Distributor opportunity</option><option>Investor information</option><option>Product portfolio</option><option>Careers</option><option>Client portal</option></select></div></div>
      <div class="field"><label for="message">Message</label><textarea id="message" name="message" required></textarea></div>
      <button class="btn btn-primary" type="submit">Submit enquiry</button>
      <div class="alert" data-form-status>Submissions are protected with CSRF and rate limiting when served through the secure Node runtime.</div>
    </form>
    <aside>
      <div class="section-head"><h2>Corporate enquiries</h2><p>Use this page for regulatory, partnership, distributor, investor and portal enquiries. Do not submit patient-identifiable clinical information through this form.</p></div>
      <ul class="list-check"><li>Regulatory and MHRA-aware service enquiries</li><li>Partner and distributor discussions</li><li>Investor information and secure file-room access</li><li>Product portfolio and document requests</li></ul>
    </aside>
  </div>`;
}

function faqMarkup(faqs) {
  return `<div class="section-tight faq">${faqs.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join("")}</div>`;
}

function leadershipMarkup() {
  return `<section class="section section-band"><div class="container"><div class="section-head"><h2>Leadership presence</h2><p>The website keeps the existing leadership imagery while presenting the company with a more mature enterprise interface.</p></div><div class="grid grid-3">
    <article class="card"><img src="/assets/vishalchakravarty.jpeg" alt="Vishal Chakravarty" loading="lazy"><h3>Vishal Chakravarty</h3><p>Chief Executive Officer. Corporate strategy, healthcare platform development and investor-facing execution.</p></article>
    <article class="card"><img src="/assets/prabhakarvitthallahare.jpeg" alt="Prabhakar Vitthal Lahare" loading="lazy"><h3>Prabhakar Vitthal Lahare</h3><p>Operations and commercial support for healthcare growth initiatives.</p></article>
    <article class="card"><img src="/assets/girishshantilalachliya.jpeg" alt="Girish Shantilal Achliya" loading="lazy"><h3>Girish Shantilal Achliya</h3><p>Scientific and healthcare advisory support for strategic development.</p></article>
  </div></div></section>`;
}

const customerNavigation = [
  ["dashboard", "Dashboard"], ["account", "My Account"], ["orders", "My Orders"], ["invoices", "My Invoices"],
  ["statements", "My Statements"], ["products", "My Products"], ["price-lists", "Price Lists"], ["stock-availability", "Stock Availability"],
  ["order-tracking", "Order Tracking"], ["delivery-tracking", "Delivery Tracking"], ["returns", "Returns"],
  ["quality-complaints", "Quality Complaints"], ["documents", "Documents"], ["support", "Support Tickets"],
  ["regulatory-documents", "Regulatory Documents"], ["downloads", "Downloads"], ["analytics", "Analytics"], ["settings", "Settings"]
];

const employeeNavigation = [
  ["dashboard", "Dashboard"], ["customers", "Customers"], ["suppliers", "Suppliers"], ["products", "Products"],
  ["orders", "Orders"], ["warehouse", "Warehouse"], ["purchasing", "Purchasing"], ["finance", "Finance"],
  ["quality", "Quality"], ["regulatory", "Regulatory"], ["crm", "CRM"], ["reports", "Reports"], ["administration", "Administration"]
];

function applicationShell({ area, kind, title, body, navigation, scripts = [] }) {
  const root = area === "Customer Portal" ? "/portal" : "/employee";
  const links = navigation.map(([slug, label]) => `<a href="${root}/${slug}/"${kind === slug ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | NovaPharm ${area}</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/css/novapharm.css"></head><body data-enterprise-page="${kind}"><div class="portal-shell"><aside class="portal-sidebar"><a class="brand" href="${root}/dashboard/"><img src="/assets/Novapharm-logo.svg" alt="" width="42" height="42"><span><span class="brand-name" style="color:#fff">NovaPharm</span><span class="brand-meta" style="color:#cbd5e1">${area}</span></span></a><nav aria-label="${area} navigation">${links}${area === "Employee Portal" ? '<a href="/portal/executive-platform/NP_Hub.html">Executive Platform</a><a href="/admin/dashboard/">Administration</a>' : ""}<button class="btn btn-outline" type="button" data-logout>Logout</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div><span class="eyebrow">${area}</span><h1 style="color:var(--ink);margin:8px 0 0">${title}</h1></div><span class="status-pill">Signed in as <span data-user-name></span></span></div>${body}</main></div><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/enterprise-app.js" defer></script>${scripts.map((src) => `<script src="${src}" defer></script>`).join("")}</body></html>`;
}

function portalPage(kind, title, body) {
  return applicationShell({ area: "Customer Portal", kind, title, body, navigation: customerNavigation });
}

function employeePage(kind, title, body) {
  return applicationShell({ area: "Employee Portal", kind, title, body, navigation: employeeNavigation });
}

function adminPage(kind, title, body) {
  const navigation = [["dashboard", "Dashboard"], ["users", "Users"], ["content", "Content"], ["analytics", "Analytics"]];
  const links = navigation.map(([slug, label]) => `<a href="/admin/${slug}/"${kind === slug ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | NovaPharm Admin</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/css/novapharm.css"></head><body><div class="portal-shell"><aside class="portal-sidebar"><a class="brand" href="/admin/dashboard/"><img src="/assets/Novapharm-logo.svg" alt="" width="42" height="42"><span><span class="brand-name" style="color:#fff">NovaPharm</span><span class="brand-meta" style="color:#cbd5e1">Admin</span></span></a><nav aria-label="Admin navigation">${links}<a href="/employee/dashboard/">Employee Portal</a><button class="btn btn-outline" type="button" data-logout>Logout</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div><span class="eyebrow">Admin</span><h1 style="color:var(--ink);margin:8px 0 0">${title}</h1></div><span class="status-pill">Canonical data</span></div>${body}</main></div><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/admin-app.js" defer></script></body></html>`;
}

function loginPage() {
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Secure Portal Login | NovaPharm Healthcare</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/css/novapharm.css"></head><body class="login-page"><main class="login-panel"><img src="/assets/Novapharm-logo.svg" alt="NovaPharm Healthcare logo"><h1 style="color:var(--ink);margin:0 0 10px">NovaPharm Secure Portal</h1><p>One authenticated entry point for customer services, employee operations, controlled documents and executive intelligence.</p><form class="form-grid" data-login-form><div class="field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="btn btn-primary" type="submit">Sign in</button><div class="alert" data-login-status>Credentials are verified server-side.</div></form></main><script src="/assets/js/portal-login.js" defer></script></body></html>`;
}

function accountApplicationPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Customer Account Application",
    url: `${siteUrl}/account-application/`,
    description: "Apply for a NovaPharm Healthcare customer account with secure company, compliance and document submission.",
    isPartOf: { "@type": "WebSite", name: "NovaPharm Healthcare", url: siteUrl },
    about: { "@type": "Organization", name: "NovaPharm Healthcare Ltd" }
  };
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Customer Account Application | NovaPharm Healthcare</title><meta name="description" content="Apply for a NovaPharm Healthcare customer account with secure company, compliance and document submission."><meta name="robots" content="index,follow"><link rel="canonical" href="${siteUrl}/account-application/"><link rel="stylesheet" href="/assets/css/novapharm.css"><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body>${header("account-application")}<main><section class="page-hero"><div class="container"><span class="eyebrow">Customer onboarding</span><h1>Open a NovaPharm customer account.</h1><p>Submit company, responsible-person, GDP, credit and licence information through one controlled workflow.</p></div></section><section class="section"><div class="container form-shell"><form class="form-grid" data-account-application><fieldset><legend>Company details</legend><div class="form-row"><div class="field"><label for="legalName">Legal company name</label><input id="legalName" name="legalName" required></div><div class="field"><label for="tradingName">Trading name</label><input id="tradingName" name="tradingName"></div></div><div class="form-row"><div class="field"><label for="companyNumber">Company number</label><input id="companyNumber" name="companyNumber" required></div><div class="field"><label for="vatNumber">VAT number</label><input id="vatNumber" name="vatNumber"></div></div><div class="field"><label for="customerType">Customer type</label><select id="customerType" name="customerType" required><option value="">Select</option><option value="pharmacy">Pharmacy</option><option value="hospital">Hospital</option><option value="wholesaler">Wholesaler</option><option value="clinic">Clinic</option><option value="other_healthcare">Other healthcare</option></select></div></fieldset><fieldset><legend>Responsible person and addresses</legend><div class="form-row"><div class="field"><label for="responsiblePerson">Responsible person</label><input id="responsiblePerson" name="responsiblePerson" required></div><div class="field"><label for="responsibleRole">Role</label><input id="responsibleRole" name="responsibleRole" required></div></div><div class="field"><label for="responsibleEmail">Responsible person email</label><input id="responsibleEmail" name="responsibleEmail" type="email" required></div><div class="field"><label for="registeredAddress">Registered address</label><textarea id="registeredAddress" name="registeredAddress" required></textarea></div><div class="form-row"><div class="field"><label for="registeredPostcode">Registered postcode</label><input id="registeredPostcode" name="registeredPostcode" required></div><div class="field"><label for="deliveryPostcode">Delivery postcode</label><input id="deliveryPostcode" name="deliveryPostcode"></div></div><div class="field"><label for="deliveryAddress">Delivery address</label><textarea id="deliveryAddress" name="deliveryAddress"></textarea></div></fieldset><fieldset><legend>Compliance and credit</legend><div class="form-row"><div class="field"><label for="wdaNumber">WDA(H) number, if applicable</label><input id="wdaNumber" name="wdaNumber"></div><div class="field"><label for="gdpStatus">GDP status</label><select id="gdpStatus" name="gdpStatus" required><option value="">Select</option><option value="certified">Certified</option><option value="in_progress">In progress</option><option value="not_applicable">Not applicable</option></select></div></div><div class="field"><label for="insuranceStatus">Insurance status</label><input id="insuranceStatus" name="insuranceStatus" required></div><div class="field"><label for="creditReferences">Credit references</label><textarea id="creditReferences" name="creditReferences" required></textarea></div><div class="field"><label for="tradeReferences">Trade references</label><textarea id="tradeReferences" name="tradeReferences" required></textarea></div><div class="field"><label for="email">Application contact email</label><input id="email" name="email" type="email" required></div></fieldset><fieldset><legend>Documents</legend><div class="field"><label for="licenceFiles">Licences and GDP certificates</label><input id="licenceFiles" name="licenceFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" multiple data-document-class="licence"></div><div class="field"><label for="companyFiles">Company registration, VAT, insurance and bank confirmation</label><input id="companyFiles" name="companyFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" multiple data-document-class="company_due_diligence"></div><div class="field"><label for="agreementFiles">Quality agreements and signed contracts</label><input id="agreementFiles" name="agreementFiles" type="file" accept=".pdf,.docx" multiple data-document-class="agreement"></div></fieldset><label class="checkbox"><input type="checkbox" name="bankConfirmation" value="yes" required> Bank details and confirmation are available for compliance review.</label><button class="btn btn-primary" type="submit">Submit application</button></form><div class="alert" data-application-status>Files are stored against the application and queued for SharePoint synchronization.</div></div></section></main>${footer()}<script src="/assets/js/account-application.js" defer></script></body></html>`;
}

for (const page of pages) {
  const html = page.layout === "home" ? home(page) : generic(page);
  writeFile(join(page.slug || ".", "index.html"), html);
}

writeFile("account-application/index.html", accountApplicationPage());
writeFile("portal/index.html", loginPage());
writeFile("portal/dashboard/index.html", portalPage("dashboard", "Customer Dashboard", `<div class="metric-row"><div class="metric"><strong data-live-metric="accountNumber">—</strong><span>Account number</span></div><div class="metric"><strong data-live-metric="availableCredit">—</strong><span>Available credit</span></div><div class="metric"><strong data-live-metric="annualSpend">—</strong><span>Annual spend</span></div><div class="metric"><strong data-live-metric="invoicesDue">—</strong><span>Invoices due</span></div></div><section class="section-tight"><div class="section-head"><h2>Recent orders</h2><p>Updated from the canonical order service.</p></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Account</th><th>Status</th><th>Total</th><th>PO reference</th><th>Created</th></tr></thead><tbody data-order-rows></tbody></table></div></section><p class="data-freshness">Data refreshed <span data-freshness>—</span></p>`));

const customerPages = {
  account: ["My Account", "Account identity, credit terms, addresses and approved contacts are read from the customer master record."],
  invoices: ["My Invoices", "Invoices appear after the finance connector posts them against the canonical customer and order IDs."],
  statements: ["My Statements", "Monthly statements are generated from posted invoices and payments, then synchronized into SharePoint."],
  "price-lists": ["Price Lists", "Only current, account-authorised contract and standard price lists are displayed."],
  "stock-availability": ["Stock Availability", "Released batch availability and lead times will update from the validated warehouse feed."],
  "order-tracking": ["Order Tracking", "Track each order through submitted, confirmed, allocated, dispatched, delivered and invoiced states."],
  "delivery-tracking": ["Delivery Tracking", "Carrier tracking and proof of delivery require the Polar Speed integration contract."],
  returns: ["Returns", "Return requests link to the original order, product, batch and quality workflow."],
  "quality-complaints": ["Quality Complaints", "Quality complaints create governed quality records and controlled SharePoint case files."],
  support: ["Support Tickets", "Support tickets retain order and product relationships with SLA ownership."],
  "regulatory-documents": ["Regulatory Documents", "Only approved, effective and account-authorised regulatory files are available."],
  analytics: ["Customer Analytics", "Spend, product mix and fulfilment metrics will render from governed customer-scoped views."],
  settings: ["Settings", "Account preferences, authorised contacts, notification settings and portal security are governed from the linked Microsoft Entra identity."]
};

for (const [slug, [title, description]] of Object.entries(customerPages)) {
  writeFile(`portal/${slug}/index.html`, portalPage(slug, title, `<section class="section-tight"><div class="section-head"><h2>${title}</h2><p>${description}</p></div><div class="alert">No live records are available for this account yet. Values are never simulated.</div></section>`));
}

writeFile("portal/orders/index.html", portalPage("orders", "My Orders", `<section class="section-tight"><div class="section-head"><h2>Orders</h2><p>Orders are priced and validated by the shared order service.</p></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Account</th><th>Status</th><th>Total</th><th>PO reference</th><th>Created</th></tr></thead><tbody data-order-rows></tbody></table></div></section><div class="alert" data-workflow-status>Customer self-service order creation becomes available when the signed-in Entra user is linked to an active customer account.</div>`));
writeFile("portal/products/index.html", portalPage("products", "My Products", `<div class="field"><label for="productSearch">Search products</label><input id="productSearch" data-product-search placeholder="SKU, GTIN or product name"></div><div class="table-wrap"><table><thead><tr><th>SKU</th><th>Product</th><th>Strength</th><th>Pack</th><th>Price</th><th>Stock</th><th>MHRA</th><th>Status</th></tr></thead><tbody data-product-rows></tbody></table></div>`));
writeFile("portal/documents/index.html", portalPage("documents", "Documents", `<section class="section-tight"><div class="section-head"><h2>Controlled document library</h2><p>Files are retrieved from SharePoint through canonical document links and role scope.</p></div><div class="alert">SharePoint credentials are required before live documents can be listed.</div></section>`));
writeFile("portal/downloads/index.html", portalPage("downloads", "Downloads", `<div class="grid grid-3"><a class="card" href="/portal/executive-platform/docs/NP_Implementation_Blueprint_v2.pdf"><h3>Implementation Blueprint</h3><p>Platform blueprint; review dates and claims before operational use.</p></a><a class="card" href="/portal/executive-platform/docs/NP_Flowcharts_v3.pdf"><h3>Process Flowcharts</h3><p>Target operating model and integration flows.</p></a><a class="card" href="/portal/executive-platform/NP_Hub.html"><h3>Executive Platform</h3><p>Open the legacy executive intelligence suite.</p></a></div>`));

writeFile("employee/dashboard/index.html", employeePage("dashboard", "Operations Dashboard", `<div class="metric-row"><div class="metric"><strong data-live-metric="customers">0</strong><span>Active customers</span></div><div class="metric"><strong data-live-metric="products">0</strong><span>Active products</span></div><div class="metric"><strong data-live-metric="openOrders">0</strong><span>Open orders</span></div><div class="metric"><strong data-live-metric="pendingSyncEvents">0</strong><span>Integration events</span></div></div><section class="section-tight"><div class="section-head"><h2>Source readiness</h2><p>Operational truth and connector state are shown separately.</p></div><div class="table-wrap"><table><thead><tr><th>Source</th><th>Status</th></tr></thead><tbody data-source-status></tbody></table></div></section><p class="data-freshness">Data refreshed <span data-freshness>—</span></p><div class="alert" data-workflow-status>Dashboards use canonical operational records. No projections are presented as actuals.</div>`));
writeFile("employee/customers/index.html", employeePage("customers", "Customers", `<div class="table-wrap"><table><thead><tr><th>Account</th><th>Company</th><th>Type</th><th>Status</th><th>Credit limit</th><th>Outstanding</th></tr></thead><tbody data-customer-rows></tbody></table></div><div class="alert" data-workflow-status>New customers originate from the account application and approval workflow.</div>`));
writeFile("employee/suppliers/index.html", employeePage("suppliers", "Suppliers", `<form class="form-grid compact-form" data-supplier-form><div class="form-row"><div class="field"><label for="supplierLegalName">Legal name</label><input id="supplierLegalName" name="legalName" required></div><div class="field"><label for="supplierType">Supplier type</label><select id="supplierType" name="supplierType" required><option value="manufacturer">Manufacturer</option><option value="wholesaler">Wholesaler</option><option value="service_provider">Service provider</option></select></div></div><div class="form-row"><div class="field"><label for="qualificationStatus">Qualification</label><select id="qualificationStatus" name="qualificationStatus"><option value="prospect">Prospect</option><option value="conditional">Conditional</option><option value="approved">Approved</option></select></div><div class="field"><label for="supplierCompanyNumber">Company number</label><input id="supplierCompanyNumber" name="companyNumber"></div></div><button class="btn btn-primary" type="submit">Create supplier</button></form><div class="alert" data-workflow-status>Supplier records and folders share one canonical ID.</div><div class="table-wrap"><table><thead><tr><th>Supplier</th><th>Company</th><th>Type</th><th>Qualification</th><th>GDP</th><th>GMP</th></tr></thead><tbody data-supplier-rows></tbody></table></div>`));
writeFile("employee/products/index.html", employeePage("products", "Product Master", `<form class="form-grid compact-form" data-product-form><div class="form-row"><div class="field"><label for="sku">SKU</label><input id="sku" name="sku" required></div><div class="field"><label for="productName">Product name</label><input id="productName" name="productName" required></div></div><div class="form-row"><div class="field"><label for="strength">Strength</label><input id="strength" name="strength"></div><div class="field"><label for="packSize">Pack size</label><input id="packSize" name="packSize"></div></div><div class="form-row"><div class="field"><label for="manufacturer">Manufacturer</label><input id="manufacturer" name="manufacturer"></div><div class="field"><label for="listPrice">List price GBP</label><input id="listPrice" name="listPrice" type="number" min="0" step="0.01" required></div></div><div class="form-row"><div class="field"><label for="mhraStatus">MHRA status</label><select id="mhraStatus" name="mhraStatus"><option value="not_assessed">Not assessed</option><option value="approved">Approved</option><option value="licensed">Licensed</option><option value="pending">Pending</option></select></div><div class="field"><label for="lifecycleStatus">Lifecycle</label><select id="lifecycleStatus" name="lifecycleStatus"><option value="draft">Draft</option><option value="approved">Approved</option><option value="active">Active</option></select></div></div><button class="btn btn-primary" type="submit">Create product</button></form><div class="alert" data-workflow-status>Only approved or active products are available to customer and telesales ordering.</div><div class="table-wrap"><table><thead><tr><th>SKU</th><th>Product</th><th>Strength</th><th>Pack</th><th>Price</th><th>Stock</th><th>MHRA</th><th>Status</th></tr></thead><tbody data-product-rows></tbody></table></div>`));
writeFile("employee/orders/index.html", employeePage("orders", "Telesales Orders", `<form class="form-grid compact-form" data-order-form><div class="form-row"><div class="field"><label for="orderCustomer">Customer</label><select id="orderCustomer" name="customerId" required></select></div><div class="field"><label for="orderProduct">Product</label><select id="orderProduct" name="productId" required></select></div></div><div class="form-row"><div class="field"><label for="orderQuantity">Quantity</label><input id="orderQuantity" name="quantity" type="number" min="1" required></div><div class="field"><label for="customerPoReference">Customer PO reference</label><input id="customerPoReference" name="customerPoReference"></div></div><div class="field"><label for="requestedDeliveryDate">Requested delivery</label><input id="requestedDeliveryDate" name="requestedDeliveryDate" type="date"></div><button class="btn btn-primary" type="submit">Create order</button></form><div class="alert" data-workflow-status>Pricing, customer status and product sellability are validated server-side.</div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Account</th><th>Status</th><th>Total</th><th>PO reference</th><th>Created</th></tr></thead><tbody data-order-rows></tbody></table></div>`));
writeFile("employee/purchasing/index.html", employeePage("purchasing", "Purchase Orders", `<form class="form-grid compact-form" data-po-form><div class="form-row"><div class="field"><label for="poSupplier">Qualified supplier</label><select id="poSupplier" name="supplierId" required></select></div><div class="field"><label for="poProduct">Product</label><select id="poProduct" name="productId" required></select></div></div><div class="form-row"><div class="field"><label for="poQuantity">Quantity</label><input id="poQuantity" name="quantity" type="number" min="1" required></div><div class="field"><label for="unitCost">Unit cost GBP</label><input id="unitCost" name="unitCost" type="number" min="0" step="0.01" required></div></div><div class="field"><label for="expectedDate">Expected date</label><input id="expectedDate" name="expectedDate" type="date"></div><button class="btn btn-primary" type="submit">Submit purchase order</button></form><div class="alert" data-workflow-status>Only qualified suppliers can receive a PO.</div><div class="table-wrap"><table><thead><tr><th>PO</th><th>Supplier</th><th>Status</th><th>Total</th><th>Expected</th><th>Created</th></tr></thead><tbody data-po-rows></tbody></table></div>`));

for (const [slug, title] of [["warehouse","Warehouse"],["finance","Finance"],["quality","Quality"],["regulatory","Regulatory"],["crm","CRM"],["reports","Reports"],["administration","Administration"]]) {
  writeFile(`employee/${slug}/index.html`, employeePage(slug, title, `<section class="section-tight"><div class="section-head"><h2>${title}</h2><p>This module reads and writes canonical records through the shared domain APIs and document outbox.</p></div><div class="alert">The external source for this module is not configured. No operational values are simulated.</div></section>`));
}

writeFile("admin/index.html", `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=/admin/dashboard/"><meta name="robots" content="noindex,nofollow"><title>Admin Redirect | NovaPharm Healthcare</title></head><body><a href="/admin/dashboard/">Admin dashboard</a></body></html>`);
writeFile("admin/dashboard/index.html", adminPage("dashboard", "Admin Dashboard", `<div class="metric-row"><div class="metric"><strong data-admin-metric="leads">0</strong><span>Lead submissions</span></div><div class="metric"><strong data-admin-metric="customers">0</strong><span>Customers</span></div><div class="metric"><strong data-admin-metric="openOrders">0</strong><span>Open orders</span></div><div class="metric"><strong data-admin-metric="pendingSyncEvents">0</strong><span>Integration events</span></div></div><section class="section-tight"><div class="section-head"><h2>Lead tracking</h2></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Company</th><th>Type</th><th>Created</th></tr></thead><tbody data-leads></tbody></table></div></section>`));
writeFile("admin/users/index.html", adminPage("users", "User Management", `<div class="grid grid-3"><article class="card"><h3>Vishal</h3><p>Initial admin user. Credential is configured through environment variables.</p></article><article class="card"><h3>Role model</h3><p>Admin and client roles are supported in the runtime session model.</p></article><article class="card"><h3>Next step</h3><p>Connect Microsoft Entra ID for production SSO.</p></article></div>`));
writeFile("admin/content/index.html", adminPage("content", "Content Management", `<div class="grid grid-3"><article class="card"><h3>Public pages</h3><p>Homepage, services, regulatory, products, partners, investors, insights and careers.</p></article><article class="card"><h3>SEO assets</h3><p>Sitemap, robots, structured data and keyword strategy are generated.</p></article><article class="card"><h3>GEO assets</h3><p>Entity-first content and FAQ schema support AI search engines.</p></article></div>`));
writeFile("admin/analytics/index.html", adminPage("analytics", "Analytics & Integration Monitoring", `<div class="grid grid-3"><article class="card"><h3>Source lineage</h3><p>Metrics must declare source, grain, freshness and quality status.</p></article><article class="card"><h3>SEO</h3><p>Canonical URLs, JSON-LD, sitemap and robots are generated.</p></article><article class="card"><h3>Privacy</h3><p>Analytics remains disabled until consent and privacy requirements are approved.</p></article></div>`));

for (const [legacy, target] of [["contact.html","/contact/"],["solutions.html","/services/"],["supply-chain.html","/distributor-opportunities/"],["team.html","/about/"]]) {
  writeFile(legacy, `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${siteUrl}${target}"><title>Redirecting | NovaPharm Healthcare</title></head><body><a href="${target}">Redirecting to ${target}</a></body></html>`);
}

const urls = pages.map((page) => `${siteUrl}${pagePath(page.slug)}`).concat([
  `${siteUrl}/account-application/`,
  `${siteUrl}/portal/`,
  `${siteUrl}/sitemap.xml`
]);
writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc><changefreq>weekly</changefreq><priority>${url === siteUrl + "/" ? "1.0" : "0.8"}</priority></url>`).join("\n")}\n</urlset>\n`);
writeFile("robots.txt", `User-agent: *\nAllow: /\nDisallow: /portal/\nDisallow: /employee/\nDisallow: /admin/\nSitemap: ${siteUrl}/sitemap.xml\n`);
writeFile("manifest.webmanifest", JSON.stringify({ name: "NovaPharm Healthcare", short_name: "NovaPharm", start_url: "/", display: "standalone", background_color: "#f6f8fb", theme_color: "#c1121f", icons: [{ src: "/assets/Novapharm-logo.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2));
