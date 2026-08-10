import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createApiRuntimeConfig } from "./runtime-config.js";

const applicationDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(applicationDirectory, "../../..");

process.chdir(repositoryRoot);
process.env["NOVAPHARM_SERVER_MODE"] = "api-only";
createApiRuntimeConfig(process.env);

const runtime = (await import(pathToFileURL(join(repositoryRoot, "server.mjs")).href)) as {
  startNovaPharmServer: () => unknown;
};

runtime.startNovaPharmServer();
