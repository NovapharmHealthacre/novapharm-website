import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import {
  createPersistentSession,
  getPersistentSession,
  portalUsersFromEnvironment,
  provisionAuthUsers,
  verifyCredentials
} from "../src/core/auth-service.mjs";

const phase = process.argv[2];
const statePath = process.env.SESSION_RESTART_STATE_PATH;
if (!statePath) throw new Error("SESSION_RESTART_STATE_PATH is required.");
provisionAuthUsers(portalUsersFromEnvironment(process.env, { isProduction: true }));

if (phase === "create") {
  const user = verifyCredentials(process.env.PORTAL_USERNAME, process.env.TEST_PORTAL_PASSWORD);
  if (!user) throw new Error("Test identity could not authenticate.");
  const session = createPersistentSession(user, "board", 60 * 60 * 1000);
  writeFileSync(statePath, session.id, { mode: 0o600 });
  chmodSync(statePath, 0o600);
} else if (phase === "verify") {
  const session = getPersistentSession(readFileSync(statePath, "utf8").trim());
  if (!session || !session.accessScopes.includes("admin")) throw new Error("Persistent session did not survive the process restart.");
} else {
  throw new Error("Unknown restart-test phase.");
}
