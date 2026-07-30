import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Breadcrumbs({ items }: { readonly items: readonly { readonly label: string; readonly href?: string }[] }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={item.href ?? item.label}>{item.href ? <Link href={item.href}>{item.label}</Link> : item.label}{index < items.length - 1 ? <i aria-hidden="true">/</i> : null}</span>)}</nav>;
}

export function PageHero({ eyebrow, title, intro, image, alt = "", dark = false }: { readonly eyebrow: string; readonly title: string; readonly intro: string; readonly image?: string; readonly alt?: string; readonly dark?: boolean }) {
  return (
    <section className={`page-hero${dark ? " page-hero-dark" : ""}${image ? " page-hero-image" : ""}`}>
      {image ? <Image className="page-hero-media" src={image} alt={alt} fill priority sizes="100vw" /> : null}
      <div className="page-hero-shade" aria-hidden="true" />
      <div className="shell page-hero-copy">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: eyebrow }]} />
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
    </section>
  );
}

export function SectionHeading({ kicker, title, intro }: { readonly kicker?: string; readonly title: string; readonly intro?: string }) {
  return <div className="section-heading">{kicker ? <span className="eyebrow">{kicker}</span> : null}<h2>{title}</h2>{intro ? <p>{intro}</p> : null}</div>;
}

export function StatusNotice() {
  return <aside className="status-notice" aria-label="Regulatory status"><strong>Regulatory status</strong><p>NovaPharm is pre-operational for regulated wholesale supply. Regulated activity will begin only after the required MHRA authorisations and other applicable permissions are granted.</p></aside>;
}

export function FinalCta({ title = "Build the next pharmaceutical partnership with NovaPharm." }: { readonly title?: string }) {
  return <section className="final-cta"><div className="shell final-cta-inner"><div><span className="eyebrow">Start a qualified conversation</span><h2>{title}</h2></div><div className="action-row"><Link className="button button-primary" href="/contact/">Discuss a partnership <ArrowRight aria-hidden="true" size={17} /></Link><Link className="button button-light" href="/account-application/">Account interest</Link></div></div></section>;
}
