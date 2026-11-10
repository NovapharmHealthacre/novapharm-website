import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pageMeta } from "../src/content/site-content.mjs";

const domain = "https://novapharmhealthcare.com";
const template = readFileSync("services/index.html", "utf8");
const main = template.match(/<main id="main"[\s\S]*?<\/main>/i)?.[0];
if (!main) throw Error("Commercial page template was not found.");

const boundary = '<aside class="npd-notice npd-notice-regulatory"><strong>Current regulatory boundary</strong><p>Regulated pharmaceutical wholesale supply has not commenced. Any future supply depends on required local authorisations, product-specific permissions, qualified suppliers, GDP/quality controls and permitted buyer channels. UK permissions do not confer distribution rights in other countries.</p></aside>';
const localNav = '<nav class="npd-local-nav" aria-label="Commercial solutions"><div class="container"><strong>Solutions</strong><div><a href="/distribution/">Distribution</a><a href="/market-access/">Market access</a><a href="/regulatory-services/">Regulatory &amp; quality</a><a href="/markets/">Markets</a></div></div></nav>';
function hero(eyebrow, title, lead, enquiry) {
 return '<section class="npd-hero"><div class="container npd-hero-inner"><div class="npd-hero-copy"><p class="npd-eyebrow">'+eyebrow+'</p><h1>'+title+'</h1><p class="npd-lead">'+lead+'</p><div class="npd-actions"><a class="npd-button npd-button-primary" href="/contact/?enquiry='+enquiry+'" data-cta-id="commercial-enquiry">Discuss an opportunity</a><a class="npd-button npd-button-secondary" href="/partner-with-us/">Explore partnerships</a></div></div></div></section>';
}
function intro(id, kicker, heading, copy) {
 return '<section class="npd-section" aria-labelledby="'+id+'"><div class="container"><div class="npd-section-intro"><p class="npd-eyebrow">'+kicker+'</p><h2 id="'+id+'">'+heading+'</h2><p>'+copy+'</p></div>';
}
function ledger(rows) {
 return '<ol class="npd-service-ledger">'+rows.map((r,i)=>'<li><span>'+String(i+1).padStart(2,"0")+'</span><h2>'+r[0]+'</h2><p>'+r[1]+'</p></li>').join("")+'</ol>';
}
function finish(copy, enquiry) {
 return '<section class="npd-section npd-final"><div class="container"><h2>'+copy+'</h2><p>Share the product, target geography, organisation role and relevant permissions so the next decision is grounded in evidence.</p><div class="npd-actions"><a class="npd-button npd-button-primary" href="/contact/?enquiry='+enquiry+'" data-cta-id="qualified-commercial-enquiry">Start a qualified conversation</a></div></div></section>';
}
const pages = [
 { slug:"distribution", title:"Pharmaceutical Distribution & Wholesale Readiness | NovaPharm",
 description:"Explore NovaPharm Healthcare's UK pharmaceutical sourcing, wholesale-readiness, partner qualification and planned distribution pathways for qualified business buyers.",
 body: hero("Pharmaceutical distribution","Distribution starts with trust.","Qualified sources, responsible market access and controlled B2B supply planning.","Distribution")
 +intro("distribution-path","The operating model","The right medicine needs the right route.","Wholesale distribution depends on legitimate product identity, sourcing, permissions, quality oversight and accountable commercial relationships.")
 +ledger([["Qualified sourcing","Review manufacturer and authorised wholesaler standing, traceability, provenance and supply continuity."],["Licensing and quality","Define the relevant WDA(H), GDP, product rights, PLPI and operational requirements before release."],["Commercial distribution","Qualify intended buyers, channels, contracts, demand, transport responsibilities and post-sale controls."]])
 +boundary+'</div></section>'
 +intro("distribution-categories","Category focus","Different products. Different responsibilities.","Category focus is not a statement of current stock or an authorisation to supply.")
 +ledger([["Generics, OTC and licensed medicines","Product and country-specific marketing and wholesale permissions. <a href="/regulatory-services/">Regulatory pathways</a>."],["Oncology and specialty","Continuity, handling, quality and product-specific evidence. <a href="/oncology/">Oncology</a>."],["Nutraceuticals and hospital equipment","Separate food supplement and medical equipment commercial and compliance routes. <a href="/products/">Browse product portfolios</a>."]])
 +'</div></section>'+finish("Tell us what you need to source or bring to market.","Distribution") },
 { slug:"market-access", title:"Pharmaceutical Market Entry & Access Strategy | NovaPharm",
 description:"A practical B2B pharmaceutical market-entry pathway covering product rights, registration strategy, access, qualified partners, pricing and launch readiness.",
 body: hero("Pharmaceutical market access","A product can be ready. A market may not be.","Connecting product rights and regulatory pathways with commercial evidence and qualified partners.","Market%20access")
 +intro("market-access-sequence","A clear sequence","Six questions before launch.","Regulatory approval, commercial market access and physical supply are distinct decisions.")
 +ledger([["Product identity","What is the formulation, dossier, presentation, rights holder and current authorisation status?"],["Country and route","Which local registration, import, wholesale, device or supplement regime applies?"],["Accountability","Who is responsible for regulatory ownership, quality, importation and contractual duties?"],["Commercial viability","What are the relevant procurement channels, reimbursement conditions, demand and economics?"],["Supply integrity","Which sources, quality agreements, GDP controls, handling records and continuity plans are required?"],["Release readiness","Have the applicable authorisations, evidence and customer eligibility been independently verified?"]])
 +boundary+'</div></section>'
 +intro("market-access-services","Commercial applications","From the dossier to the decision.","Opportunities may involve generics, oncology, specialist medicines, OTC, PLPI strategy, medical devices or food supplements. Each category requires its own regulatory and commercial assessment.")
 +'<div class="npd-actions"><a class="npd-button npd-button-secondary" href="/regulatory-services/">Review regulatory services</a><a class="npd-button npd-button-secondary" href="/markets/">Compare target markets</a></div></div></section>'
 +finish("Start with a product and a target market.","Market%20access") },
 { slug:"markets", title:"International Pharmaceutical Market Development | NovaPharm",
 description:"Understand NovaPharm's UK-first commercial development and potential EU, US, Canada and MENA partner-led market-entry pathways, each subject to local permissions.",
 body: hero("International markets","Think globally. Qualify locally.","A UK-based company developing product-specific opportunities and licensed partnerships, not claiming active regulated distribution across every region.","International%20markets")
 +intro("market-regions","Commercial market roadmap","Five regions. Five different pathways.","These are target opportunities, not a list of countries where NovaPharm already holds pharmaceutical wholesale permissions.")
 +ledger([["United Kingdom","Primary company base and pharmaceutical regulatory-readiness priority. Required MHRA authorisations and GDP operating controls must precede regulated supply."],["European Union","Potential selected member-state partnerships. Product, import and wholesale rules depend on the member state and the specific role of each party; UK authorisation does not transfer."],["United States","Potential licensed local partnerships. Prescription wholesale activity requires applicable state licences and DSCSA compliance, with distinct OTC, device and supplement rules."],["Canada","Potential local importer and distributor relationships. Drug Establishment Licences, Medical Device Establishment Licences and natural health product requirements are separate."],["Middle East and North Africa","Country-specific opportunities, beginning with evaluation of jurisdictions such as the UAE and Saudi Arabia. Establishment, registration, import and distribution permissions require local assessment."]])
 +boundary+'</div></section>'
 +intro("international-method","Expansion discipline","Local permissions. Shared standards.","For each target market, NovaPharm will first assess demand, regulatory requirements, authorised counterparties, commercial viability, product evidence and accountable supply arrangements.")
 +'<div class="npd-actions"><a class="npd-button npd-button-secondary" href="/market-access/">Our market-entry approach</a><a class="npd-button npd-button-secondary" href="/distribution/">Distribution readiness</a></div></div></section>'
 +finish("Which market are you considering?","International%20markets") }
];
function save(path, text) { mkdirSync(dirname(path), {recursive:true}); writeFileSync(path,text,"utf8"); }
function setMeta(head, attr, key, content) {
 const pattern = new RegExp('<meta '+attr+'="'+key+'" content="[^"]*">');
 return head.replace(pattern,'<meta '+attr+'="'+key+'" content="'+content.replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'">');
}
for (const p of pages) {
 if (!pageMeta[p.slug]) throw Error("Source metadata missing for "+p.slug);
 p.title = pageMeta[p.slug].title;
 p.description = pageMeta[p.slug].description;
 const url=domain+"/"+p.slug+"/";
 let doc=template.replace(main,'<main id="main" class="npd-main npd-commercial">'+localNav+p.body+'</main>');
 const ix=doc.indexOf("</head>");
 let head=doc.slice(0,ix), rest=doc.slice(ix);
 head=head.replace(/<title>[^<]+<\/title>/,'<title>'+p.title+'</title>')
   .replace(/<link rel="canonical" href="[^"]+">/,'<link rel="canonical" href="'+url+'">')
   .replaceAll(domain+"/services/",url)
   .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,"");
 for (const [attr,key,value] of [["name","description",p.description],["name","twitter:title",p.title],["name","twitter:description",p.description],["property","og:url",url],["property","og:title",p.title],["property","og:description",p.description]]) head=setMeta(head,attr,key,value);
 const webPage={"@context":"https://schema.org","@type":"WebPage","@id":url+"#webpage",name:p.title,description:p.description,url,inLanguage:"en-GB",isPartOf:{"@id":domain+"/#website"},about:{"@id":domain+"/#organization"},dateModified:"2026-11-10"};
 const breadcrumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:domain+"/"},{"@type":"ListItem",position:2,name:p.slug,item:url}]};
 head+='<script type="application/ld+json">'+JSON.stringify(webPage)+'</script><script type="application/ld+json">'+JSON.stringify(breadcrumbs)+'</script>\n';
 head += '<link rel="stylesheet" href="/assets/css/global-distribution-editorial.css">\n';
 doc=(head+rest).replace('href="/capabilities/" aria-current="page"', 'href="/capabilities/"').replace(/<body\b[^>]*>/,'<body data-page="'+p.slug+'" data-visual-refinement="2026-07" data-family="company" data-route="/'+p.slug+'/">');
 if ((doc.match(/<h1\b/g)||[]).length!==1)throw Error("Page requires one H1: "+p.slug);
 save(p.slug+"/index.html",doc);
}
const marker='<a href="/services/">Sourcing &amp; market access</a>';
const nav=marker+'<a href="/distribution/">Distribution</a><a href="/market-access/">Market entry</a><a href="/markets/">International markets</a>';
for (const file of ["index.html","about/index.html","services/index.html","capabilities/index.html","regulatory-services/index.html","oncology/index.html","products/index.html","partner-with-us/index.html","technology/index.html","contact/index.html","news-insights/index.html",...pages.map(p=>p.slug+"/index.html")]) {
 let html=readFileSync(file,"utf8");
 if (html.includes(marker)&&!html.includes(nav))save(file,html.replace(marker,nav));
}
let home=readFileSync("index.html","utf8");
if(!home.includes('id="commercial-pathways"')){
 const mainIndex=home.indexOf('<main id="main"'), first=home.indexOf("<section",mainIndex), end=home.indexOf("</section>",first);
 if (end<0)throw Error("Homepage hero section not found");
 const section='<section class="npd-section" id="commercial-pathways" aria-labelledby="commercial-pathways-heading"><div class="container"><div class="npd-section-intro"><p class="npd-eyebrow">Connected commercial pathways</p><h2 id="commercial-pathways-heading">One product. Multiple decisions. A clearer route.</h2><p>Build the right path from a product opportunity to a qualified market and permitted supply.</p></div><ol class="npd-numbered-grid"><li><span>01</span><h3>Market access</h3><p>Connect rights, registration routes, demand and economics.</p><a href="/market-access/">Explore market access</a></li><li><span>02</span><h3>Distribution</h3><p>Develop sourcing, permissions and responsible fulfilment pathways.</p><a href="/distribution/">Explore distribution</a></li><li><span>03</span><h3>International markets</h3><p>Evaluate local partners and country-specific requirements.</p><a href="/markets/">Explore markets</a></li></ol></div></section>';
 home=home.slice(0,end+10)+section+home.slice(end+10);save("index.html",home);
}
let services=readFileSync("services/index.html","utf8");
if(!services.includes('id="solution-pathways"')){
 const marker='<section class="npd-section npd-final">';
 if(!services.includes(marker))throw Error("Services end section not found");
 const section='<section class="npd-section" id="solution-pathways" aria-labelledby="solution-pathways-title"><div class="container"><div class="npd-section-intro"><p class="npd-eyebrow">Choose a pathway</p><h2 id="solution-pathways-title">From opportunity to the appropriate next step.</h2></div><ol class="npd-numbered-grid"><li><span>01</span><h3>Distribution</h3><p>Qualified sourcing, permissions and controlled supply.</p><a href="/distribution/">Distribution readiness</a></li><li><span>02</span><h3>Market entry</h3><p>Product rights, regulatory sequence and commercial viability.</p><a href="/market-access/">Market-access strategy</a></li><li><span>03</span><h3>International</h3><p>Local partnerships and country-specific opportunity assessment.</p><a href="/markets/">Market development</a></li></ol></div></section>';
 save("services/index.html",services.replace(marker,section+marker));
}
console.log("Global distribution foundation: three pages, canonical SEO, navigation and lead journeys materialised.");
