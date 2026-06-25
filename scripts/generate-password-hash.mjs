import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.env.PORTAL_PASSWORD;
if (!password) {
  console.error("Set PORTAL_PASSWORD before running this script.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");

console.log(`PORTAL_PASSWORD_SALT=${salt}`);
console.log(`PORTAL_PASSWORD_HASH=${hash}`);
