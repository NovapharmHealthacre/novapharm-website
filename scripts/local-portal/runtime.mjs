import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const ownerUsername = "vishal@novapharmhealthcare.com";
export const ownerDisplayName = "Vishal Chakravarty";
export const localHost = "127.0.0.1";
export const localPort = 4173;
export const localOrigin = `http://${localHost}:${localPort}`;

const defaultRuntimeRoot = join(homedir(), "Library", "Application Support", "NovaPharm", "local-portal");
export const runtimeRoot = resolve(process.env.NOVAPHARM_LOCAL_PORTAL_ROOT || defaultRuntimeRoot);

export const runtimePaths = Object.freeze({
  root: runtimeRoot,
  environment: join(runtimeRoot, "portal.env"),
  database: join(runtimeRoot, "novapharm-local.sqlite"),
  backupRoot: join(runtimeRoot, "backups"),
  documentRoot: join(runtimeRoot, "documents"),
  secureContentRoot: join(repositoryRoot, "_secure"),
  credentials: join(dirname(runtimeRoot), "local-portal-credentials.txt"),
  credentialsLauncher: join(dirname(runtimeRoot), "show-local-portal-credentials.command"),
  pid: join(runtimeRoot, "novapharm-local.pid"),
  log: join(runtimeRoot, "novapharm-local.log")
});

export function isWithin(parent, candidate) {
  const fromParent = relative(resolve(parent), resolve(candidate));
  return fromParent === "" || (!fromParent.startsWith("..") && !isAbsolute(fromParent));
}

export function assertSafeRuntimePath(candidate) {
  const applicationSupportRoot = resolve(join(homedir(), "Library", "Application Support", "NovaPharm"));
  if (!isWithin(applicationSupportRoot, candidate)) {
    throw new Error("The local portal runtime path must remain inside ~/Library/Application Support/NovaPharm.");
  }
  return resolve(candidate);
}

export function ensureRuntimeDirectories() {
  for (const directory of [runtimePaths.root, runtimePaths.backupRoot, runtimePaths.documentRoot, dirname(runtimePaths.credentials)]) {
    assertSafeRuntimePath(directory);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
  }
}

export function secureRandomPassword() {
  return `N9!${randomBytes(30).toString("base64url")}zA`;
}

export function runtimeEnvironment() {
  return {
    NODE_ENV: "development",
    LOCAL_PORTAL_MODE: "true",
    HOST: localHost,
    PORT: String(localPort),
    SITE_URL: localOrigin,
    PUBLIC_ORIGIN: localOrigin,
    PUBLIC_API_ORIGIN: localOrigin,
    DATABASE_PROVIDER: "sqlite",
    DATABASE_PATH: runtimePaths.database,
    DATABASE_BACKUP_ROOT: runtimePaths.backupRoot,
    DOCUMENT_STORAGE_PROVIDER: "local-validation",
    DOCUMENT_STORAGE_ROOT: runtimePaths.documentRoot,
    LOCAL_VALIDATION_SCAN_RESULT: "clean",
    SECURE_CONTENT_ROOT: runtimePaths.secureContentRoot,
    SESSION_SECRET: randomBytes(48).toString("base64url"),
    SESSION_TTL_MS: String(8 * 60 * 60 * 1000),
    SESSION_IDLE_TIMEOUT_MS: String(30 * 60 * 1000),
    EMAIL_PROVIDER: "local-capture",
    EMAIL_FROM: "NovaPharm Local Validation <no-send@local.novapharm.invalid>",
    CONTACT_NOTIFICATION_TO: "owner-review@local.novapharm.invalid",
    ENTRA_AUTH_ENABLED: "false",
    PREVIEW_MODE: "false",
    LOCAL_BOOTSTRAP_CREDENTIAL_FILE: runtimePaths.credentials,
    LOCAL_BOOTSTRAP_DISPLAY_SCRIPT: runtimePaths.credentialsLauncher
  };
}

function envLine(name, value) {
  return `${name}=${JSON.stringify(String(value))}`;
}

export function writeEnvironmentFile(environment) {
  ensureRuntimeDirectories();
  const body = `${Object.entries(environment).map(([name, value]) => envLine(name, value)).join("\n")}\n`;
  atomicWrite(runtimePaths.environment, body, 0o600);
}

export function readEnvironmentFile() {
  if (!existsSync(runtimePaths.environment)) return null;
  const environment = {};
  for (const line of readFileSync(runtimePaths.environment, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator);
    const raw = line.slice(separator + 1);
    try { environment[name] = JSON.parse(raw); }
    catch { environment[name] = raw; }
  }
  return environment;
}

export function writeCredentialHandoff(password) {
  const body = [
    "NovaPharm Healthcare local owner portal",
    "LOCAL VALIDATION ONLY — synthetic data; no production services",
    "",
    `Portal URL: ${localOrigin}/portal/`,
    `Portal ID: ${ownerUsername}`,
    `Temporary password: ${password}`,
    "",
    "The first login requires a password change. This file is deleted automatically after that change succeeds.",
    "Do not copy this password into email, chat, documentation, source code or screenshots.",
    `Generated: ${new Date().toISOString()}`,
    ""
  ].join("\n");
  atomicWrite(runtimePaths.credentials, body, 0o600);

  const launcher = [
    "#!/bin/zsh",
    "clear",
    "printf '\\nNovaPharm protected local credential handoff\\n\\n'",
    `cat ${shellQuote(runtimePaths.credentials)}`,
    "printf '\\nClose this Terminal window after signing in.\\n'",
    "read -r '?Press Return to close this protected handoff: '",
    ""
  ].join("\n");
  atomicWrite(runtimePaths.credentialsLauncher, launcher, 0o700);
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

export function atomicWrite(path, content, mode = 0o600) {
  assertSafeRuntimePath(path);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, content, { mode, flag: "wx" });
  chmodSync(temporary, mode);
  renameSync(temporary, path);
  chmodSync(path, mode);
}

export function readPid() {
  if (!existsSync(runtimePaths.pid)) return null;
  const pid = Number(readFileSync(runtimePaths.pid, "utf8").trim());
  return Number.isInteger(pid) && pid > 1 ? pid : null;
}

export function processIsRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function assertProtectedFile(path, expectedMode) {
  const mode = statSync(path).mode & 0o777;
  if (mode !== expectedMode) throw new Error(`${path} must use mode ${expectedMode.toString(8)}.`);
}
