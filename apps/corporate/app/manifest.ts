import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NovaPharm Healthcare",
    short_name: "NovaPharm",
    description: "Compliance-first B2B pharmaceutical market-access and supply infrastructure.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#E3120B",
    icons: [
      { src: "/assets/brand/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/brand/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/brand/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
