import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { SiteChrome } from "@/components/chrome";
import { JsonLdScript } from "@/components/json-ld";
import { founderPersonSchema, websiteSchema } from "@/lib/seo";
import "./base.css";
import "./evidence.css";
import "../../../assets/css/symbol-system.css";
import "../../../assets/css/apple-hig-layout.css";
import "../../../assets/css/novapharm-hig-motion.css";
import "../../../assets/css/rtl-localization.css";

import { directionForLocale, resolveInterfaceLocale } from "../../../src/core/interface-locale";

export const metadata: Metadata = {
  metadataBase: new URL("https://vishal.novapharmhealthcare.com"),
  applicationName: "Vishal Chakravarty",
  authors: [{ name: "Vishal Chakravarty", url: "https://vishal.novapharmhealthcare.com/about/" }],
  creator: "Vishal Chakravarty",
  publisher: "Vishal Chakravarty",
  formatDetection: { telephone: false, email: false, address: false },
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  manifest: "/manifest.webmanifest",
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
      "application/feed+json": "/feed.json",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0B0E",
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = resolveInterfaceLocale((await cookies()).get("np_locale")?.value);

  return (
    <html className="no-js" lang={locale} dir={directionForLocale(locale)} suppressHydrationWarning>
      <head>
        <script id="founder-javascript-mode" nonce={nonce}>
          {'document.documentElement.classList.remove("no-js");document.documentElement.classList.add("js");'}
        </script>
      </head>
      <body>
        <JsonLdScript data={websiteSchema()} />
        <JsonLdScript data={founderPersonSchema()} />
        <div lang="en-GB" data-np-untranslated>
          <SiteChrome locale={locale}>{children}</SiteChrome>
        </div>
      </body>
    </html>
  );
}
