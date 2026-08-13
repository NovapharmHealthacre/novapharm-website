import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./apple-pharma-portal.css";

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
  return <html lang="en-GB"><body>{children}</body></html>;
}
