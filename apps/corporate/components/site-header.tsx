import Link from "next/link";
import { navigation } from "@/data/site";
import { Brand } from "./brand";
import { MobileNavigation } from "./mobile-navigation";

const portalOrigin = process.env.PORTAL_ORIGIN ?? "https://portal.novapharmhealthcare.com";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => href === "/portal/" ? <a key={href} href={portalOrigin} rel="nofollow">{label}</a> : <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <MobileNavigation items={navigation} portalOrigin={portalOrigin} />
      </div>
    </header>
  );
}
