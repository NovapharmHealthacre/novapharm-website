import { navigation } from "@/data/site";
import type { InterfaceLocale } from "../../../src/core/interface-locale";
import { Brand } from "./brand";
import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";

const publicNavigation = navigation.filter(([, href]) => href !== "/news-insights/");
const portalOrigin = process.env.PORTAL_ORIGIN ?? "https://portal.novapharmhealthcare.com";

export function SiteHeader({ locale }: Readonly<{ locale: InterfaceLocale }>) {
  return (
    <header className="site-header npd-header" data-site-header>
      <div className="container shell header-inner npd-header-inner">
        <Brand />
        <DesktopNavigation items={publicNavigation} portalOrigin={portalOrigin} locale={locale} />
        <MobileNavigation items={publicNavigation} portalOrigin={portalOrigin} locale={locale} />
      </div>
    </header>
  );
}
