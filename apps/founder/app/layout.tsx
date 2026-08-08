import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { SiteChrome } from "@/components/chrome";
import { JsonLdScript } from "@/components/json-ld";
import { founderPersonSchema, websiteSchema } from "@/lib/seo";
import "./base.css";
import "./evidence.css";

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
  themeColor: "#0d0d0f",
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html className="no-js" lang="en-GB" suppressHydrationWarning>
      <head>
        <Script id="founder-javascript-mode" nonce={nonce} strategy="beforeInteractive">
          {'document.documentElement.classList.remove("no-js");document.documentElement.classList.add("js");'}
        </Script>
      </head>
      <body>
        <JsonLdScript data={websiteSchema()} />
        <JsonLdScript data={founderPersonSchema()} />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
