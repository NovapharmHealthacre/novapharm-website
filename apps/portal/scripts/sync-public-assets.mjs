import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const brandTarget = path.resolve("public/assets/brand");
await rm(brandTarget, { recursive: true, force: true });
await mkdir(brandTarget, { recursive: true });
await cp(path.join(repositoryRoot, "assets/brand"), brandTarget, { recursive: true });

// The approved portal photograph is decorative, public and separate from the
// governed medicinal datasets. Copy it into the standalone Next.js build.
const humanHeroTarget = path.resolve("public/assets/media/portal");
await mkdir(humanHeroTarget, { recursive: true });
await cp(
  path.join(repositoryRoot, "assets/media/portal/npi-human-portal.webp"),
  path.join(humanHeroTarget, "npi-human-portal.webp"),
);
await cp(
  path.join(repositoryRoot, "assets/media/portal/npi-human-portrait-hd.avif"),
  path.join(humanHeroTarget, "npi-human-portrait-hd.avif"),
);
await cp(
  path.join(repositoryRoot, "assets/media/portal/npi-human-portrait-approved.webp"),
  path.join(humanHeroTarget, "npi-human-portrait-approved.webp"),
);

/* Founder visual assets are local first-party photographs, not mock capability data. */
const founderTarget = path.resolve("public/assets/media/founder");
await mkdir(founderTarget, { recursive: true });
for (const [source, output] of [
  ["assets/media/technology/novapharm-intelligence-hero.avif", "hero-editorial.avif"],
  ["assets/media/modules/product-portfolio-evidence-960.jpg", "medicine.jpg"],
  ["assets/media/modules/technology-traceability-960.jpg", "market.jpg"],
  ["assets/media/about/novapharm-warehouse-original.jpg", "supply.jpg"],
  ["assets/media/modules/careers-specialist-team-960.jpg", "biotech.jpg"],
  ["assets/media/modules/investors-capital-readiness-960.jpg", "decisions.jpg"],
]) {
  await cp(path.join(repositoryRoot, source), path.join(founderTarget, output));
}

console.log("Portal brand, founder editorial photography and approved public hero assets synchronised.");
