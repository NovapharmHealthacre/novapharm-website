import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vishal Chakravarty",
    short_name: "Vishal C.",
    description:
      "The professional platform of Vishal Chakravarty, Chief Executive Officer of NovaPharm Healthcare Ltd.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0E",
    theme_color: "#0B0B0E",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
