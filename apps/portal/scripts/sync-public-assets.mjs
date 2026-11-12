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
console.log("Portal brand and approved public hero assets synchronised.");
