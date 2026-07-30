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
    theme_color: "#ffffff",
    icons: [{ src: "/assets/brand/novapharm-healthcare-logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
