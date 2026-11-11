/**
 * Owner-approved Markets editorial: photographic, single-scroll and regulatory accurate.
 * Applied after the shared commercial generator so every build retains this design.
 * Independent photography sources are credited in the accessible source notes below.
 */
import { readFileSync, writeFileSync } from "node:fs";

const route = "markets/index.html";
const html = readFileSync(route, "utf8");
const originalMain = /<main\b[^>]*\bid=["']main["'][^>]*>[\s\S]*?<\/main>/i;
if (!originalMain.test(html)) throw new Error("Markets page main landmark is missing.");

const photos = [
  {
    slug: "uk",
    name: "United Kingdom",
    descriptor: "Our home market.",
    text: "Building regulatory readiness and qualified supply pathways. Required MHRA authorisations and GDP operating controls must precede regulated supply.",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=82",
    alt: "Photograph of the London skyline and River Thames in the United Kingdom",
    loading: "eager"
  },
  {
    slug: "eu",
    name: "European Union",
    descriptor: "Selected partnerships.",
    text: "Exploring member-state opportunities through locally authorised partners. UK wholesale permissions do not transfer to EU member states.",
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Outside_the_European_Parliament_in_Brussels_(47937867822).jpg?width=1280",
    alt: "Photograph outside the European Parliament in Brussels, Belgium",
    loading: "lazy"
  },
  {
    slug: "us",
    name: "United States",
    descriptor: "Local pathways.",
    text: "Evaluating state-specific licensing and commercial partnerships. Applicable state licences and DSCSA requirements govern prescription wholesale activities.",
    image: "https://images.unsplash.com/photo-1664857816357-35f3e9f07209?auto=format&fit=crop&w=1200&q=82",
    alt: "Photograph of New York City skyline in the United States",
    loading: "lazy"
  },
  {
    slug: "ca",
    name: "Canada",
    descriptor: "Product-specific market routes.",
    text: "Assessing importer, distributor and product-specific routes. Drug, device and natural-health-product requirements remain distinct.",
    image: "https://images.unsplash.com/photo-1741363703953-a772ef9a5607?auto=format&fit=crop&w=1400&q=82",
    alt: "Photograph of the Toronto waterfront and CN Tower in Canada",
    loading: "lazy"
  },
  {
    slug: "mena",
    name: "Middle East &amp; North Africa",
    descriptor: "Regional opportunity assessment.",
    text: "Considering country-specific partnerships, including the UAE and Saudi Arabia. Establishment, import and distribution permissions require local assessment.",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=82",
    alt: "Photograph of Burj Khalifa and the Dubai skyline in the United Arab Emirates, illustrative of one MENA market",
    loading: "lazy"
  }
];

function imageCard(photo, index) {
  return [
    '<article class="markets-card markets-card--' + photo.slug + '">',
    '  <img src="' + photo.image + '" alt="' + photo.alt + '" width="1200" height="740" loading="' + photo.loading + '" decoding="async">',
    '  <div class="markets-card-copy">',
    '    <span class="markets-card-region">' + String(index + 1).padStart(2, "0") + ' &nbsp; ' + photo.name + '</span>',
    '    <h3>' + photo.descriptor + '</h3>',
    '    <p>' + photo.text + '</p>',
    '  </div>',
    '</article>'
  ].join("\n");
}

const newMain = [
  '<main id="main" class="markets-editorial" data-markets-design="apple-photographic-approved-20261111">',
  '  <section class="markets-hero" aria-labelledby="markets-hero-heading">',
  '    <img class="markets-hero-photo" src="https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/152000/152693/iss070e075895_lrg.jpg" width="5568" height="3712" fetchpriority="high" decoding="async" alt="NASA Expedition 70 astronaut photograph of northwestern Europe at night, showing the illuminated cities of London, Amsterdam and Paris beneath Earth’s horizon. The scene does not depict NovaPharm operating facilities.">',
  '    <div class="markets-hero-shade" aria-hidden="true"></div>',
  '    <div class="markets-shell markets-hero-content">',
  '      <p class="markets-overline">International markets</p>',
  '      <h1 id="markets-hero-heading">Medicine<br>moves globally.<br>Access is local.</h1>',
  '      <p class="markets-hero-intro">We identify product opportunities, assess local regulatory pathways and develop qualified partnerships for access to medicines across global markets.</p>',
  '      <div class="markets-actions">',
  '        <a class="markets-button markets-button-light" href="#markets-regions">Explore markets</a>',
  '        <a class="markets-button markets-button-outline" href="/contact/?enquiry=International%20markets">Discuss an opportunity</a>',
  '      </div>',
  '    </div>',
  '  </section>',
  '  <section class="markets-regions" id="markets-regions" aria-labelledby="markets-regions-heading">',
  '    <div class="markets-shell">',
  '      <div class="markets-regions-heading">',
  '        <p class="markets-overline markets-overline-dark">Target markets. Local responsibility.</p>',
  '        <h2 id="markets-regions-heading">Five regions. Five different pathways.</h2>',
  '        <p>Product-specific opportunities. Local permissions first.</p>',
  '      </div>',
  '      <div class="markets-photo-grid">' + photos.map(imageCard).join("\n") + '</div>',
  '      <p class="markets-region-boundary">These are markets under evaluation, not claims of active regulated pharmaceutical distribution or existing wholesale authorisations across these territories.</p>',
  '    </div>',
  '  </section>',
  '  <section class="markets-principle" aria-labelledby="markets-principle-heading">',
  '    <div class="markets-principle-photo">',
  '      <img src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1500&q=82" width="1440" height="960" loading="lazy" decoding="async" alt="Real photograph of packaged medicine tablets illustrating product-specific pharmaceutical market pathways">',
  '    </div>',
  '    <div class="markets-principle-copy">',
  '      <p class="markets-overline markets-overline-dark">Expansion discipline</p>',
  '      <h2 id="markets-principle-heading">Local permissions.<br>Shared standards.</h2>',
  '      <p>For each target market, we assess demand, regulatory requirements, authorised counterparties, commercial viability, product evidence and accountable supply arrangements.</p>',
  '      <p class="markets-principle-boundary"><strong>Current regulatory boundary.</strong> Regulated pharmaceutical wholesale supply has not commenced. Any future supply depends on required local authorisations, product-specific permissions, qualified suppliers, GDP/quality controls and permitted buyer channels. UK permissions do not confer distribution rights in other countries.</p>',
  '      <a class="markets-detail-link" href="/market-access/">Explore our market-entry approach</a>',
  '    </div>',
  '  </section>',
  '  <section class="markets-final" aria-labelledby="markets-final-heading">',
  '    <div class="markets-shell">',
  '      <h2 id="markets-final-heading">Where should medicine go next?</h2>',
  '      <p>Tell us the product and the market. We will explore the pathway with evidence.</p>',
  '      <a class="markets-button markets-button-dark" href="/contact/?enquiry=International%20markets" data-cta-id="qualified-commercial-enquiry">Start a qualified conversation</a>',
  '      <p class="markets-final-note">For qualified B2B organisations. An enquiry is not an offer to supply, an approval or a guarantee of market availability.</p>',
  '    </div>',
  '  </section>',
  '  <aside class="markets-photo-credits" aria-label="Photography credits">',
  '    <div class="markets-shell"><details><summary>Photography and imagery credits</summary>',
  '      <p>Hero: Europe at Night, NASA Expedition 70 crew / ISS, acquired 19 January 2024 (photograph ISS070-E-75895, 5568 × 3712 pixels). Locations: independently sourced photographs representing London, Brussels, New York, Toronto and Dubai; photographs do not represent NovaPharm-owned facilities or existing regional operations. London, New York, Toronto and Dubai: Unsplash. Brussels: © European Union 2019 – Source: EP, via Wikimedia Commons; supplied under Creative Commons Attribution with the original source requesting CC BY 4.0 credit. Image framed by CSS. Medicine packaging photograph: Unsplash.</p>',
  '      <p><a href="https://science.nasa.gov/earth/earth-observatory/europe-at-night-152693/" rel="noopener noreferrer">NASA original photograph</a> · <a href="https://commons.wikimedia.org/wiki/File:Outside_the_European_Parliament_in_Brussels_(47937867822).jpg" rel="noopener noreferrer">European Parliament photograph and author credit</a> · <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener noreferrer">CC BY 4.0</a> · <a href="https://unsplash.com/license" rel="noopener noreferrer">Unsplash licence</a>.</p>',
  '    </details></div>',
  '  </aside>',
  '</main>'
].join("\n");

let updated = html.replace(originalMain, newMain);
if (!updated.includes('href="/assets/css/markets-editorial.css')) {
  updated = updated.replace(
    "</head>",
    '  <link rel="preconnect" href="https://images.unsplash.com" crossorigin>\n' +
    '  <link rel="preconnect" href="https://assets.science.nasa.gov" crossorigin>\n' +
    '  <link rel="stylesheet" href="/assets/css/markets-editorial.css?v=20261111-nasa-hd-1">\n</head>'
  );
}
if ((updated.match(/<h1\b/g) || []).length !== 1) throw new Error("Markets design needs exactly one H1.");
if (!updated.includes("Regulated pharmaceutical wholesale supply has not commenced")) throw new Error("Markets regulatory notice lost.");
writeFileSync(route, updated, "utf8");
console.log("Applied approved Markets design with NASA Expedition 70 full-resolution photographic hero and retained regulatory boundary.");
