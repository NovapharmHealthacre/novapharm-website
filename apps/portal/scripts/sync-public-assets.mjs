import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const target = path.resolve("public/assets/brand");
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(path.join(repositoryRoot, "assets/brand"), target, { recursive: true });
console.log("Portal brand assets synchronised from the approved repository masters.");
