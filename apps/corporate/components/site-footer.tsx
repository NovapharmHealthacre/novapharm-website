import { interfaceLabel, type InterfaceLocale } from "../../../src/core/interface-locale";
import Link from "next/link";
import { company } from "@/data/site";
import { AppStoreAvailability } from "./app-store-availability";
import { Brand } from "./brand";
import { CookieSettingsButton } from "./cookie-controls";

export function SiteFooter({ locale }: Readonly<{ locale: InterfaceLocale }>) {
  return (
    <footer className="site-footer">
      <div className="shell footer-primary">
        <div className="footer-brand">
          <Brand footer />
          <p>A UK-based B2B pharmaceutical company preparing regulated sourcing, market-access and distribution capabilities.</p>
          <p className="footer-status">Active UK company. Regulated wholesale supply has not commenced and remains subject to applicable authorisation.</p>
          <AppStoreAvailability />
        </div>
        <nav aria-label="Company links"><strong>{interfaceLabel(locale, "Company")}</strong><Link href="/about/">{interfaceLabel(locale, "About")}</Link><Link href="/leadership/">{interfaceLabel(locale, "Leadership")}</Link><Link href="/about/governance/">{interfaceLabel(locale, "Governance")}</Link><Link href="/careers/">{interfaceLabel(locale, "Careers")}</Link></nav>
        <nav aria-label="Capability links"><strong>{interfaceLabel(locale, "Capabilities")}</strong><Link href="/services/">{interfaceLabel(locale, "Services")}</Link><Link href="/regulatory-services/">{interfaceLabel(locale, "Regulatory")}</Link><Link href="/cro/">CRO support</Link><Link href="/oncology/">{interfaceLabel(locale, "Oncology")}</Link><Link href="/technology/">{interfaceLabel(locale, "Technology")}</Link></nav>
        <nav aria-label="Legal links"><strong>{interfaceLabel(locale, "Legal")}</strong><Link href="/trust-centre/">{interfaceLabel(locale, "Trust centre")}</Link><Link href="/legal/privacy/">{interfaceLabel(locale, "Privacy")}</Link><Link href="/legal/cookies/">{interfaceLabel(locale, "Cookies")}</Link><Link href="/legal/terms/">{interfaceLabel(locale, "Terms")}</Link><Link href="/legal/accessibility/">{interfaceLabel(locale, "Accessibility")}</Link><CookieSettingsButton /></nav>
      </div>
      <div className="shell footer-secondary">
        <p>&copy; {new Date().getFullYear()} {company.legalName}. Company number {company.companyNumber}.</p>
        <p>Corporate and qualified B2B information only. No patient ordering or medical advice.</p>
      </div>
    </footer>
  );
}
