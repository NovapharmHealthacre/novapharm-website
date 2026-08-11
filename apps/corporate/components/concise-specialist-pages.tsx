import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { croContent } from "@/data/cro";
import { oncologyContent } from "@/data/oncology";
import { productCategories, regulatorySections, servicePillars } from "@/data/site";
import { FinalCta, PageHero, SectionHeading, StatusNotice } from "./ui";

function EvidenceDetails({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <details className="evidence-details">
      <summary>{label}<ArrowRight aria-hidden="true" size={16} /></summary>
      <div className="evidence-details-body">{children}</div>
    </details>
  );
}

export function ConciseServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Connected services for regulated-market preparation."
        intro="Product, sourcing, quality, logistics, market access and digital operations—connected around one controlled route."
        image="/assets/media/modules/services-connected-execution.jpg"
        alt="Pharmaceutical specialists coordinating a controlled programme"
      />
      <section className="section">
        <div className="shell">
          <SectionHeading
            kicker="Service architecture"
            title="Start with the operating problem."
            intro="Each service shows the value first; approach and evidence boundaries remain one step deeper."
          />
          <div className="service-grid concise-service-grid">
            {servicePillars.map((service, index) => (
              <article id={service.slug} key={service.slug}>
                <div className="service-index">{String(index + 1).padStart(2, "0")}</div>
                <span className="eyebrow">{service.audience}</span>
                <h2>{service.title}</h2>
                <p>{service.value}</p>
                <EvidenceDetails label="Approach and evidence boundary">
                  <dl>
                    <div><dt>Problem</dt><dd>{service.problem}</dd></div>
                    <div><dt>Approach</dt><dd>{service.approach}</dd></div>
                  </dl>
                  <p className="caveat"><ShieldCheck aria-hidden="true" />{service.caveat}</p>
                </EvidenceDetails>
                <a className="text-link" href={`/contact/?enquiry=${encodeURIComponent(service.cta)}`}>{service.cta} <ArrowRight aria-hidden="true" size={16} /></a>
              </article>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}

export function ConciseRegulatoryPage() {
  const roadmap = [...regulatorySections.slice(0, 6).map(([title]) => title), "Commercial release only after applicable authorisation"];
  return (
    <>
      <PageHero
        eyebrow="Regulatory"
        title="No regulated supply before the required permissions."
        intro="Authorisation, product status, quality and accountable ownership must agree before commercial release."
        image="/assets/media/modules/regulatory-dossier-control.jpg"
        alt="Specialist reviewing a pharmaceutical regulatory dossier"
      />
      <section className="section regulatory-roadmap">
        <div className="shell">
          <div className="roadmap-header">
            <SectionHeading kicker="Regulatory foundation" title="A staged pathway with stop points." intro="Sequence first. Evidence before release." />
            <StatusNotice />
          </div>
          <ol className="roadmap-track">
            {roadmap.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>)}
          </ol>
          <EvidenceDetails label="Review the regulatory evidence model">
            <div className="regulatory-grid concise-evidence-grid">
              {regulatorySections.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}
            </div>
          </EvidenceDetails>
        </div>
      </section>
      <FinalCta title="Discuss a product-specific regulatory pathway." />
    </>
  );
}

export function ConciseCroPage() {
  return (
    <>
      <PageHero
        eyebrow="Clinical Research & CRO Support"
        title="Clinical development, connected to evidence and accountability."
        intro="Programme architecture and specialist coordination with sponsor responsibilities kept explicit."
        image="/assets/media/cro/cro-delivery-architecture-1600.jpg"
        alt="Clinical-development programme architecture under specialist review"
      />
      <section className="section">
        <div className="shell evidence-boundary">
          <div>
            <SectionHeading kicker="Operating boundary" title="Focused orchestration. No unsupported full-service claim." intro={croContent.status} />
          </div>
          <div className="signal-list">
            {croContent.audiences.map(([audience]) => <span key={audience}><Check aria-hidden="true" /><strong>{audience}</strong></span>)}
          </div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell">
          <SectionHeading kicker="Responsibility model" title="Three delivery lanes." intro="Keep programme coordination, specialist delivery and sponsor-retained duties distinct." />
          <div className="lane-grid concise-lane-grid">
            {croContent.deliveryLanes.map((lane, index) => (
              <article key={lane.key}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{lane.label}</h3>
                <p>{lane.summary}</p>
                <EvidenceDetails label="Responsibilities">
                  <ul>{lane.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </EvidenceDetails>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <SectionHeading kicker="Operating sequence" title="Responsibilities before activity." />
          <ol className="process-grid">
            {croContent.operatingSteps.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
          <EvidenceDetails label="Clinical-development questions and answers">
            <div className="faq-compact">
              {croContent.faqs.map(([question, answer]) => <div key={question}><h3>{question}</h3><p>{answer}</p></div>)}
            </div>
          </EvidenceDetails>
        </div>
      </section>
      <FinalCta title="Discuss a non-confidential clinical-development programme." />
    </>
  );
}

export function ConciseOncologyPage() {
  return (
    <>
      <PageHero
        eyebrow={oncologyContent.scope.eyebrow}
        title={oncologyContent.scope.title}
        intro="Formulation, source, quality, condition and regulatory readiness—connected before supply."
        image="/assets/media/products/oncology-vial-handling.jpg"
        alt="Gloved laboratory professional handling an unbranded vial"
      />
      <section className="section">
        <div className="shell">
          <StatusNotice />
          <p className="scope-boundary">{oncologyContent.scope.boundary}</p>
          <div className="principle-grid concise-principle-grid">
            {oncologyContent.principles.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{title}</h2><p>{text}</p></article>)}
          </div>
        </div>
      </section>
      <section className="section section-dark">
        <div className="shell">
          <SectionHeading kicker="Continuity model" title="Six connected evidence axes." />
          <div className="axis-grid">{oncologyContent.continuityAxes.map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}</div>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <SectionHeading kicker="Product-specific depth" title="Open the evidence you need." intro="Formulation and readiness detail stays available without dominating the first read." />
          <div className="progressive-stack">
            {oncologyContent.formulations.map((item) => (
              <EvidenceDetails key={item.id} label={`${item.label}: ${item.title}`}>
                <p>{item.text}</p>
                <ul>{item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul>
              </EvidenceDetails>
            ))}
            <EvidenceDetails label="Oncology readiness matrix">
              {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll the wide table. */}
              <section className="table-scroll" tabIndex={0} aria-label="Scrollable oncology readiness matrix">
                <table><thead><tr><th>Dimension</th><th>Question</th><th>Required evidence</th><th>Stop condition</th></tr></thead><tbody>{oncologyContent.readiness.map((row) => <tr key={row.dimension}><th>{row.dimension}</th><td>{row.question}</td><td>{row.required}</td><td>{row.stop}</td></tr>)}</tbody></table>
              </section>
            </EvidenceDetails>
            <EvidenceDetails label="Oncology questions and answers">
              <div className="faq-compact">{oncologyContent.faqs.map(([question, answer]) => <div key={question}><h3>{question}</h3><p>{answer}</p></div>)}</div>
            </EvidenceDetails>
          </div>
        </div>
      </section>
      <FinalCta title="Discuss a non-confidential oncology or specialist-medicine opportunity." />
    </>
  );
}

export function ConciseProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title="A portfolio of governed decisions—not promises."
        intro="Every category remains subject to product rights, evidence, authorisation, qualified supply and confirmed availability."
        image="/assets/media/modules/product-portfolio-evidence.jpg"
        alt="Pharmaceutical portfolio evidence under professional review"
      />
      <section id="food-supplement-portfolio-review" className="section portfolio-priority">
        <div className="shell portfolio-priority-grid">
          <div className="portfolio-priority-copy">
            <span className="eyebrow">Nutraxin UK catalogue reference</span>
            <h2>Food Supplement Portfolio Review</h2>
            <p>19 owner-supplied catalogue records for qualified B2B evaluation. No claim of UK availability, price, stock, permitted claims or medicinal status.</p>
            <div className="action-row portfolio-priority-links">
              <Link className="button button-primary" href="/product-portfolio/nutraxin/">Review 19 references</Link>
              <Link className="button button-light" href="/contact/?enquiry=Product%20opportunity">Discuss an opportunity</Link>
            </div>
          </div>
          <div className="portfolio-priority-media"><Image src="/assets/media/products/nutraxin/vitamin-d3-120-tablets-800.webp" alt="Nutraxin Vitamin D3 box and 120-tablet bottle shown as an owner-supplied catalogue reference" fill sizes="350px" priority unoptimized /></div>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <StatusNotice />
          <SectionHeading kicker="Strategic categories" title="Focus areas, not stock claims." intro="Open a category for its evidence boundary." />
          <div className="product-grid concise-product-grid">
            {productCategories.map((category) => (
              <article key={category.title}>
                <span className="status-chip">{category.status}</span>
                <h2>{category.title}</h2>
                <EvidenceDetails label="Category context"><p>{category.text}</p></EvidenceDetails>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="shell editorial-split">
          <div className="editorial-number">Evidence gate</div>
          <div><h2>No category implies stock, approval or supply.</h2><p>Representative imagery does not establish NovaPharm inventory, premises, employees or current partners.</p><Link className="text-link" href="/regulatory-services/">Review the regulatory model <ArrowRight aria-hidden="true" size={16} /></Link></div>
        </div>
      </section>
      <FinalCta title="Submit a product or portfolio opportunity for qualified assessment." />
    </>
  );
}
