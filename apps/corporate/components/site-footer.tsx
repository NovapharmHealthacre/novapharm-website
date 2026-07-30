import Link from "next/link";
import { company } from "@/data/site";
import { Brand } from "./brand";
import { CookieSettingsButton } from "./cookie-controls";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-primary">
        <div className="footer-brand">
          <Brand footer />
          <p>A UK-based B2B pharmaceutical company preparing regulated sourcing, market-access and distribution capabilities.</p>
          <p className="footer-status">Pre-operational for regulated wholesale supply. Subject to applicable authorisation.</p>
        </div>
        <nav aria-label="Company links"><strong>Company</strong><Link href="/about/">About</Link><Link href="/leadership/">Leadership</Link><Link href="/about/governance/">Governance</Link><Link href="/careers/">Careers</Link></nav>
        <nav aria-label="Capability links"><strong>Capabilities</strong><Link href="/services/">Services</Link><Link href="/regulatory-services/">Regulatory</Link><Link href="/cro/">CRO support</Link><Link href="/oncology/">Oncology</Link><Link href="/technology/">Technology</Link></nav>
        <nav aria-label="Legal links"><strong>Legal</strong><Link href="/legal/privacy/">Privacy</Link><Link href="/legal/cookies/">Cookies</Link><Link href="/legal/terms/">Terms</Link><Link href="/legal/accessibility/">Accessibility</Link><CookieSettingsButton /></nav>
      </div>
      <div className="shell footer-secondary">
        <p>&copy; {new Date().getFullYear()} {company.legalName}. Company number {company.companyNumber}.</p>
        <p>Corporate and qualified B2B information only. No patient ordering or medical advice.</p>
      </div>
    </footer>
  );
}
