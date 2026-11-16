import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "../../../assets/css/novapharm-hig-colours.css";
import "../../../assets/css/symbol-system.css";
import "../../../assets/css/apple-hig-layout.css";
import "../../../assets/css/novapharm-hig-motion.css";
import "../../../assets/css/novapharm-apple-27-web-adaptation.css";
import "../../../assets/css/rtl-localization.css";

import { InterfaceLocaleSwitcher } from "../../../src/components/interface-locale-switcher";
import { directionForLocale, resolveInterfaceLocale } from "../../../src/core/interface-locale";

export const metadata: Metadata = {
  title: "Service Status | NovaPharm Healthcare",
  description: "Sanitised availability information for NovaPharm Healthcare digital services.",
  applicationName: "NovaPharm Service Status",
  robots: { index: false, follow: false, noarchive: true },
  icons: {
    icon: [
      { url: "/assets/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/brand/favicon.ico", sizes: "any" },
    ],
    shortcut: "/assets/brand/favicon.ico",
    apple: "/assets/brand/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = resolveInterfaceLocale((await cookies()).get("np_locale")?.value);
  return <html lang={locale} dir={directionForLocale(locale)} data-np-estate="status"><body>
    <a className="skip-link" href="#status-main">Skip to service status</a>
    <div lang="en-GB" data-np-untranslated>{children}</div>
    <InterfaceLocaleSwitcher locale={locale} />
  </body></html>;
}
