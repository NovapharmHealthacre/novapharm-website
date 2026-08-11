import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./apple-pharma-portal.css";

export const metadata: Metadata = {
  title: "NovaPharm Secure Portal",
  description: "Authorised access to NovaPharm customer, employee, board and administration services.",
  robots: { index: false, follow: false, noarchive: true },
  icons: { icon: "/assets/brand/novapharm-healthcare-logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
