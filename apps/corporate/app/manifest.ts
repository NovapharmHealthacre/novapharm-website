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
    theme_color: "#9D1B32",
    shortcuts: [
      { name: "Browse Products", short_name: "Products", description: "Explore NovaPharm public product ranges", url: "/products/" },
      { name: "Contact NovaPharm", short_name: "Contact", description: "Send a public business enquiry", url: "/contact/" },
    ],
    icons: [
      { src: "/assets/brand/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/brand/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/brand/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
