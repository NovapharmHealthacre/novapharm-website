import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { sourcingPillars } from "@/data/site";
import { FinalCta } from "./ui";

const principles = [
  "Qualified sourcing",
  "Regulatory discipline",
  "Quality-led decisions",
];

const focusAreas = [
  {
    title: "Oncology & specialty",
    text: "Focused assessment of products where continuity, formulation and evidence need closer control.",
    href: "/oncology/",
  },
  {
    title: "Regulatory & quality",
    text: "Authorisation, QMS, vendor oversight and product-specific responsibilities before commercial release.",
    href: "/regulatory-services/",
  },
  {
    title: "Technology & traceability",
    text: "A governed digital operating layer for accounts, documents, evidence and decision history.",
    href: "/technology/",
  },
];

export function ConciseHomePage() {
  return (
    <>
      <section className="pharma-home-hero">
        <div className="shell pharma-home-grid">
          <div className="pharma-home-copy">
            <p className="pharma-kicker">NovaPharm Healthcare</p>
            <h1>Pharmaceutical supply, built around evidence.</h1>
            <p className="pharma-home-intro">A compliance-first B2B model connecting qualified sourcing, regulatory readiness and controlled distribution planning.</p>
            <div className="action-row">
              <Link className="button button-primary" href="/about/">Explore NovaPharm <ArrowRight aria-hidden="true" size={17} /></Link>
              <Link className="button button-quiet" href="/partner-with-us/">Partner with us</Link>
            </div>
            <p className="pharma-status"><ShieldCheck aria-hidden="true" size={16} /> Regulated wholesale supply has not commenced.</p>
          </div>
          <div className="pharma-home-media">
            <Image src="/assets/media/home/supply-network-hero.avif" alt="Pharmaceutical supply and quality operations" fill priority sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
        </div>
      </section>

      <section className="pharma-principles" aria-label="NovaPharm operating principles">
        <div className="shell pharma-principles-grid">
          {principles.map((item) => <span key={item}><Check aria-hidden="true" size={17} />{item}</span>)}
        </div>
      </section>

      <section className="section pharma-section">
        <div className="shell">
          <div className="pharma-section-heading">
            <p className="pharma-kicker">Sourcing strategy</p>
            <h2>Three routes. One qualification standard.</h2>
            <p>Diversification matters only when every route meets the same evidence threshold.</p>
          </div>
          <div className="pharma-pillar-grid">
            {sourcingPillars.map((pillar) => (
              <article key={pillar.number}>
                <span>{pillar.number}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pharma-section pharma-focus-section">
        <div className="shell pharma-focus-layout">
          <div className="pharma-focus-media">
            <Image src="/assets/media/stories/regulatory-batch-integrity.jpg" alt="Controlled pharmaceutical packaging and traceability records" fill sizes="(max-width: 900px) 100vw, 48vw" />
          </div>
          <div className="pharma-focus-copy">
            <p className="pharma-kicker">Controlled growth</p>
            <h2>Clarity before complexity.</h2>
            <p>NovaPharm separates what is operational, what is being built and what still requires external approval.</p>
            <Link className="text-link" href="/trust-centre/">Review the evidence boundary <ArrowRight aria-hidden="true" size={16} /></Link>
          </div>
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
                <Link href={item.href}>Learn more <ArrowRight aria-hidden="true" size={15} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FinalCta title="Discuss a qualified pharmaceutical opportunity." />
    </>
  );
}
