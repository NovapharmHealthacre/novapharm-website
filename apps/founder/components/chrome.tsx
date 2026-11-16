"use client";

import { interfaceLabel, type InterfaceLocale } from "../../../src/core/interface-locale";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FounderEvidenceProvider, OpenEvidenceLink } from "@/components/founder-evidence";
import { founderContact, founderProfile, profileReviewedOn } from "@/lib/site-data";

const navigation = Object.freeze([
  { href: "/about/", label: "About" },
  { href: "/ventures/", label: "Ventures" },
  { href: "/thinking/", label: "Thinking" },
  { href: "/media/", label: "Media" },
  { href: "/gallery/", label: "Portrait" },
  { href: "/facts/", label: "Profile" },
]);

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || (href === "/thinking/" && pathname.startsWith("/essays/"));
}

function SiteHeader({ locale }: Readonly<{ locale: InterfaceLocale }>): React.JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Route changes must collapse the mobile menu, including browser back/forward navigation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the intentional route-change trigger.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header" data-site-header lang={locale}>
      <Link className="brand" href="/" aria-label="Vishal Chakravarty — home" lang="en-GB">
        <span className="brand-mark" aria-hidden="true">
          VC
        </span>
        <span className="brand-name">Vishal Chakravarty</span>
      </Link>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{interfaceLabel(locale, "Menu")}</span>
        <span className="menu-glyph" aria-hidden="true" />
      </button>
      <nav id="site-navigation" className="site-navigation" data-open={open} aria-label={interfaceLabel(locale, "Primary navigation")}>
        <ul className="site-nav-list">
          {navigation.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {interfaceLabel(locale, item.label)}
              </Link>
            </li>
          ))}
          <li className="evidence-nav-item">
            <OpenEvidenceLink>{interfaceLabel(locale, "Ask Vishal’s Work")}</OpenEvidenceLink>
          </li>
          <li>
            <Link
              className="nav-contact"
              href="/contact/"
              aria-current={pathname === "/contact/" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {interfaceLabel(locale, "Contact")}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

function SiteFooter({ locale }: Readonly<{ locale: InterfaceLocale }>): React.JSX.Element {
  return (
    <footer className="site-footer">
      <div className="footer-intro">
        <p className="eyebrow">Vishal Chakravarty</p>
        <h2>
          Chief Executive Officer,
          <br />
          NovaPharm Healthcare Ltd.
        </h2>
        <p className="footer-founder-role">Founder of NovaPharm Healthcare Ltd.</p>
      </div>
      <div className="footer-grid">
        <div>
          <p>{founderProfile.proposition}</p>
        </div>
        <nav aria-label="Footer navigation" lang={locale}>
          <Link href="/about/">{interfaceLabel(locale, "About")}</Link>
          <Link href="/ventures/">{interfaceLabel(locale, "Ventures")}</Link>
          <Link href="/thinking/">{interfaceLabel(locale, "Thinking")}</Link>
          <Link href="/media/">{interfaceLabel(locale, "Media")}</Link>
          <Link href="/gallery/">{interfaceLabel(locale, "Portrait")}</Link>
          <Link href="/facts/">{interfaceLabel(locale, "Profile")}</Link>
          <OpenEvidenceLink>{interfaceLabel(locale, "Ask Vishal’s Work")}</OpenEvidenceLink>
          <Link href="/privacy/">{interfaceLabel(locale, "Privacy")}</Link>
        </nav>
        <div className="footer-contact">
          <a href={`mailto:${founderContact.email}`}>{founderContact.email}</a>
          <a href={founderContact.linkedIn} target="_blank" rel="noopener noreferrer">
            LinkedIn <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <div className="footer-base">
        <span>© {profileReviewedOn.slice(0, 4)} Vishal Chakravarty</span>
        <span>Pharmaceutical entrepreneurship · Market access · Regulated markets</span>
      </div>
    </footer>
  );
}

export function SiteChrome({ children, locale }: { readonly children: React.ReactNode; readonly locale: InterfaceLocale }): React.JSX.Element {
  return (
    <FounderEvidenceProvider>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <SiteHeader locale={locale} />
      <main id="main" tabIndex={-1} lang="en-GB" data-np-untranslated>
        {children}
      </main>
      <SiteFooter locale={locale} />
    </FounderEvidenceProvider>
  );
}
