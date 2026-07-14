import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const cssPath = join(resolve(process.cwd()), "assets", "css", "visual-refinement.css");
const css = readFileSync(cssPath, "utf8");
const updated = css.replace("letter-spacing: -.035em;", "letter-spacing: 0;");

if (updated === css && css.includes("letter-spacing: -.035em;")) {
  throw new Error("Could not normalise visual headline letter spacing.");
}

writeFileSync(cssPath, updated);
console.log("Visual refinement CSS aligned with the repository typography policy.");
