import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/run-browser-acceptance.mjs");
await import(`${pathToFileURL(sourcePath).href}?release=${Date.now()}`);
