import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Novapharm Innovation Technology",
    short_name: "NIT",
    description: "Pharmaceutical strategy and execution advisory.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#0b0d10",
    icons: [
      {
        src: "/assets/NIT-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
