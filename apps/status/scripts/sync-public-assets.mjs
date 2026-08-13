import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.cwd(), "../../assets/brand");
const destination = resolve(process.cwd(), "public/assets/brand");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });

console.log("Status brand assets synchronised from the approved repository masters.");
