import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Service Status | NovaPharm Healthcare",
  description: "Sanitised availability information for NovaPharm Healthcare digital services.",
  applicationName: "NovaPharm Service Status",
  robots: { index: false, follow: false, noarchive: true },
  icons: {
    icon: "/assets/brand/novapharm-healthcare-logo.svg",
    apple: "/assets/brand/novapharm-healthcare-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en-GB"><body><a className="skip-link" href="#status-main">Skip to service status</a>{children}</body></html>;
}
