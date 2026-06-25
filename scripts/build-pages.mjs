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
  ["Client Portal", "/portal/"]
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
    <article class="card"><img src="/assets/vishalchakravarty.jpeg" alt="Vishal Chakravarty" loading="lazy"><h3>Vishal Chakravarty</h3><p>Founder and CEO. Corporate strategy, healthcare platform development and investor-facing execution.</p></article>
    <article class="card"><img src="/assets/prabhakarvitthallahare.jpeg" alt="Prabhakar Vitthal Lahare" loading="lazy"><h3>Prabhakar Vitthal Lahare</h3><p>Operations and commercial support for healthcare growth initiatives.</p></article>
    <article class="card"><img src="/assets/girishshantilalachliya.jpeg" alt="Girish Shantilal Achliya" loading="lazy"><h3>Girish Shantilal Achliya</h3><p>Scientific and healthcare advisory support for strategic development.</p></article>
  </div></div></section>`;
}

function portalPage(kind, title, body) {
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | NovaPharm Client Portal</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/css/novapharm.css"></head><body><div class="portal-shell"><aside class="portal-sidebar"><a class="brand" href="/portal/dashboard/"><img src="/assets/Novapharm-logo.svg" alt="" width="42" height="42"><span><span class="brand-name" style="color:#fff">NovaPharm</span><span class="brand-meta" style="color:#cbd5e1">Client Portal</span></span></a><nav aria-label="Portal navigation"><a href="/portal/dashboard/"${kind==="dashboard"?' aria-current="page"':""}>Dashboard</a><a href="/portal/documents/"${kind==="documents"?' aria-current="page"':""}>Documents</a><a href="/portal/downloads/"${kind==="downloads"?' aria-current="page"':""}>Downloads</a><a href="/portal/settings/"${kind==="settings"?' aria-current="page"':""}>Settings</a><a href="/portal/executive-platform/NP_Hub.html">Executive Platform</a><a href="/admin/dashboard/">Admin</a><button class="btn btn-outline" type="button" data-logout>Logout</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div><span class="eyebrow">${title}</span><h1 style="color:var(--ink);margin:8px 0 0">${title}</h1></div><span class="status-pill">Signed in as <span data-user-name></span></span></div>${body}</main></div><script src="/assets/js/portal-app.js" defer></script></body></html>`;
}

function adminPage(kind, title, body) {
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | NovaPharm Admin</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/css/novapharm.css"></head><body><div class="portal-shell"><aside class="portal-sidebar"><a class="brand" href="/admin/dashboard/"><img src="/assets/Novapharm-logo.svg" alt="" width="42" height="42"><span><span class="brand-name" style="color:#fff">NovaPharm</span><span class="brand-meta" style="color:#cbd5e1">Admin</span></span></a><nav aria-label="Admin navigation"><a href="/admin/dashboard/"${kind==="dashboard"?' aria-current="page"':""}>Dashboard</a><a href="/admin/users/"${kind==="users"?' aria-current="page"':""}>Users</a><a href="/admin/content/"${kind==="content"?' aria-current="page"':""}>Content</a><a href="/admin/analytics/"${kind==="analytics"?' aria-current="page"':""}>Analytics</a><a href="/portal/dashboard/">Client Portal</a><button class="btn btn-outline" type="button" data-logout>Logout</button></nav></aside><main class="portal-main"><div class="portal-topbar"><div><span class="eyebrow">Admin</span><h1 style="color:var(--ink);margin:8px 0 0">${title}</h1></div><span class="status-pill">Secure runtime</span></div>${body}</main></div><script src="/assets/js/portal-app.js" defer></script><script src="/assets/js/admin-app.js" defer></script></body></html>`;
}

function loginPage() {
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Client Portal Login | NovaPharm Healthcare</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/css/novapharm.css"></head><body class="login-page"><main class="login-panel"><img src="/assets/Novapharm-logo.svg" alt="NovaPharm Healthcare logo"><h1 style="color:var(--ink);margin:0 0 10px">Client Portal</h1><p>Secure access for NovaPharm documents, downloads, announcements, tasks and the Executive Platform.</p><form class="form-grid" data-login-form><div class="field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="btn btn-primary" type="submit">Sign in</button><div class="alert" data-login-status>Credentials are verified server-side from environment variables.</div></form></main><script src="/assets/js/portal-login.js" defer></script></body></html>`;
}

for (const page of pages) {
  const html = page.layout === "home" ? home(page) : generic(page);
  writeFile(join(page.slug || ".", "index.html"), html);
}

writeFile("portal/index.html", loginPage());
writeFile("portal/dashboard/index.html", portalPage("dashboard", "Dashboard", `<div class="metric-row"><div class="metric"><strong>9</strong><span>Portal folders</span></div><div class="metric"><strong>18</strong><span>Executive modules</span></div><div class="metric"><strong>M365</strong><span>SharePoint-ready</span></div><div class="metric"><strong>Secure</strong><span>Server-authenticated</span></div></div><section class="section-tight"><div class="section-head"><h2>Announcements</h2></div><div class="grid grid-3" data-announcements></div></section><section class="section-tight"><div class="section-head"><h2>Task tracking</h2></div><div class="table-wrap"><table><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody data-tasks></tbody></table></div></section>`));
writeFile("portal/documents/index.html", portalPage("documents", "File Library", `<div class="grid grid-3">${["Regulatory Documents","Product Catalogues","Company Documents","Business Plans","Investor Files","Downloads","Announcements","Task Tracking","Executive Platform"].map((name) => `<article class="card"><span class="icon">▣</span><h3>${name}</h3><p>Prepared for SharePoint synchronization and role-based access control.</p></article>`).join("")}</div>`));
writeFile("portal/downloads/index.html", portalPage("downloads", "Downloads", `<div class="grid grid-3"><a class="card" href="/portal/executive-platform/docs/NP_Implementation_Blueprint_v2.pdf"><h3>Implementation Blueprint</h3><p>Download the platform implementation blueprint.</p></a><a class="card" href="/portal/executive-platform/docs/NP_Flowcharts_v3.pdf"><h3>Process Flowcharts</h3><p>Download the algorithm and operating flow document.</p></a><a class="card" href="/portal/executive-platform/NP_Hub.html"><h3>Executive Platform</h3><p>Open the live executive command centre.</p></a></div>`));
writeFile("portal/settings/index.html", portalPage("settings", "Portal Settings", `<div class="grid grid-2"><article class="card"><h3>Authentication</h3><p>Portal credentials are supplied through server environment variables. Password hashes should be generated with <code>npm run hash:password</code>.</p></article><article class="card"><h3>SharePoint</h3><p>Configure Microsoft Graph credentials to synchronize folders and files from Microsoft 365.</p></article></div>`));

writeFile("admin/index.html", `<!DOCTYPE html><meta http-equiv="refresh" content="0; url=/admin/dashboard/"><a href="/admin/dashboard/">Admin dashboard</a>`);
writeFile("admin/dashboard/index.html", adminPage("dashboard", "Admin Dashboard", `<div class="metric-row"><div class="metric"><strong data-admin-metric="leads">0</strong><span>Lead submissions</span></div><div class="metric"><strong data-admin-metric="users">0</strong><span>Active sessions</span></div><div class="metric"><strong data-admin-metric="seo">0</strong><span>SEO target score</span></div><div class="metric"><strong data-admin-metric="documents">0</strong><span>Document folders</span></div></div><section class="section-tight"><div class="section-head"><h2>Lead tracking</h2></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Company</th><th>Type</th><th>Created</th></tr></thead><tbody data-leads></tbody></table></div></section>`));
writeFile("admin/users/index.html", adminPage("users", "User Management", `<div class="grid grid-3"><article class="card"><h3>Vishal</h3><p>Initial admin user. Credential is configured through environment variables.</p></article><article class="card"><h3>Role model</h3><p>Admin and client roles are supported in the runtime session model.</p></article><article class="card"><h3>Next step</h3><p>Connect Microsoft Entra ID for production SSO.</p></article></div>`));
writeFile("admin/content/index.html", adminPage("content", "Content Management", `<div class="grid grid-3"><article class="card"><h3>Public pages</h3><p>Homepage, services, regulatory, products, partners, investors, insights and careers.</p></article><article class="card"><h3>SEO assets</h3><p>Sitemap, robots, structured data and keyword strategy are generated.</p></article><article class="card"><h3>GEO assets</h3><p>Entity-first content and FAQ schema support AI search engines.</p></article></div>`));
writeFile("admin/analytics/index.html", adminPage("analytics", "Analytics & SEO Monitoring", `<div class="grid grid-3"><article class="card"><h3>GA4</h3><p>Existing Google Analytics ID is preserved in documentation. Add the script only after consent/privacy review if needed.</p></article><article class="card"><h3>SEO</h3><p>Canonical URLs, JSON-LD, sitemap and robots are active.</p></article><article class="card"><h3>Leads</h3><p>Contact form submissions are captured by the secure runtime.</p></article></div>`));

for (const [legacy, target] of [["contact.html","/contact/"],["solutions.html","/services/"],["supply-chain.html","/distributor-opportunities/"],["team.html","/about/"]]) {
  writeFile(legacy, `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${siteUrl}${target}"><title>Redirecting | NovaPharm Healthcare</title></head><body><a href="${target}">Redirecting to ${target}</a></body></html>`);
}

const urls = pages.map((page) => `${siteUrl}${pagePath(page.slug)}`).concat([
  `${siteUrl}/portal/`,
  `${siteUrl}/sitemap.xml`
]);
writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc><changefreq>weekly</changefreq><priority>${url === siteUrl + "/" ? "1.0" : "0.8"}</priority></url>`).join("\n")}\n</urlset>\n`);
writeFile("robots.txt", `User-agent: *\nAllow: /\nDisallow: /portal/dashboard/\nDisallow: /portal/documents/\nDisallow: /portal/downloads/\nDisallow: /portal/settings/\nDisallow: /portal/executive-platform/\nDisallow: /admin/\nSitemap: ${siteUrl}/sitemap.xml\n`);
writeFile("manifest.webmanifest", JSON.stringify({ name: "NovaPharm Healthcare", short_name: "NovaPharm", start_url: "/", display: "standalone", background_color: "#f6f8fb", theme_color: "#c1121f", icons: [{ src: "/assets/Novapharm-logo.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2));
