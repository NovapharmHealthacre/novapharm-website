import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const target = path.resolve("public/assets/brand");
await mkdir(target, { recursive: true });
for (const file of ["novapharm-healthcare-logo.svg", "novapharm-healthcare-logo.png"]) {
  await cp(path.join(repositoryRoot, "assets/brand", file), path.join(target, file));
}
console.log("Portal brand assets synchronised from the approved repository masters.");
