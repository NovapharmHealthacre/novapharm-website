import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const repositoryRoot = resolve(process.cwd());
const argumentsList = process.argv.slice(2);
const prepareOnly = argumentsList.includes("--prepare-only");
const runtimeRoot = resolve(argumentsList.find((value) => !value.startsWith("--")) || "/private/tmp/novapharm-pr10-browser-runtime");
const environmentPath = join(runtimeRoot, "server.env");
const credentialsPath = join(runtimeRoot, "credentials.json");
const pidPath = join(runtimeRoot, "server.pid");
const logPath = join(runtimeRoot, "server.log");

if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error(`Node.js 24 is required. Current runtime: ${process.version}.`);
if (!runtimeRoot.startsWith("/private/tmp/")) throw new Error("Browser validation runtime must remain under /private/tmp.");
mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
chmodSync(runtimeRoot, 0o700);

function run(script, label, additions = {}) {
  const result = spawnSync(process.execPath, [join(repositoryRoot, "scripts", script)], {
    cwd: repositoryRoot,
    env: { ...validationEnvironment, ...additions },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) throw new Error(`${label} failed. ${String(result.stderr || result.stdout || "").trim()}`);
  return result.stdout.trim();
}

if (!existsSync(environmentPath) || !existsSync(credentialsPath)) {
  const created = spawnSync(process.execPath, [join(repositoryRoot, "scripts", "create-browser-validation-environment.mjs"), runtimeRoot, "4178"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (created.status !== 0) throw new Error(`Browser validation environment creation failed. ${String(created.stderr || created.stdout || "").trim()}`);
}

function readEnvironment() {
  const values = {};
  for (const line of readFileSync(environmentPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator);
    const raw = line.slice(separator + 1);
    try { values[name] = JSON.parse(raw); }
    catch { values[name] = raw; }
  }
  return values;
}

const validationEnvironment = {
  ...process.env,
  ...readEnvironment(),
  BROWSER_VALIDATION_MODE: "true",
  DATABASE_PROVIDER: "sqlite",
  DOCUMENT_STORAGE_PROVIDER: "local-validation"
};
for (const name of [
  "RESEND_API_KEY", "MICROSOFT_TENANT_ID", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET",
  "MICROSOFT_CERTIFICATE_PRIVATE_KEY", "MICROSOFT_EMAIL_SENDER", "SHAREPOINT_HOSTNAME",
  "SHAREPOINT_SITE_PATH", "SHAREPOINT_SITE_ID", "SHAREPOINT_DRIVE_ID", "SHAREPOINT_FOLDER_PATH",
  "AZURE_STORAGE_ACCOUNT_NAME", "AZURE_STORAGE_CONNECTION_STRING", "APPLICATIONINSIGHTS_CONNECTION_STRING",
  "APPINSIGHTS_CONNECTION_STRING", "PORTAL_PASSWORD", "PORTAL_USERS_JSON"
]) delete validationEnvironment[name];

function runningPid() {
  if (!existsSync(pidPath)) return null;
  const pid = Number(readFileSync(pidPath, "utf8").trim());
  if (!Number.isInteger(pid) || pid < 2) return null;
  try { process.kill(pid, 0); return pid; }
  catch { return null; }
}

async function ready() {
  try {
    const response = await fetch("http://127.0.0.1:4178/api/ready", { signal: AbortSignal.timeout(1200) });
    return response.ok && (await response.json()).ready === true;
  } catch {
    return false;
  }
}

const existingPid = runningPid();
if (existingPid && await ready()) {
  console.log(JSON.stringify({ status: "already_running", url: "http://127.0.0.1:4178", credentialsPath, pid: existingPid }));
  process.exit(0);
}
rmSync(pidPath, { force: true });

run("build-site.mjs", "Validation build", { PUBLIC_API_ORIGIN: "" });
run("initialise-browser-validation.mjs", "Validation database initialisation");
run(join("local-portal", "seed.mjs"), "Base synthetic scenario seed");
run("import-nutraxin-catalogue.mjs", "Nutraxin validation import");
run(join("local-portal", "seed-enterprise-scenarios.mjs"), "Enterprise scenario seed");

if (prepareOnly) {
  console.log(JSON.stringify({ status: "prepared", url: "http://127.0.0.1:4178", credentialsPath, data: "synthetic_only" }));
  process.exit(0);
}

const logDescriptor = openSync(logPath, "a", 0o600);
chmodSync(logPath, 0o600);
const child = spawn(process.execPath, [join(repositoryRoot, "server.mjs")], {
  cwd: repositoryRoot,
  env: validationEnvironment,
  detached: true,
  stdio: ["ignore", logDescriptor, logDescriptor]
});
closeSync(logDescriptor);
writeFileSync(pidPath, `${child.pid}\n`, { mode: 0o600 });
chmodSync(pidPath, 0o600);
child.unref();

const started = Date.now();
while (Date.now() - started < 30000 && !await ready()) await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
if (!await ready()) {
  try { process.kill(child.pid, "SIGTERM"); } catch {}
  rmSync(pidPath, { force: true });
  const tail = existsSync(logPath) ? readFileSync(logPath, "utf8").split(/\r?\n/).slice(-20).join("\n") : "No log was created.";
  throw new Error(`Browser validation server did not become ready.\n${tail}`);
}

console.log(JSON.stringify({ status: "ready", url: "http://127.0.0.1:4178", credentialsPath, pid: child.pid, data: "synthetic_only" }));
