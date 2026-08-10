import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

for (const name of ["novapharm-healthcare-logo.svg", "novapharm-healthcare-logo.png"]) {
  const source = resolve(process.cwd(), "../../assets/brand", name);
  const destination = resolve(process.cwd(), "public/assets/brand", name);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

console.log("Status brand assets synchronised from the approved repository masters.");
