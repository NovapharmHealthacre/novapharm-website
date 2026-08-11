import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./concise.css";
import "./apple-pharma.css";
import "./compact-fixes.css";
import { CookieControls } from "@/components/cookie-controls";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { company } from "@/data/site";
import { organisationSchema, siteUrl, websiteSchema } from "@/lib/seo";

const indexable = process.env.PUBLIC_INDEXABLE !== "false";

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
    icon: [{ url: "/assets/brand/novapharm-healthcare-logo.svg", type: "image/svg+xml" }],
    shortcut: "/assets/brand/novapharm-healthcare-logo.svg",
    apple: "/assets/brand/novapharm-healthcare-logo.png",
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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <CookieControls />
        <JsonLd id="organisation-schema" value={organisationSchema()} />
        <JsonLd id="website-schema" value={websiteSchema()} />
      </body>
    </html>
  );
}
