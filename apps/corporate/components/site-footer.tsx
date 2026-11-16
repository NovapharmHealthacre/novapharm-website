import Link from "next/link";
import { company } from "@/data/site";
import { InterfaceLocaleSwitcher } from "../../../src/components/interface-locale-switcher";
import { type InterfaceLocale, interfaceLabel } from "../../../src/core/interface-locale";
import { AppleFooterNavigation } from "./apple-footer-navigation";
import { AppStoreAvailability } from "./app-store-availability";
import { Brand } from "./brand";
import { CookieSettingsButton } from "./cookie-controls";

export function SiteFooter({ locale }: Readonly<{ locale: InterfaceLocale }>) {
  return (
    <footer className="site-footer apple-corporate-footer">
      <div className="shell footer-notes" lang="en-GB" dir="ltr">
        <p>Active UK company. Regulated wholesale supply has not commenced and remains subject to applicable authorisation.</p>
        <p>Corporate and qualified B2B information only. No patient ordering or medical advice.</p>
      </div>
      <div className="shell footer-primary">
        <div className="footer-brand">
          <Brand footer />
          <p lang="en-GB" dir="ltr">A UK-based B2B pharmaceutical company preparing regulated sourcing, market-access and distribution capabilities.</p>
          <AppStoreAvailability />
        </div>
        <nav aria-label={interfaceLabel(locale, "Company links")}>
          <AppleFooterNavigation label={interfaceLabel(locale, "Company")}>
            <Link href="/about/">{interfaceLabel(locale, "About")}</Link>
            <Link href="/leadership/">{interfaceLabel(locale, "Leadership")}</Link>
            <Link href="/about/governance/">{interfaceLabel(locale, "Governance")}</Link>
            <Link href="/careers/">{interfaceLabel(locale, "Careers")}</Link>
          </AppleFooterNavigation>
        </nav>
        <nav aria-label={interfaceLabel(locale, "Capability links")}>
          <AppleFooterNavigation label={interfaceLabel(locale, "Capabilities")}>
            <Link href="/services/">{interfaceLabel(locale, "Services")}</Link>
            <Link href="/regulatory-services/">{interfaceLabel(locale, "Regulatory")}</Link>
            <Link href="/cro/">{interfaceLabel(locale, "CRO support")}</Link>
            <Link href="/oncology/">{interfaceLabel(locale, "Oncology")}</Link>
            <Link href="/technology/">{interfaceLabel(locale, "Technology")}</Link>
          </AppleFooterNavigation>
        </nav>
        <nav aria-label={interfaceLabel(locale, "Product links")}>
          <AppleFooterNavigation label={interfaceLabel(locale, "Products")}>
            <Link href="/products/nutraxin/">{interfaceLabel(locale, "Nutraxin")}</Link>
            <Link href="/products/strategic-portfolio/">{interfaceLabel(locale, "Strategic portfolio")}</Link>
          </AppleFooterNavigation>
        </nav>
        <nav aria-label={interfaceLabel(locale, "Legal links")}>
          <AppleFooterNavigation label={interfaceLabel(locale, "Legal")}>
            <Link href="/trust-centre/">{interfaceLabel(locale, "Trust centre")}</Link>
            <Link href="/legal/privacy/">{interfaceLabel(locale, "Privacy")}</Link>
            <Link href="/legal/cookies/">{interfaceLabel(locale, "Cookies")}</Link>
            <Link href="/legal/terms/">{interfaceLabel(locale, "Terms")}</Link>
            <Link href="/legal/accessibility/">{interfaceLabel(locale, "Accessibility")}</Link>
            <CookieSettingsButton />
          </AppleFooterNavigation>
        </nav>
      </div>
      <div className="shell footer-secondary">
        <p lang="en-GB" dir="ltr">&copy; {new Date().getFullYear()} {company.legalName}. Company number {company.companyNumber}.</p>
        <InterfaceLocaleSwitcher locale={locale} />
      </div>
    </footer>
  );
}
