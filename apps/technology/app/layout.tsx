import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import "../../../assets/css/novapharm-hig-colours.css";
import "../../../assets/css/symbol-system.css";
import "../../../assets/css/apple-hig-layout.css";
import "../../../assets/css/novapharm-hig-materials.css";
import "../../../assets/css/novapharm-hig-motion.css";
import "../../../assets/css/novapharm-apple-27-web-adaptation.css";
import "../../../assets/css/rtl-localization.css";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/data/site";
import { parentOrganisationSchema, technologyOrganisationSchema, technologyWebsiteSchema } from "@/lib/seo";

const environment = process.env as { PUBLIC_INDEXABLE?: string };
const indexable = environment.PUBLIC_INDEXABLE !== "false";

import { directionForLocale, resolveInterfaceLocale } from "../../../src/core/interface-locale";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Novapharm Innovation Technology | Pharmaceutical Strategy & Execution Advisory",
    template: "%s | Novapharm Innovation Technology",
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  category: "Pharmaceutical consulting",
  icons: {
    icon: [{ url: "/assets/NIT-logo.svg", type: "image/svg+xml" }],
    shortcut: "/assets/NIT-logo.svg",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: site.url,
    siteName: site.name,
    title: "Novapharm Innovation Technology | Pharmaceutical Strategy & Execution Advisory",
    description: site.description,
  },
  twitter: {
    card: "summary",
    title: "Novapharm Innovation Technology",
    description: site.description,
  },
  robots: {
    index: indexable,
    follow: indexable,
    googleBot: {
      index: indexable,
      follow: indexable,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = resolveInterfaceLocale((await cookies()).get("np_locale")?.value);

  return (
    <html className="no-js" lang={locale} dir={directionForLocale(locale)} data-np-estate="technology" suppressHydrationWarning>
      <head>
        <script id="technology-javascript-mode" nonce={nonce}>
          {'document.documentElement.classList.remove("no-js");document.documentElement.classList.add("js");'}
        </script>
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader locale={locale} />
        <main id="main-content" lang="en-GB" data-np-untranslated>{children}</main>
        <SiteFooter locale={locale} />
        <JsonLd id="technology-organisation-schema" value={technologyOrganisationSchema()} />
        <JsonLd id="technology-website-schema" value={technologyWebsiteSchema()} />
        <JsonLd id="parent-organisation-schema" value={parentOrganisationSchema()} />
      </body>
    </html>
  );
}
