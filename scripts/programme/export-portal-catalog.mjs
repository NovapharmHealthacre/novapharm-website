import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { portalModules } from "../../src/core/portal-module-catalog.mjs";

const output = resolve("packages/portal-contracts/src/module-catalog.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(portalModules, null, 2)}\n`);
console.log(`Exported ${portalModules.length} governed portal modules.`);
