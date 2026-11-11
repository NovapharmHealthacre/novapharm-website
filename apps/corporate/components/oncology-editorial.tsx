import Image from "next/image";
import { oncologyContent } from "@/data/oncology";

const enquiry = "/contact/?enquiry=Oncology%20%26%20specialist%20medicines";
const handoffs = [
  "Programme evidence",
  "Product readiness",
  "Qualified source",
  "Regulatory pathway",
  "Accountable release",
];

export function OncologyEditorialPage() {
  return (
    <div className="npoc-page" data-oncology-design="editorial-v2">
      <nav className="npoc-subnav" aria-label="Oncology page sections">
        <div className="container">
          <strong>Oncology</strong>
          <div>
            <a href="#approach">Approach</a>
            <a href="#evidence">Evidence</a>
            <a href="#programmes">Programmes</a>
            <a href="#governance">Governance</a>
            <a href="#oncology-enquiry">Partner with us</a>
          </div>
        </div>
      </nav>

      <section className="npoc-hero" aria-labelledby="npoc-title">
        <div className="npoc-hero-visual" aria-hidden="true">
          <picture>
            <source
              srcSet="/assets/media/products/oncology-vial-handling-960.avif 960w, /assets/media/products/oncology-vial-handling.avif 1600w"
              sizes="(max-width: 760px) 100vw, 100vw"
              type="image/avif"
            />
            <source
              srcSet="/assets/media/products/oncology-vial-handling-960.webp 960w, /assets/media/products/oncology-vial-handling.webp 1600w"
              sizes="(max-width: 760px) 100vw, 100vw"
              type="image/webp"
            />
            <Image
              src="/assets/media/products/oncology-vial-handling.jpg"
              alt=""
              width={1600}
              height={900}
              sizes="100vw"
              priority
              unoptimized
            />
          </picture>
        </div>
        <div className="npoc-hero-shade" aria-hidden="true" />
        <div className="container npoc-hero-content">
          <div className="npoc-hero-copy">
            <p className="npoc-eyebrow">NOVAPHARM / ONCOLOGY</p>
            <h1 id="npoc-title">Oncology demands{" "}<br />more than supply.</h1>
            <p className="npoc-hero-lead">Product identity. Qualified sourcing. Regulatory readiness.</p>
            <p className="npoc-hero-detail">
              An evidence-led approach to evaluating specialist-medicine opportunities,
              built around the details that matter.
            </p>
            <div className="npoc-actions">
              <a className="npoc-button npoc-button-primary" href={enquiry}>Discuss a partnership</a>
              <a className="npoc-button npoc-button-light" href="#approach">Explore our approach</a>
            </div>
          </div>
        </div>
        <p className="npoc-image-note">
          Representative scientific photography. No NovaPharm product, facility or
          active oncology programme is depicted.
        </p>
      </section>

      <aside className="npoc-status" id="scope-boundary" aria-label="Current oncology scope">
        <div className="container">
          <strong>Strategic B2B focus</strong>
          <p>
            Regulated wholesale supply has not commenced. Oncology products are
            not presented as approved, stocked or available from NovaPharm.
            All activity remains subject to relevant authorisations and applicable controls.
          </p>
          <a href="#oncology-faqs">Read our current scope</a>
        </div>
      </aside>

      <section className="npoc-section npoc-introduction" id="approach" aria-labelledby="npoc-approach-title">
        <div className="container npoc-narrow">
          <p className="npoc-eyebrow">THE PRINCIPLE</p>
          <h2 id="npoc-approach-title">Every detail<br />matters.</h2>
          <p className="npoc-intro-lead">
            A medicine is more than its name. Its identity, evidence, source,
            handling and accountable decisions must remain connected through every hand-off.
          </p>
          <p className="npoc-intro-support">
            Commercial interest opens a question. It does not establish a right to
            supply, the quality of the evidence or readiness for regulated activity.
          </p>
        </div>
      </section>

      <section className="npoc-section npoc-evidence" id="evidence" aria-labelledby="npoc-evidence-title">
        <div className="container">
          <div className="npoc-section-heading">
            <p className="npoc-eyebrow">OUR EVIDENCE MODEL</p>
            <h2 id="npoc-evidence-title">Six connected decisions.<br />One coherent view.</h2>
            <p>Complex pharmaceutical opportunities need more than a checklist. Each evidence axis should lead to a traceable, accountable next decision.</p>
          </div>
          <ol className="npoc-evidence-list">
            {oncologyContent.continuityAxes.map(([name, description], index) => (
              <li key={name}>
                <span className="npoc-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="npoc-eyebrow">{name === "Product" ? "Identity" : name}</p>
                  <h3>{[
                    "Know the exact medicine.",
                    "Make every claim traceable.",
                    "Qualify every hand-off.",
                    "Protect the product requirements.",
                    "Plan without pretending to predict.",
                    "Keep a named accountable owner.",
                  ][index]}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="npoc-section npoc-programmes" id="programmes" aria-labelledby="npoc-programmes-title">
        <div className="container">
          <div className="npoc-section-heading">
            <p className="npoc-eyebrow">SPECIALIST PROGRAMMES</p>
            <h2 id="npoc-programmes-title">Complexity deserves precision.</h2>
            <p>
              Explore how evidence requirements change across pharmaceutical presentations.
              These are assessment categories, not a product catalogue or availability statement.
            </p>
          </div>
          <div className="npoc-programme-layout">
            <div className="npoc-programme-list">
              {oncologyContent.formulations.map((programme, index) => (
                <details key={programme.id} open={index === 0}>
                  <summary>
                    <span className="npoc-index">{String(index + 1).padStart(2, "0")}</span>
                    <span>{programme.label}</span>
                    <span className="npoc-disclosure" aria-hidden="true" />
                  </summary>
                  <div className="npoc-programme-body">
                    <h3>{programme.title}</h3>
                    <p>{programme.text}</p>
                    <ul>{programme.evidence.map((line) => <li key={line}>{line}</li>)}</ul>
                  </div>
                </details>
              ))}
            </div>
            <aside className="npoc-programme-image npoc-editorial-panel" aria-label="Evidence-led programme approach">
              <p className="npoc-eyebrow">CONTROLLED FROM THE START</p>
              <p className="npoc-panel-headline">The detail behind every decision.</p>
              <p className="npoc-panel-support">Formulation. Evidence. Quality. Accountability.</p>
              <p className="npoc-panel-footer">Different presentations. The same standard of scrutiny.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="npoc-section npoc-governance" id="governance" aria-labelledby="npoc-governance-title">
        <div className="container">
          <div className="npoc-section-heading">
            <p className="npoc-eyebrow">READINESS BEFORE RELEASE</p>
            <h2 id="npoc-governance-title">The pathway is only as strong as its evidence.</h2>
            <p>
              Every step requires the appropriate party, documentation and authority.
              Forecasts and commercial assumptions never replace formal approval.
            </p>
          </div>
          <ol className="npoc-pathway">
            {handoffs.map((name, index) => (
              <li key={name}><span>{String(index + 1).padStart(2, "0")}</span><strong>{name}</strong></li>
            ))}
          </ol>
          <details className="npoc-matrix">
            <summary>Explore the full readiness matrix<span className="npoc-disclosure" aria-hidden="true" /></summary>
            {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users can scroll the wide evidence table. */}
            <section className="npoc-table-scroll" tabIndex={0} aria-label="Scrollable oncology readiness matrix">
              <table>
                <caption>Six readiness dimensions, required evidence and stop conditions</caption>
                <thead><tr>
                  <th scope="col">Dimension</th>
                  <th scope="col">Operating question</th>
                  <th scope="col">Evidence</th>
                  <th scope="col">Stop condition</th>
                </tr></thead>
                <tbody>{oncologyContent.readiness.map((row) => (
                  <tr key={row.dimension}>
                    <th scope="row">{row.dimension}</th>
                    <td>{row.question}</td>
                    <td>{row.required}</td>
                    <td>{row.stop}</td>
                  </tr>
                ))}</tbody>
              </table>
            </section>
          </details>
          <p className="npoc-boundary">
            NovaPharm does not provide medical advice, direct patient services or a
            guarantee of product authorisation, programme outcome or availability.
          </p>
        </div>
      </section>

      <section className="npoc-section npoc-faq" id="oncology-faqs" aria-labelledby="npoc-faq-title">
        <div className="container npoc-faq-layout">
          <div>
            <p className="npoc-eyebrow">QUESTIONS &amp; SCOPE</p>
            <h2 id="npoc-faq-title">Clarity matters.</h2>
            <p>Current operating boundaries and practical questions for prospective partners.</p>
          </div>
          <div className="npoc-faq-list">
            {oncologyContent.faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="npoc-section npoc-enquiry" id="oncology-enquiry" aria-labelledby="npoc-enquiry-title">
        <div className="container npoc-narrow">
          <p className="npoc-eyebrow">QUALIFIED COLLABORATION</p>
          <h2 id="npoc-enquiry-title">The next conversation starts here.</h2>
          <p>
            Product and dossier owners, qualified manufacturers, CMO/CDMOs,
            authorised supply partners and specialist providers can begin with
            a non-confidential opportunity summary.
          </p>
          <div className="npoc-actions">
            <a className="npoc-button npoc-button-primary" href={enquiry}>Start a partnership enquiry</a>
            <a className="npoc-button npoc-button-outline" href="mailto:vishal@novapharmhealthcare.com?subject=NovaPharm%20Oncology%20Partnership%20Enquiry">Email our team</a>
          </div>
          <p className="npoc-enquiry-note">
            The contact route is a public business-enquiry entry point, not a secure dossier exchange.
            Do not submit confidential dossiers, patient-identifiable information,
            adverse-event reports or urgent medical information through it.
          </p>
        </div>
      </section>
    </div>
  );
}
