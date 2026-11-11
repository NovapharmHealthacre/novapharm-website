import Image from "next/image";
import Link from "next/link";

// The canonical editorial text, composition and artwork mirror
// src/content/capabilities-editorial.html in the static public publisher.
// Derived artwork is materialised at build by sync-public-assets.mjs.
const disciplines = [
  {
    id: "01",
    title: <>Market-entry and<br />supply services</>,
    description: "Opportunity framing, responsible sourcing, partner qualification and launch-readiness planning.",
    href: "/services/",
    label: "Explore market entry and supply services",
  },
  {
    id: "02",
    title: <>Regulatory<br />&amp; Quality</>,
    description: "Permission pathways, quality systems, GDP, vendor oversight and documentation readiness.",
    href: "/regulatory-services/",
    label: "Explore regulatory and quality capabilities",
  },
  {
    id: "03",
    title: <>Clinical Research<br />&amp; CRO support</>,
    description: "Programme framing, responsibility mapping and specialist-provider coordination within UK pathways.",
    href: "/cro/",
    label: "Explore clinical research and CRO support",
  },
  {
    id: "04",
    title: <>Governed<br />technology</>,
    description: "Connected medicines information, controlled records and transparent, human-governed workflows.",
    href: "/technology/",
    label: "Explore NovaPharm Intelligence and governed technology",
  },
] as const;

export function CapabilitiesEditorialPage() {
  return (
    <div className="ncap-page ncap-managed" data-capabilities-editorial="approved-2026-11">
      <section className="npd-hero ncap-hero" aria-labelledby="ncap-title">
        <div className="ncap-wrap ncap-hero-content">
          <p className="ncap-kicker">Capabilities</p>
          <h1 id="ncap-title"><span className="ncap-title-line">From evidence</span><span className="ncap-title-line">to access.</span></h1>
          <p className="ncap-hero-lead">Market entry, regulatory, clinical and technology decisions, connected to shape an evidence-led route for medicines.</p>
          <a className="ncap-hero-link" href="#ncap-model">Explore our capabilities <span aria-hidden="true">↗</span></a>
        </div>
        <figure className="ncap-hero-art">
          <Image
            className="ncap-vial-illustration"
            src="/assets/media/capabilities/vial-study.webp"
            width={1200}
            height={458}
            alt="Illustrative pharmaceutical glass vial representing an evidence-led route to market"
            unoptimized
            fetchPriority="high"
          />
        </figure>
      </section>

      <section className="ncap-model" id="ncap-model" aria-labelledby="ncap-model-title">
        <div className="ncap-wrap">
          <p className="ncap-kicker">Our capability model</p>
          <h2 id="ncap-model-title">Four connected disciplines.<br />Clear accountability.</h2>
          <p className="ncap-model-lead">The path to market is never a single decision. Each discipline shapes what comes next.</p>
          <div className="ncap-grid">
            {disciplines.map((item) => (
              <Link className="ncap-discipline" href={item.href} aria-label={item.label} key={item.id}>
                <span className="ncap-number">{item.id}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="ncap-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ncap-earth" aria-labelledby="ncap-earth-title">
        <div className="ncap-earth-image" aria-hidden="true">
          <Image className="ncap-earth-illustration" src="/assets/media/capabilities/earth-horizon.webp" width={1600} height={720} alt="" unoptimized />
        </div>
        <div className="ncap-earth-copy ncap-wrap">
          <p className="ncap-earth-kicker">Your next move matters</p>
          <h2 id="ncap-earth-title">Start with one decision.</h2>
          <p>A focused conversation defines the opportunity, the evidence, the target market and our role. Then we determine the right workstream, without treating plans as approvals.</p>
          <Link className="ncap-cta" href="/contact/?enquiry=Capabilities">Discuss a requirement <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
