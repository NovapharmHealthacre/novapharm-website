import Link from "next/link";
import { InterfaceLocaleSwitcher } from "../../../src/components/interface-locale-switcher";
import { type InterfaceLocale, interfaceLabel } from "../../../src/core/interface-locale";
import { AppStoreAvailability } from "./app-store-availability";
import { AppleFooterNavigation, CurrentFooterLink } from "./apple-footer-navigation";
import { Brand } from "./brand";
import { CookieSettingsButton } from "./cookie-controls";

const portalOrigin = process.env.PORTAL_ORIGIN ?? "https://portal.novapharmhealthcare.com";

/**
 * Public Corporate chrome: same four directories, notices and legal destinations
 * as the restored static website. The nested disclosures stay keyboard-operable
 * on narrow viewports without altering protected Portal UI.
 */
export function SiteFooter({ locale }: Readonly<{ locale: InterfaceLocale }>) {
  return (
    <footer className="site-footer npd-footer apple-corporate-footer">
      <div className="container shell">
        <div className="npd-footer-top footer-primary">
          <div className="npd-footer-identity footer-brand">
            <Brand footer />
            <p lang="en-GB" dir="ltr">Evidence-led pharmaceutical market entry, sourcing and supply-chain development.</p>
            <AppStoreAvailability />
          </div>
          <nav aria-label={interfaceLabel(locale, "Company links")}>
            <AppleFooterNavigation label={interfaceLabel(locale, "Company")}>
              <Link href="/about/">{interfaceLabel(locale, "Overview")}</Link>
              <Link href="/about/company/">Company profile</Link>
              <Link href="/leadership/">{interfaceLabel(locale, "Leadership")}</Link>
              <Link href="/about/governance/">{interfaceLabel(locale, "Governance")}</Link>
              <Link href="/partner-with-us/">{interfaceLabel(locale, "Partners")}</Link>
              <Link href="/investor-information/">{interfaceLabel(locale, "Investors")}</Link>
              <Link href="/careers/">{interfaceLabel(locale, "Careers")}</Link>
            </AppleFooterNavigation>
          </nav>
          <nav aria-label={interfaceLabel(locale, "Capability links")}>
            <AppleFooterNavigation label={interfaceLabel(locale, "Capabilities")}>
              <Link href="/distribution/">{interfaceLabel(locale, "Distribution")}</Link>
              <Link href="/services/">{interfaceLabel(locale, "Services")}</Link>
              <Link href="/regulatory-services/">{interfaceLabel(locale, "Regulatory & Quality")}</Link>
              <Link href="/cro/">{interfaceLabel(locale, "Clinical Research & CRO")}</Link>
              <Link href="/technology/">{interfaceLabel(locale, "Technology")}</Link>
            </AppleFooterNavigation>
          </nav>
          <nav aria-label={interfaceLabel(locale, "Product links")}>
            <AppleFooterNavigation label={interfaceLabel(locale, "Products")}>
              <Link href="/products/nutraxin/">{interfaceLabel(locale, "Nutraxin")}</Link>
              <Link href="/products/esco/">ESCO Anand</Link>
              <Link href="/products/strategic-portfolio/">{interfaceLabel(locale, "Strategic portfolio")}</Link>
              <Link href="/contact/?enquiry=Product%20opportunity">{interfaceLabel(locale, "Discuss an opportunity")}</Link>
            </AppleFooterNavigation>
          </nav>
          <nav aria-label={interfaceLabel(locale, "Connect links")}>
            <AppleFooterNavigation label={interfaceLabel(locale, "Connect")}>
              <CurrentFooterLink href="/news-insights/">{interfaceLabel(locale, "Insights")}</CurrentFooterLink>
              <Link href="/contact/">{interfaceLabel(locale, "Contact")}</Link>
              <Link href="/account-application/">{interfaceLabel(locale, "Open a business account")}</Link>
              <a href={portalOrigin} rel="nofollow">{interfaceLabel(locale, "Secure Portal")}</a>
              <Link href="/products/track/" lang="en-GB">Check order status</Link>
              <Link href="/products/nutraxin/account/" lang="en-GB">Personal orders &amp; account</Link>
              <a href="mailto:support@novapharmhealthcare.com" lang="en-GB">Customer support</a>
              <Link href="/trust-centre/">{interfaceLabel(locale, "Trust centre")}</Link>
            </AppleFooterNavigation>
          </nav>
        </div>
        <nav className="npd-footer-legal" aria-label={interfaceLabel(locale, "Legal and privacy links")}>
          <Link href="/legal/privacy/">{interfaceLabel(locale, "Privacy")}</Link>
          <Link href="/legal/cookies/">{interfaceLabel(locale, "Cookies")}</Link>
          <Link href="/legal/terms/">{interfaceLabel(locale, "Terms")}</Link>
          <Link href="/legal/accessibility/">{interfaceLabel(locale, "Accessibility")}</Link>
          <CookieSettingsButton />
        </nav>
        <div className="npd-footer-notices footer-notes" lang="en-GB" dir="ltr">
          <p>NovaPharm Healthcare is active in corporate, product, partnership and commercial-development work. Regulated wholesale supply has not commenced and will begin only after the required MHRA authorisations and applicable operating controls are in place. Product-specific parallel-import activity remains subject to the grant and maintenance of the relevant PLPI licence.</p>
          <p>This website is for corporate and qualified B2B information only. NovaPharm does not provide medical advice, sell medicines to patients or invite patient orders. Product and regulatory information is not a substitute for advice from a healthcare professional or the relevant competent authority.</p>
        </div>
        <div className="npd-footer-bottom footer-secondary">
          <p lang="en-GB" dir="ltr">&copy; {new Date().getFullYear()} NovaPharm Healthcare Ltd.</p>
          <a href="https://find-and-update.company-information.service.gov.uk/company/16716501" lang="en-GB" dir="ltr">Registered in England and Wales · 16716501</a>
          <InterfaceLocaleSwitcher locale={locale} />
        </div>
      </div>
    </footer>
  );
}
