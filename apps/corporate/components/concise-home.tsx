import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FinalCta, SectionHeading } from "./ui";

const focusAreas = Object.freeze([
  {
    number: "01",
    title: "Qualified sourcing",
    text: "Evaluate product, supplier and market evidence before a route enters the portfolio.",
  },
  {
    number: "02",
    title: "Quality-led execution",
    text: "Keep authorisation, custody, documentation and accountable decisions connected.",
  },
  {
    number: "03",
    title: "Digital control",
    text: "Use governed data and secure workflows to make evidence easier to verify.",
  },
]);

const readinessSignals = Object.freeze([
  "Authorisation before regulated supply",
  "Product-specific evidence",
  "Qualified B2B partners",
  "Human accountability",
]);

export function ConciseHomePage() {
  return (
    <>
      <section className="home-hero">
        <Image
          className="home-hero-media"
          src="/assets/media/home/supply-network-hero.avif"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          unoptimized
        />
        <div className="home-hero-overlay" aria-hidden="true" />
        <div className="shell home-hero-content">
          <span className="eyebrow">NovaPharm Healthcare</span>
          <h1>Resilient pharmaceutical access, built on evidence.</h1>
          <p>Qualified sourcing, regulatory discipline and secure digital operations for B2B healthcare partners.</p>
          <div className="action-row">
            <Link className="button button-primary" href="/about/">
              Explore NovaPharm <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <Link className="button button-ghost" href="/partner-with-us/">Partner with us</Link>
          </div>
          <p className="hero-status">Corporate development · Regulated wholesale supply not commenced · B2B only</p>
        </div>
      </section>

      <section className="trust-strip" aria-label="NovaPharm operating principles">
        <div className="shell">
          {["Compliance first", "Evidence led", "Qualified partners", "Controlled access"].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="section sourcing-section">
        <div className="shell">
          <SectionHeading
            kicker="Operating model"
            title="Three disciplines. One controlled route."
            intro="Less promise. More evidence at every decision point."
          />
          <div className="sourcing-grid">
            {focusAreas.map((item) => (
              <article key={item.number}>
                <span className="step-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dark-band">
        <div className="shell dark-band-grid">
          <div>
            <span className="eyebrow">Release discipline</span>
            <h2>Nothing regulated moves ahead of evidence.</h2>
            <p>Permissions, quality controls and product-specific readiness come before commercial release.</p>
            <Link className="text-link-light" href="/regulatory-services/">
              Review regulatory readiness <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="signal-list">
            {readinessSignals.map((item) => <span key={item}><Check aria-hidden="true" />{item}</span>)}
          </div>
        </div>
      </section>

      <section className="section partner-preview">
        <div className="shell editorial-split">
          <div className="editorial-number">B2B / Partnerships</div>
          <div>
            <span className="eyebrow">Qualified collaboration</span>
            <h2>Start with fit. Prove the route.</h2>
            <p>Manufacturers, suppliers, buyers, logistics providers and technology partners enter through qualification—not association.</p>
            <div className="action-row">
              <Link className="button button-primary" href="/partner-with-us/">Explore partnerships</Link>
              <Link className="button button-light" href="/contact/">Contact NovaPharm</Link>
            </div>
          </div>
        </div>
      </section>

      <FinalCta title="Bring a qualified opportunity to NovaPharm." />
    </>
  );
}
