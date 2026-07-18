import { all, closeDatabase, one } from "../../src/data/database.mjs";
import { provisionBootstrapAdmin } from "../../src/core/auth-service.mjs";
import { seedLocalPortalData } from "./seed-data.mjs";
import { ownerDisplayName, ownerUsername } from "./runtime.mjs";

if (process.env.LOCAL_PORTAL_MODE !== "true" || process.env.HOST !== "127.0.0.1") {
  throw new Error("Local portal initialisation requires LOCAL_PORTAL_MODE=true and HOST=127.0.0.1.");
}

const bootstrap = await provisionBootstrapAdmin(process.env, {
  requireCompromiseCheck: false,
  fetchImplementation: null
});
if (bootstrap.status !== "created") throw new Error("The local owner bootstrap identity was not created.");

const seed = await seedLocalPortalData();
const user = await one("SELECT username, display_name, role, status FROM users WHERE lower(username) = lower(?)", ownerUsername);
const scopes = (await all("SELECT scope FROM auth_user_scopes WHERE username = ? ORDER BY scope", user?.username)).map((row) => row.scope);
const credential = await one("SELECT must_change_password, credential_source FROM auth_credentials WHERE username = ?", user?.username);

if (!user || user.display_name !== ownerDisplayName || user.role !== "admin" || user.status !== "active") {
  throw new Error("The local owner profile did not initialise correctly.");
}
if (scopes.join(",") !== "admin,board,customer,employee") {
  throw new Error("The local owner profile does not have all required scopes.");
}
if (!credential?.must_change_password || credential.credential_source !== "bootstrap") {
  throw new Error("The local owner bootstrap credential is not marked for first-login replacement.");
}

await closeDatabase();
console.log(JSON.stringify({
  status: "initialised",
  username: ownerUsername,
  role: user.role,
  scopes,
  mustChangePassword: true,
  syntheticCounts: seed.counts
}));
