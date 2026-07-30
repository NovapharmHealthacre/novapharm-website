import type { Metadata, Viewport } from "next";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/data/site";
import { parentOrganisationSchema, technologyOrganisationSchema, technologyWebsiteSchema } from "@/lib/seo";

const environment = process.env as { PUBLIC_INDEXABLE?: string };
const indexable = environment.PUBLIC_INDEXABLE !== "false";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <JsonLd id="technology-organisation-schema" value={technologyOrganisationSchema()} />
        <JsonLd id="technology-website-schema" value={technologyWebsiteSchema()} />
        <JsonLd id="parent-organisation-schema" value={parentOrganisationSchema()} />
      </body>
    </html>
  );
}
