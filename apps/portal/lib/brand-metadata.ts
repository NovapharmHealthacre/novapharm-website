import type { PortalArea } from "@novapharm/portal-contracts";
import type { Metadata } from "next";

export type NovaPharmBrand = "healthcare" | "distribution" | "intelligence";

/** Route branding never grants authorisation; protected sessions are validated separately. */
export function resolvePortalBrand(host: string, area: PortalArea | null): NovaPharmBrand {
  const hostname = host.trim().toLowerCase().split(":")[0];
  if (hostname === "intelligence.novapharmhealthcare.com") return "intelligence";
  if (area === "employee") return "distribution";
  return "healthcare";
}

const brands = {
  healthcare: {
    title: "NovaPharm Healthcare Secure Portal",
    icon: "/assets/brand/favicon.svg",
    shortcut: "/assets/brand/favicon.ico",
    apple: "/assets/brand/apple-touch-icon.png",
  },
  distribution: {
    title: "NovaPharm Distribution Secure Portal",
    icon: "/assets/brand/novapharm-distribution-favicon.svg",
    shortcut: "/assets/brand/novapharm-distribution-favicon.ico",
    apple: "/assets/brand/novapharm-distribution-apple-touch-icon.png",
  },
  intelligence: {
    title: "NovaPharm Intelligence Secure Portal",
    icon: "/assets/brand/novapharm-intelligence-favicon.svg",
    shortcut: "/assets/brand/novapharm-intelligence-favicon.ico",
    apple: "/assets/brand/novapharm-intelligence-apple-touch-icon.png",
  },
} as const;

/** Separate official favicon and OS touch icon; never broaden indexing or access. */
export function portalBrandMetadata(brand: NovaPharmBrand): Metadata {
  const asset = brands[brand];
  return {
    title: asset.title,
    robots: { index: false, follow: false, noarchive: true },
    icons: {
      icon: [
        { url: asset.icon, type: "image/svg+xml" },
        { url: asset.shortcut, sizes: "any" },
      ],
      shortcut: asset.shortcut,
      apple: asset.apple,
    },
  };
}
