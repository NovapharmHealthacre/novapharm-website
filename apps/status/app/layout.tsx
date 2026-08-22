import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en-GB"><body><a className="skip-link" href="#status-main">Skip to service status</a>{children}</body></html>;
}
