import Image from "next/image";
import nutraxinRegister from "@/data/nutraxin-product-register.json";

const sourcingRoutes = [
  { number: "01", title: "Direct GMP partnerships", text: "Qualified manufacturer relationships with controlled technical and quality review." },
  { number: "02", title: "Product-specific PLPI", text: "Evidence-led assessment of appropriate MHRA parallel-import pathways and obligations." },
  { number: "03", title: "European sourcing", text: "Potential authorised routes reviewed for rights, licence standing, provenance and continuity." },
];

const featured = nutraxinRegister.products.filter((product) => [1, 5, 14].includes(product.catalogueOrder));

export function ConciseHomePage() {
  return (
    <div className="nph-editorial-home npd-apple-home">

      <section className="npd-apple-hero nph-earth-hero" aria-labelledby="nph-home-title">
        <div className="shell container nph-earth-hero-content">
          <p className="npd-apple-eyebrow">NOVAPHARM HEALTHCARE</p>
          <h1 id="nph-home-title">Medicine. Where it needs to be.</h1>
          <p className="npd-apple-lead">A better way to understand, access and move medicine.</p>
          <div className="npd-apple-actions">
            <a className="nph-earth-primary" href="/about/">Explore NovaPharm <span aria-hidden="true">›</span></a>
            <a className="nph-earth-secondary" href="/partner-with-us/">Partner with us <span aria-hidden="true">›</span></a>
          </div>
        </div>
        <Image className="nph-earth-hero-landscape" src="/assets/media/home/earth-morning-approved.avif" alt="" width={1100} height={229} priority fetchPriority="high" unoptimized />
      </section>
      <section className="npd-apple-manifesto" aria-labelledby="nph-purpose-title">
        <div className="shell container npd-apple-center">
          <p className="npd-apple-eyebrow">WHY NOVAPHARM</p>
          <h2 id="nph-purpose-title">Better access begins with better decisions.</h2>
          <p>Medicine is already moving. The questions that matter are where it needs to go, what evidence supports it, and what permissions make responsible access possible.</p>
        </div>
      </section>

      <section className="npd-apple-oncology" aria-labelledby="nph-oncology-title">
        <div className="shell container npd-apple-feature-grid">
          <div className="npd-apple-feature-copy">
            <p className="npd-apple-eyebrow">ONCOLOGY &amp; SPECIALIST MEDICINES</p>
            <h2 id="nph-oncology-title">Specialist medicines.<br />Uncompromising standards.</h2>
            <p>Every opportunity is evaluated against formulation, supply continuity, source quality and product-specific regulatory evidence.</p>
            <a className="npd-apple-text-link" href="/oncology/">Explore oncology</a>
          </div>
          <figure className="npd-apple-oncology-art">
            <picture>
              <source srcSet="/assets/media/products/oncology-vial-handling-960.avif 960w, /assets/media/products/oncology-vial-handling.avif 1600w" sizes="(max-width: 800px) 100vw, 50vw" type="image/avif" />
              <source srcSet="/assets/media/products/oncology-vial-handling-960.webp 960w, /assets/media/products/oncology-vial-handling.webp 1600w" sizes="(max-width: 800px) 100vw, 50vw" type="image/webp" />
              <Image src="/assets/media/products/oncology-vial-handling.jpg" width={1600} height={900} alt="Representative controlled pharmaceutical laboratory handling" unoptimized />
            </picture>
            <figcaption>Representative scientific context. No NovaPharm facility, stock or approved programme is depicted.</figcaption>
          </figure>
        </div>
      </section>

      <section className="npd-apple-products" aria-labelledby="nph-products-title">
        <div className="shell container">
          <div className="npd-apple-center">
            <p className="npd-apple-eyebrow">NUTRAXIN &amp; PORTFOLIO</p>
            <h2 id="nph-products-title">Thoughtfully selected.<br />Carefully presented.</h2>
            <p>Explore approved catalogue imagery for Nutraxin and the strategic categories NovaPharm is evaluating.</p>
          </div>
          <div className="npd-apple-product-grid">
            {featured.map((product) => (
              <a className="npd-apple-product" href={"/products/nutraxin/" + product.slug + "/"} key={product.slug}>
                <picture>
                  <source srcSet={"/assets/media/products/nutraxin/" + product.imageBase + "-480.avif 480w, /assets/media/products/nutraxin/" + product.imageBase + "-800.avif 800w"} sizes="(max-width: 600px) 70vw, 25vw" type="image/avif" />
                  <source srcSet={"/assets/media/products/nutraxin/" + product.imageBase + "-480.webp 480w, /assets/media/products/nutraxin/" + product.imageBase + "-800.webp 800w"} sizes="(max-width: 600px) 70vw, 25vw" type="image/webp" />
                  <Image src={"/assets/media/products/nutraxin/" + product.imageBase + ".png"} alt={product.altText} width={700} height={700} unoptimized />
                </picture>
                <strong>{product.name}</strong>
                <span>{product.packSize}</span>
              </a>
            ))}
          </div>
          <div className="npd-apple-product-links">
            <a className="npd-apple-text-link" href="/products/nutraxin/">Explore Nutraxin</a>
            <a className="npd-apple-text-link" href="/products/strategic-portfolio/">Strategic pharmaceutical portfolio</a>
          </div>
          <p className="npd-apple-footnote">Catalogue information is for qualified review. Pricing, stock, medicinal status and supply availability are not asserted.</p>
        </div>
      </section>

      <section className="npd-apple-intelligence" aria-labelledby="nph-intelligence-title">
        <div className="shell container npd-apple-feature-grid">
          <div className="npd-apple-feature-copy">
            <p className="npd-apple-eyebrow">NOVAPHARM INTELLIGENCE</p>
            <h2 id="nph-intelligence-title">Understand the medicine.<br />Understand the market.</h2>
            <p>We are building a governed intelligence experience to connect medicines, evidence, market information and explainable analysis.</p>
            <a className="npd-apple-text-link" href="/technology/">Explore our technology direction</a>
            <p className="npd-apple-footnote">In development. The adjacent graphic is an artistic concept, not a working interface or validated forecast.</p>
          </div>
          <div className="npd-apple-nova-art" role="img" aria-label="Conceptual typographic preview for NOVA, the medicines intelligence experience under development">
            <div className="npd-apple-nova-top"><span>NOVAPHARM INTELLIGENCE</span><span>CONCEPT</span></div>
            <div className="npd-apple-nova-wordmark">NOVA<span>.</span></div>
            <p>The living intelligence of medicine.</p>
            <div className="npd-apple-nova-divider" />
            <div className="npd-apple-nova-taxonomy"><span>Medicines</span><span>Evidence</span><span>Markets</span><span>Decisions</span></div>
          </div>
        </div>
      </section>

      <section className="npd-apple-sourcing" aria-labelledby="nph-sourcing-title">
        <div className="shell container">
          <div className="npd-apple-section-lead">
            <p className="npd-apple-eyebrow">SOURCING &amp; MARKET ACCESS</p>
            <h2 id="nph-sourcing-title" aria-label="Three routes. One evidence standard.">Three routes.<br />One evidence standard.</h2>
            <p>Commercial opportunity should never move faster than the permissions and quality evidence behind it.</p>
          </div>
          <div className="npd-apple-sourcing-grid">
            {sourcingRoutes.map((route) => (
              <article key={route.number}>
                <span>{route.number}</span>
                <h3>{route.title}</h3>
                <p>{route.text}</p>
              </article>
            ))}
          </div>
          <a className="npd-apple-text-link" href="/capabilities/">Explore capabilities</a>
        </div>
      </section>

      <section className="npd-apple-governance" aria-labelledby="nph-governance-title">
        <div className="shell container npd-apple-governance-grid">
          <div>
            <p className="npd-apple-eyebrow">QUALITY &amp; REGULATORY FOUNDATION</p>
            <h2 id="nph-governance-title">Built for trust.<br />Designed for scrutiny.</h2>
            <p>Product rights, WDA(H) readiness, GDP controls, vendor oversight and traceable records must align before any regulated release.</p>
            <a className="npd-apple-text-link" href="/regulatory-services/">Regulatory &amp; quality</a>
          </div>
          <aside className="npd-apple-regulatory-notice">
            <p className="npd-apple-eyebrow">CURRENT STATUS</p>
            <h3>Preparation, not permission.</h3>
            <p>Regulated wholesale supply has not commenced. Commercial release remains subject to applicable authorisation, product-specific evidence and operating controls. PLPI activity requires the relevant licence.</p>
          </aside>
        </div>
      </section>

      <section className="npd-apple-contact" aria-labelledby="nph-contact-title">
        <div className="shell container npd-apple-center">
          <p className="npd-apple-eyebrow">QUALIFIED PARTNERSHIPS</p>
          <h2 id="nph-contact-title">Let&apos;s build something meaningful.</h2>
          <p>For manufacturers, product owners, authorised supply partners and organisations pursuing better market access.</p>
          <div className="npd-apple-actions npd-apple-actions-centered">
            <a className="npd-apple-button" href="/contact/">Contact NovaPharm</a>
            <a className="npd-apple-link" href="/partner-with-us/">Partnerships</a>
          </div>
          <p className="npd-apple-footnote">Qualified B2B information only. An enquiry does not confirm authorisation, availability or permission to supply.</p>
        </div>
      </section>
    </div>
  );
}
