import {
  chmodSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import {
  assertProtectedFile,
  ensureRuntimeDirectories,
  localOrigin,
  ownerDisplayName,
  ownerUsername,
  processIsRunning,
  readEnvironmentFile,
  readPid,
  repositoryRoot,
  runtimeEnvironment,
  runtimePaths,
  secureRandomPassword,
  writeCredentialHandoff,
  writeEnvironmentFile
} from "./runtime.mjs";

const argumentsSet = new Set(process.argv.slice(2));
const noOpen = argumentsSet.has("--no-open") || process.env.NOVAPHARM_LOCAL_NO_OPEN === "true";
const noCredentialWindow = argumentsSet.has("--no-credentials-window") || process.env.NOVAPHARM_LOCAL_NO_CREDENTIAL_WINDOW === "true";

function isolatedEnvironment(environment, additions = {}) {
  const isolated = { ...process.env, ...environment, ...additions };
  for (const name of [
    "RESEND_API_KEY", "MICROSOFT_TENANT_ID", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET",
    "MICROSOFT_CERTIFICATE_PRIVATE_KEY", "MICROSOFT_EMAIL_SENDER", "SHAREPOINT_HOSTNAME",
    "SHAREPOINT_SITE_PATH", "SHAREPOINT_SITE_ID", "SHAREPOINT_DRIVE_ID", "SHAREPOINT_FOLDER_PATH",
    "AZURE_STORAGE_ACCOUNT_NAME", "AZURE_STORAGE_CONNECTION_STRING", "APPLICATIONINSIGHTS_CONNECTION_STRING",
    "APPINSIGHTS_CONNECTION_STRING", "PORTAL_PASSWORD", "PORTAL_PASSWORD_HASH", "PORTAL_PASSWORD_SALT",
    "PORTAL_USERS_JSON"
  ]) delete isolated[name];
  return isolated;
}

function runNode(script, environment, label) {
  const result = spawnSync(process.execPath, [script], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    const safeError = String(result.stderr || result.stdout || `${label} failed.`).replace(/BOOTSTRAP_ADMIN_PASSWORD=.*/g, "BOOTSTRAP_ADMIN_PASSWORD=[redacted]");
    throw new Error(`${label} failed. ${safeError.trim()}`);
  }
  return result.stdout.trim();
}

function validateNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major !== 24) throw new Error(`Node.js 24 is required. Current runtime: ${process.version}.`);
}

function validateEnvironment(environment) {
  const required = ["LOCAL_PORTAL_MODE", "HOST", "PORT", "PUBLIC_ORIGIN", "DATABASE_PATH", "DOCUMENT_STORAGE_ROOT", "SECURE_CONTENT_ROOT", "SESSION_SECRET", "EMAIL_PROVIDER"];
  for (const name of required) if (!environment[name]) throw new Error(`Local runtime setting ${name} is missing.`);
  if (environment.LOCAL_PORTAL_MODE !== "true" || environment.HOST !== "127.0.0.1" || environment.PORT !== "4173") {
    throw new Error("The local portal must bind only to 127.0.0.1:4173.");
  }
  if (environment.PUBLIC_ORIGIN !== localOrigin || environment.EMAIL_PROVIDER !== "local-capture") {
    throw new Error("The local portal origin or local email-capture provider is invalid.");
  }
}

function ensureDependencies() {
  if (existsSync(join(repositoryRoot, "node_modules", "dotenv", "package.json"))) return;
  const npm = join(dirname(process.execPath), "npm");
  const command = existsSync(npm) ? npm : "npm";
  const result = spawnSync(command, ["ci", "--ignore-scripts"], { cwd: repositoryRoot, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error("Dependency installation failed. Check the network connection and run npm ci --ignore-scripts.");
}

function openLocally(target) {
  const child = spawn("open", [target], { detached: true, stdio: "ignore" });
  child.unref();
}

async function health(path, timeoutMs = 1200) {
  try {
    const response = await fetch(`${localOrigin}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  } catch {
    return { ok: false, status: 0, body: {} };
  }
}

async function waitForReady(child, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) break;
    const live = await health("/api/live");
    const ready = await health("/api/ready");
    if (live.ok && ready.ok && ready.body.ready) return ready.body;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const logTail = existsSync(runtimePaths.log) ? readFileSync(runtimePaths.log, "utf8").split(/\r?\n/).slice(-20).join("\n") : "No runtime log was created.";
  throw new Error(`The local portal did not become ready.\n${logTail}`);
}

export async function startLocalPortal() {
  validateNode();
  ensureRuntimeDirectories();

  const existingPid = readPid();
  if (processIsRunning(existingPid)) {
    const ready = await health("/api/ready");
    if (!ready.ok) throw new Error("A local portal process is running but is not ready. Run npm run portal:local:stop, then start it again.");
    if (!noOpen) openLocally(`${localOrigin}/portal/`);
    console.log(JSON.stringify({ status: "already_running", url: `${localOrigin}/portal/`, pid: existingPid }));
    return;
  }
  rmSync(runtimePaths.pid, { force: true });

  ensureDependencies();
  let environment = readEnvironmentFile();
  if (!environment) {
    environment = runtimeEnvironment();
    writeEnvironmentFile(environment);
  }
  validateEnvironment(environment);
  assertProtectedFile(runtimePaths.environment, 0o600);

  const baseEnvironment = isolatedEnvironment(environment);
  runNode(join(repositoryRoot, "scripts", "build-site.mjs"), { ...baseEnvironment, PUBLIC_API_ORIGIN: "" }, "Local portal build");

  let firstBootstrap = false;
  if (!existsSync(runtimePaths.database)) {
    firstBootstrap = true;
    const temporaryPassword = secureRandomPassword();
    writeCredentialHandoff(temporaryPassword);
    assertProtectedFile(runtimePaths.credentials, 0o600);
    assertProtectedFile(runtimePaths.credentialsLauncher, 0o700);
    runNode(join(repositoryRoot, "scripts", "local-portal", "initialise.mjs"), isolatedEnvironment(environment, {
      PORTAL_USERNAME: ownerUsername,
      PORTAL_DISPLAY_NAME: ownerDisplayName,
      BOOTSTRAP_ADMIN_PASSWORD: temporaryPassword
    }), "Local portal initialisation");
  } else {
    runNode(join(repositoryRoot, "scripts", "local-portal", "seed.mjs"), baseEnvironment, "Synthetic local data refresh");
  }

  const logDescriptor = openSync(runtimePaths.log, "a", 0o600);
  chmodSync(runtimePaths.log, 0o600);
  const child = spawn(process.execPath, [join(repositoryRoot, "server.mjs")], {
    cwd: repositoryRoot,
    env: baseEnvironment,
    detached: true,
    stdio: ["ignore", logDescriptor, logDescriptor]
  });
  closeSync(logDescriptor);
  writeFileSync(runtimePaths.pid, `${child.pid}\n`, { mode: 0o600 });
  chmodSync(runtimePaths.pid, 0o600);
  child.unref();

  try {
    const ready = await waitForReady(child);
    if (firstBootstrap && !noCredentialWindow) openLocally(runtimePaths.credentialsLauncher);
    if (!noOpen) openLocally(`${localOrigin}/portal/`);
    console.log(JSON.stringify({
      status: "ready",
      url: `${localOrigin}/portal/`,
      pid: child.pid,
      environment: ready.environment,
      database: ready.database,
      identity: ready.identity,
      email: ready.email,
      documentStorage: ready.documentStorage,
      firstBootstrap,
      credentialHandoff: firstBootstrap
        ? noCredentialWindow ? "protected_file_created_not_opened" : "opened_in_protected_local_terminal"
        : "not_required"
    }));
  } catch (error) {
    try { process.kill(child.pid, "SIGTERM"); } catch {}
    rmSync(runtimePaths.pid, { force: true });
    throw error;
  }
}

await startLocalPortal();
