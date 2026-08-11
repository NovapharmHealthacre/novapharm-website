import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const homePath = resolve(process.cwd(), "index.html");
const html = readFileSync(homePath, "utf8");

const conciseMain = `<main id="main">
  <section class="pharma-home-hero">
    <div class="container pharma-home-grid">
      <div class="pharma-home-copy">
        <p class="pharma-kicker">NovaPharm Healthcare</p>
        <h1>Pharmaceutical supply, built around evidence.</h1>
        <p class="pharma-home-intro">Qualified sourcing, regulatory readiness and controlled B2B distribution planning.</p>
        <div class="pharma-actions">
          <a class="btn btn-primary" href="/about/">Explore NovaPharm</a>
          <a class="btn btn-ghost" href="/partner-with-us/">Partner with us</a>
        </div>
        <p class="pharma-status">Regulated wholesale supply has not commenced.</p>
      </div>
      <figure class="pharma-home-media">
        <picture>
          <source srcset="/assets/media/home/supply-network-hero.avif" type="image/avif">
          <img src="/assets/media/home/supply-network-hero.jpg" alt="Pharmaceutical supply and quality operations" width="1672" height="941" fetchpriority="high" decoding="async">
        </picture>
      </figure>
    </div>
  </section>

  <section class="pharma-principles" aria-label="NovaPharm operating principles">
    <div class="container pharma-principles-grid">
      <span>Qualified sourcing</span>
      <span>Regulatory discipline</span>
      <span>Quality-led decisions</span>
    </div>
  </section>

  <section class="pharma-section">
    <div class="container">
      <div class="pharma-section-heading">
        <p class="pharma-kicker">Sourcing strategy</p>
        <h2>Three routes. One standard.</h2>
        <p>Every route must meet the same evidence threshold.</p>
      </div>
      <div class="pharma-pillar-grid">
        <article><span>01</span><h3>Direct GMP partnerships</h3><p>Qualified manufacturing relationships with controlled technical and quality review.</p></article>
        <article><span>02</span><h3>Product-specific PLPI</h3><p>Evidence-led assessment of appropriate parallel-import opportunities and obligations.</p></article>
        <article><span>03</span><h3>European sourcing</h3><p>Diversified authorised supply routes with licence, quality and continuity checks.</p></article>
      </div>
    </div>
  </section>

  <section class="pharma-section pharma-focus-section">
    <div class="container pharma-focus-layout">
      <figure class="pharma-focus-media">
        <picture>
          <source srcset="/assets/media/stories/regulatory-batch-integrity.avif" type="image/avif">
          <source srcset="/assets/media/stories/regulatory-batch-integrity.webp" type="image/webp">
          <img src="/assets/media/stories/regulatory-batch-integrity.jpg" alt="Controlled pharmaceutical packaging and traceability records" width="1600" height="900" loading="lazy" decoding="async">
        </picture>
      </figure>
      <div class="pharma-focus-copy">
        <p class="pharma-kicker">Controlled growth</p>
        <h2>Clarity before complexity.</h2>
        <p>Operational, in development and externally gated remain visibly separate.</p>
        <a href="/trust-centre/">Review the evidence boundary →</a>
      </div>
    </div>
  </section>

  <section class="pharma-section">
    <div class="container">
      <div class="pharma-section-heading">
        <p class="pharma-kicker">Core focus</p>
        <h2>Specialist work. Less noise.</h2>
      </div>
      <div class="pharma-focus-grid">
        <article><h3>Oncology &amp; specialty</h3><p>Closer control of formulation, continuity and evidence.</p><a href="/oncology/">Learn more →</a></article>
        <article><h3>Regulatory &amp; quality</h3><p>Authorisation, QMS and vendor oversight before release.</p><a href="/regulatory-services/">Learn more →</a></article>
        <article><h3>Technology &amp; traceability</h3><p>Governed accounts, documents, evidence and decision history.</p><a href="/technology/">Learn more →</a></article>
      </div>
    </div>
  </section>

  <section class="pharma-section final-cta">
    <div class="container">
      <div class="section-heading">
        <p class="pharma-kicker">Qualified conversations</p>
        <h2>Discuss a qualified pharmaceutical opportunity.</h2>
      </div>
      <div class="pharma-actions">
        <a class="btn btn-primary" href="/contact/">Contact NovaPharm</a>
        <a class="btn btn-ghost" href="/account-application/">Open an account</a>
      </div>
    </div>
  </section>
</main>`;

const mainPattern = /<main\b[^>]*\bid=["']main["'][^>]*>[\s\S]*?<\/main>/i;
if (!mainPattern.test(html)) {
  throw new Error("PUBLIC_ONLY homepage presentation parity failed: <main id=\"main\"> was not found.");
}

const next = html.replace(mainPattern, conciseMain);
if (!next.includes("Pharmaceutical supply, built around evidence.")) {
  throw new Error("PUBLIC_ONLY homepage presentation parity failed: concise hero marker missing.");
}
if (!next.includes("Regulated wholesale supply has not commenced.")) {
  throw new Error("PUBLIC_ONLY homepage presentation parity failed: release-state truth marker missing.");
}
if (/data-login-form|data-contact-form|data-account-application/.test(next)) {
  throw new Error("PUBLIC_ONLY homepage presentation parity must not introduce protected form controls.");
}

writeFileSync(homePath, next);
console.log("Applied concise Apple-pharma presentation parity to the PUBLIC_ONLY homepage.");
