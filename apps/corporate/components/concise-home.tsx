import Image from "next/image";
import Link from "@/components/public-link";
import { CorporateHero } from "./corporate-hero";
import { FinalCta } from "./ui";

const principles = ["Qualified sourcing", "Regulatory discipline", "Quality-led decisions"];

const sourcingRoutes = [
  {
    number: "01",
    title: "Direct GMP partnerships",
    text: "Qualified manufacturing relationships with controlled technical and quality review.",
  },
  {
    number: "02",
    title: "Product-specific PLPI",
    text: "Evidence-led assessment of appropriate parallel-import opportunities and obligations.",
  },
  {
    number: "03",
    title: "European sourcing",
    text: "Diversified authorised supply routes with licence, quality and continuity checks.",
  },
];

const focusAreas = [
  {
    title: "Oncology & specialty",
    text: "Closer control of formulation, continuity and evidence.",
    href: "/oncology/",
    linkLabel: "Explore oncology continuity",
  },
  {
    title: "Regulatory & quality",
    text: "Authorisation, QMS and vendor oversight before release.",
    href: "/regulatory-services/",
    linkLabel: "Review regulatory services",
  },
  {
    title: "Technology & traceability",
    text: "Governed accounts, documents, evidence and decision history.",
    href: "/technology/",
    linkLabel: "Explore technology controls",
  },
];

export function ConciseHomePage() {
  return (
    <>
      <CorporateHero>
          <div className="corporate-hero-copy">
            <h1><Image src="/assets/brand/novapharm-healthcare-logo.svg" alt="NovaPharm Healthcare" width={11185} height={1398} className="corporate-hero-wordmark" priority /></h1>
            <p className="corporate-hero-tagline">Medicine.<br />Where it needs to be.</p>
            <p className="corporate-hero-intro">Qualified sourcing, regulatory readiness and controlled B2B distribution planning.</p>
            <div className="action-row">
              <Link className="button button-primary" href="/about/">Explore NovaPharm</Link>
              <Link className="button button-quiet" href="/partner-with-us/">Partner with us</Link>
            </div>
            <p className="corporate-hero-status">Regulated wholesale supply has not commenced.</p>
          </div>
          <p className="corporate-hero-boundary">Illustrative composition.<br />Not a NovaPharm product or active batch.</p>
      </CorporateHero>

      <section className="pharma-principles" aria-label="NovaPharm operating principles">
        <div className="shell pharma-principles-grid">
          {principles.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="section pharma-section">
        <div className="shell">
          <div className="pharma-section-heading">
            <p className="pharma-kicker">Sourcing strategy</p>
            <h2>Three routes. One standard.</h2>
            <p>Every route must meet the same evidence threshold.</p>
          </div>
          <div className="pharma-pillar-grid">
            {sourcingRoutes.map((pillar) => (
              <article key={pillar.number}>
                <span>{pillar.number}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pharma-focus-section">
        <div className="pharma-focus-media" aria-hidden="true">
          <Image src="/assets/media/stories/regulatory-batch-integrity.jpg" alt="" fill sizes="100vw" />
        </div>
        <div className="pharma-focus-shade" aria-hidden="true" />
        <div className="shell pharma-focus-layout">
          <div className="pharma-focus-copy">
            <p className="pharma-kicker">Batch integrity</p>
            <h2>Evidence travels with the batch.</h2>
            <p>Clarity before complexity. Packaging, records and release status remain connected across each governed transaction.</p>
            <Link className="text-link" href="/trust-centre/">Review the evidence boundary</Link>
          </div>
          <p className="pharma-media-boundary">Representative traceability composition. It is not a NovaPharm facility, product or active batch record.</p>
        </div>
      </section>

      <section className="section pharma-section">
        <div className="shell">
          <div className="pharma-section-heading">
            <p className="pharma-kicker">Core focus</p>
            <h2>Specialist work. Less noise.</h2>
          </div>
          <div className="pharma-focus-grid">
            {focusAreas.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <Link href={item.href}>{item.linkLabel}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FinalCta title="Discuss a qualified pharmaceutical opportunity." />
    </>
  );
}
