import { pbkdf2Sync, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [outputInput = "artifacts/browser-runtime", portInput = "4178"] = process.argv.slice(2);
const outputRoot = resolve(outputInput);
const port = Number(portInput);

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Browser-validation port must be an integer from 1024 to 65535.");
}

mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
chmodSync(outputRoot, 0o700);

const username = "Vishal";
const password = `Aa1!${randomBytes(30).toString("base64url")}`;
const salt = randomBytes(16).toString("hex");
const hash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
const origin = `http://127.0.0.1:${port}`;
const serverEnvironmentPath = resolve(outputRoot, "server.env");
const credentialsPath = resolve(outputRoot, "credentials.json");

const serverEnvironment = {
  NODE_ENV: "test",
  BROWSER_VALIDATION_MODE: "true",
  HOST: "127.0.0.1",
  PORT: String(port),
  PUBLIC_ORIGIN: origin,
  PUBLIC_API_ORIGIN: origin,
  SITE_URL: origin,
  DATABASE_PATH: resolve(outputRoot, "visual-validation.sqlite"),
  DOCUMENT_STORAGE_ROOT: resolve(outputRoot, "documents"),
  SECURE_CONTENT_ROOT: resolve(process.cwd(), "_secure"),
  EMAIL_PROVIDER: "local-capture",
  EMAIL_FROM: "NovaPharm Validation <no-reply@example.invalid>",
  CONTACT_NOTIFICATION_TO: "owner-validation@example.invalid",
  SESSION_SECRET: randomBytes(48).toString("base64url"),
  PORTAL_USERNAME: username,
  PORTAL_DISPLAY_NAME: "Vishal Chakravarty",
  PORTAL_PASSWORD_SALT: salt,
  PORTAL_PASSWORD_HASH: hash,
  PORTAL_MUST_CHANGE_PASSWORD: "false"
};

const environmentBody = `${Object.entries(serverEnvironment)
  .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
  .join("\n")}\n`;

writeFileSync(serverEnvironmentPath, environmentBody, { mode: 0o600, flag: "wx" });
writeFileSync(credentialsPath, `${JSON.stringify({ username, password })}\n`, { mode: 0o600, flag: "wx" });
chmodSync(serverEnvironmentPath, 0o600);
chmodSync(credentialsPath, 0o600);

console.log(JSON.stringify({
  origin,
  serverEnvironmentPath,
  credentialsPath,
  note: "Synthetic credentials generated without printing their values."
}));
