import type { Route } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ArrowUpRight } from "@/components/icons";
import { navigation, site } from "@/data/site";
import { type InterfaceLocale, interfaceLabel } from "../../../src/core/interface-locale";

export function SiteFooter({ locale }: Readonly<{ locale: InterfaceLocale }>) {
  return (
    <footer className="site-footer" lang="en-GB">
      <div className="shell">
        <div className="site-footer__lead">
          <div>
            <p className="eyebrow eyebrow--light">A sharper decision starts here</p>
            <h2>Bring us the decision that cannot afford to be vague.</h2>
          </div>
          <Link className="footer-cta" href="/contact">
            Start a conversation
            <ArrowUpRight />
          </Link>
        </div>

        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Brand inverse />
            <p>
              Pharmaceutical strategy and execution advisory—built around evidence, choice, and disciplined implementation.
            </p>
          </div>
          <div>
            <p className="footer-label">Navigate</p>
            <nav lang={locale} aria-label={interfaceLabel(locale, "Footer navigation")}>
              {navigation.map((item) => (
                <Link href={item.href as Route} key={item.href}>{interfaceLabel(locale, item.label)}</Link>
              ))}
              <Link href="/contact">{interfaceLabel(locale, "Contact")}</Link>
            </nav>
          </div>
          <div>
            <p className="footer-label">Contact</p>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <address>{site.address.map((line) => <span key={line}>{line}</span>)}</address>
          </div>
          <div>
            <p className="footer-label">Perspective</p>
            <p>India intelligence.<br />International perspective.<br />Execution discipline.</p>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} Novapharm Innovation Technology.</p>
          <div lang={locale}>
            <Link href="/privacy">{interfaceLabel(locale, "Privacy")}</Link>
            <Link href="/terms">{interfaceLabel(locale, "Terms")}</Link>
          </div>
          <p><a href="https://novapharmhealthcare.com/">NovaPharm Healthcare digital estate</a> · Vadodara · India</p>
        </div>
      </div>
    </footer>
  );
}
