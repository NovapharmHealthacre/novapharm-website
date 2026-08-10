import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard, Portrait, PublicationCard } from "@/components/content";
import { JsonLdScript } from "@/components/json-ld";
import { getArticles } from "@/lib/content";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";
import { founderProfile, novapharmOrganisation, publications, vishal } from "@/lib/site-data";

const title = "Vishal Chakravarty — Chief Executive Officer";
const description =
  "Vishal Chakravarty is Chief Executive Officer of NovaPharm Healthcare Ltd and the company’s founder, building around pharmaceutical market access, manufacturing and resilient supply.";

export const metadata: Metadata = pageMetadata({ title, description, path: "/" });

export default function HomePage(): React.JSX.Element {
  const articles = getArticles().slice(0, 3);
  return (
    <>
      <JsonLdScript data={webPageSchema({ path: "/", name: title, description, mainEntity: vishal.id })} />
      <JsonLdScript data={breadcrumbSchema([{ name: "Home", path: "/" }])} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Chief Executive Officer · Pharmaceutical entrepreneurship · Regulated markets</p>
          <h1 id="hero-title">
            <span>Vishal</span> <span>Chakravarty</span>
          </h1>
          <p className="hero-proposition">{founderProfile.proposition}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/about/">
              About Vishal <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" href="/thinking/">
              Read the essays <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="lattice-shell" aria-hidden="true">
            <div className="lattice-poster">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <Portrait priority />
          <div className="portrait-caption">
            <span>Chief Executive Officer</span>
            <span>NovaPharm Healthcare Ltd</span>
          </div>
        </div>
        <ul className="hero-proof" aria-label="Areas of work">
          <li>Pharmaceutical market access</li>
          <li>Manufacturing &amp; technology transfer</li>
          <li>Specialist medicines &amp; supply</li>
        </ul>
      </section>

      <section className="statement section" aria-labelledby="statement-title">
        <p className="section-number">01 / Founder thesis</p>
        <div className="statement-grid">
          <h2 id="statement-title">A medicine can be approvable and still fail to reach the market.</h2>
          <div className="statement-copy">
            <p>
              The real work is connecting product, regulatory pathway, manufacturer, supply, economics and channel early
              enough to build a route that can last.
            </p>
            <Link className="text-link" href="/about/">
              The founder journey <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="venture-feature section" aria-labelledby="venture-title">
        <div className="section-heading">
          <div>
            <p className="section-number">02 / Venture</p>
            <p className="eyebrow">NovaPharm Healthcare</p>
          </div>
        </div>
        <div className="venture-grid">
          <div>
            <h2 id="venture-title">NovaPharm Healthcare Ltd</h2>
            <p className="venture-number">UK pharmaceutical company · Established 2025</p>
          </div>
          <div className="venture-copy">
            <p className="lead">
              A UK pharmaceutical company building market-access, licensing, manufacturing and supply capabilities for
              specialist medicines across regulated markets.
            </p>
            <p>
              NovaPharm is active in corporate and commercial development. Regulated wholesale supply has not commenced
              and will begin only after the required authorisations and operating controls are in place.
            </p>
            <div className="venture-status-pills">
              <span className="status-pill">
                <span aria-hidden="true" /> Product &amp; market strategy
              </span>
              <span className="status-pill">
                <span aria-hidden="true" /> Manufacturing &amp; supply planning
              </span>
            </div>
            <Link className="button button-light" href="/ventures/">
              Explore NovaPharm <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="principles section" aria-labelledby="principles-title">
        <div className="section-heading">
          <div>
            <p className="section-number">03 / Operating thesis</p>
            <h2 id="principles-title">Three decisions shape the route</h2>
          </div>
        </div>
        <div className="principle-list">
          <article>
            <span>01</span>
            <h3>Market access begins before approval</h3>
            <p>
              Product, regulatory, manufacturing, pricing and channel decisions need one commercial sequence from the
              beginning.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Supply is designed before launch</h3>
            <p>
              Manufacturer choice, batch size, lead time and alternative routes determine whether availability can be
              maintained.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Commercial strategy must survive operations</h3>
            <p>
              A forecast is only useful when the pack, cost, cash cycle and buying route can support it in the real
              market.
            </p>
          </article>
        </div>
      </section>

      <section className="writing section" aria-labelledby="writing-title">
        <div className="section-heading">
          <div>
            <p className="section-number">04 / Selected thinking</p>
            <h2 id="writing-title">Pharmaceutical essays</h2>
          </div>
          <Link className="text-link" href="/thinking/">
            All essays <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="essay-list">
          {articles.map((article, index) => (
            <ArticleCard key={article.slug} article={article} index={index} />
          ))}
        </div>
      </section>

      <section className="external-work section" aria-labelledby="external-work-title">
        <div className="section-heading">
          <div>
            <p className="section-number">05 / Published externally</p>
            <h2 id="external-work-title">Current analysis in the pharmaceutical press</h2>
          </div>
          <Link className="text-link" href="/media/">
            Publication record <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="publication-grid publication-grid-featured">
          {publications.slice(0, 2).map((publication) => (
            <PublicationCard key={publication.id} publication={publication} featured />
          ))}
        </div>
      </section>

      <section className="evidence section" aria-labelledby="evidence-title">
        <p className="section-number">06 / Selected record</p>
        <div className="evidence-grid">
          <div>
            <h2 id="evidence-title">
              Company, writing
              <br />
              and work.
            </h2>
            <p>Official company information, independent publication links and a concise professional profile.</p>
          </div>
          <div className="evidence-links">
            <a href={novapharmOrganisation.evidence[0]?.publicUrl} target="_blank" rel="noopener noreferrer">
              <span>Companies House</span>
              <strong>NOVAPHARM HEALTHCARE LTD · Incorporated 2025</strong>
              <span aria-hidden="true">↗</span>
            </a>
            <a href={publications[0]?.canonicalUrl} target="_blank" rel="noopener noreferrer">
              <span>{publications[0]?.publisher}</span>
              <strong>{publications[0]?.title}</strong>
              <span aria-hidden="true">↗</span>
            </a>
            <Link href="/facts/">
              <span>Founder profile</span>
              <strong>Biography, focus and official links</strong>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="gallery-preview section" aria-labelledby="gallery-preview-title">
        <div className="section-heading">
          <div>
            <p className="section-number">07 / Approved portrait</p>
            <h2 id="gallery-preview-title">The official founder portrait.</h2>
          </div>
          <Link className="text-link" href="/gallery/">
            View portrait details <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="profile-spread">
          <div className="profile-image">
            <Portrait />
            <p>Vishal Chakravarty · Chief Executive Officer</p>
          </div>
          <div className="statement-copy">
            <p>
              Only the owner-approved principal portrait is carried into the new application. Unapproved alternatives
              are intentionally excluded from public output.
            </p>
          </div>
        </div>
      </section>

      <section className="closing section" aria-labelledby="closing-title">
        <p className="eyebrow">Speaking · Editorial · Selected partnerships</p>
        <h2 id="closing-title">
          For conversations around pharmaceutical market access, manufacturing, supply and cross-border growth.
        </h2>
        <div>
          <Link className="button button-primary" href="/speaking-partnerships/">
            Conversation areas <span aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/contact/">
            Contact directly <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
