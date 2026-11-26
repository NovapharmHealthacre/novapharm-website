import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "./concise.css";
import "./apple-pharma.css";
import "./compact-fixes.css";
import "../../../assets/css/contact-premium.css";
import "./print.css";
import "./homepage-editorial.css";
import "./oncology-editorial.css";
import "./design-system.css";
import "../../../assets/css/capabilities-editorial.css";
import "./capabilities-route.css";
import "../../../assets/css/nutraxin-lineup.css";
import "../../../assets/css/nutraxin-order-access.css";
import "../../../assets/css/novapharm-hig-colours.css";
import "../../../assets/css/symbol-system.css";
import "../../../assets/css/apple-hig-layout.css";
import "../../../assets/css/novapharm-hig-materials.css";
import "../../../assets/css/novapharm-apple-27-web-adaptation.css";
import "../../../assets/css/novapharm-hig-motion.css";
import "../../../assets/css/rtl-localization.css";
import "../../../assets/css/apple-web-navigation.css";
import "./corporate-mega-menu.css";
import { CookieControls } from "@/components/cookie-controls";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { company } from "@/data/site";
import { organisationSchema, siteUrl, websiteSchema } from "@/lib/seo";

const indexable = process.env.PUBLIC_INDEXABLE !== "false";

import { directionForLocale, resolveInterfaceLocale } from "../../../src/core/interface-locale";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NovaPharm Healthcare | UK Pharmaceutical Distribution Strategy",
  description: company.summary,
  applicationName: company.name,
  authors: [{ name: "NovaPharm Healthcare Editorial Team" }],
  creator: company.name,
  publisher: company.legalName,
  category: "Pharmaceuticals",
  icons: {
    icon: [
      { url: "/assets/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/assets/brand/favicon.ico", sizes: "any" },
    ],
    shortcut: "/assets/brand/favicon.ico",
    apple: "/assets/brand/apple-touch-icon.png",
  },
  robots: {
    index: indexable,
    follow: indexable,
    googleBot: { index: indexable, follow: indexable, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#FFFFFF",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = resolveInterfaceLocale((await cookies()).get("np_locale")?.value);
  return (
    <html lang={locale} dir={directionForLocale(locale)} data-np-estate="corporate">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader locale={locale} />
        <CookieControls />
        <main id="main-content" lang="en-GB" data-np-untranslated tabIndex={-1}>{children}</main>
        <SiteFooter locale={locale} />
        <JsonLd id="organisation-schema" value={organisationSchema()} />
        <JsonLd id="website-schema" value={websiteSchema()} />
      </body>
    </html>
  );
}
