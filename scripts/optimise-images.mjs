import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const source = resolve(process.env.NOVAPHARM_HERO_SOURCE || resolve(root, "assets/media/home/supply-network-hero-source.png"));
const variants = [
  { path: "assets/media/home/supply-network-hero.jpg", width: 1672, height: 941, quality: 82 },
  { path: "assets/media/home/supply-network-hero-1200.jpg", width: 1200, height: 675, quality: 80 }
];

if (!existsSync(source)) {
  throw new Error("Missing protected hero authoring master. Set NOVAPHARM_HERO_SOURCE to its local path; the source is intentionally excluded from Git.");
}
if (process.platform !== "darwin") {
  throw new Error("This authoring task uses macOS sips as the repository's loss-controlled image encoder. Generated production variants are committed, so deployment does not run this script.");
}

for (const variant of variants) {
  const target = resolve(root, variant.path);
  mkdirSync(dirname(target), { recursive: true });
  const result = spawnSync("sips", [
    "-z", String(variant.height), String(variant.width),
    "-s", "format", "jpeg",
    "-s", "formatOptions", String(variant.quality),
    source,
    "--out", target
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Failed to create ${variant.path}`);
  console.log(`Created ${variant.path}`);
}
