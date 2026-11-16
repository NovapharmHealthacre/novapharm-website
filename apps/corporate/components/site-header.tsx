import { interfaceLabel, type InterfaceLocale } from "../../../src/core/interface-locale";
import { navigation } from "@/data/site";
import { Brand } from "./brand";
import { MobileNavigation } from "./mobile-navigation";

const portalOrigin = process.env.PORTAL_ORIGIN ?? "https://portal.novapharmhealthcare.com";

export function SiteHeader({ locale }: Readonly<{ locale: InterfaceLocale }>) {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label={interfaceLabel(locale, "Primary navigation")}>
          {navigation.map(([label, href]) => href === "/portal/" ? <a key={href} href={portalOrigin} rel="nofollow">{interfaceLabel(locale, label)}</a> : <a key={href} href={href}>{interfaceLabel(locale, label)}</a>)}
        </nav>
        <MobileNavigation items={navigation} portalOrigin={portalOrigin} locale={locale} />
      </div>
    </header>
  );
}
