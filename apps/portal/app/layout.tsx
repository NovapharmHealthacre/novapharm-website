import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./apple-pharma-portal.css";
import "./nutraxin-order-journey.css";
import "./customer-editorial-dashboard.css";
import "./employee-distribution.css";
import "../../../assets/css/novapharm-hig-colours.css";
import "../../../assets/css/symbol-system.css";
import "../../../assets/css/apple-hig-layout.css";
import "../../../assets/css/novapharm-hig-materials.css";
import "../../../assets/css/novapharm-apple-27-web-adaptation.css";

export const metadata: Metadata = {
  title: "NovaPharm Secure Portal",
  description: "Authorised access to NovaPharm customer, employee, board and administration services.",
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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en-GB" data-np-estate="portal"><body>{children}</body></html>;
}
