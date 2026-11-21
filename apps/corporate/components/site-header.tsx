import { navigation } from "@/data/site";
import type { InterfaceLocale } from "../../../src/core/interface-locale";
import { Brand } from "./brand";
import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";

const portalOrigin = process.env.PORTAL_ORIGIN ?? "https://portal.novapharmhealthcare.com";

export function SiteHeader({ locale }: Readonly<{ locale: InterfaceLocale }>) {
  return (
    <header className="site-header npd-header" data-site-header>
      <div className="container shell header-inner npd-header-inner">
        <Brand />
        <DesktopNavigation items={navigation} portalOrigin={portalOrigin} locale={locale} />
        <MobileNavigation items={navigation} portalOrigin={portalOrigin} locale={locale} />
      </div>
    </header>
  );
}
