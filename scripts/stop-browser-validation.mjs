import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { assertBrowserValidationRoot, defaultBrowserValidationRoot } from "./browser-validation-runtime.mjs";

const runtimeRoot = assertBrowserValidationRoot(process.argv[2] || defaultBrowserValidationRoot);
const pidPath = join(runtimeRoot, "server.pid");
if (!existsSync(pidPath)) {
  console.log(JSON.stringify({ status: "not_running" }));
  process.exit(0);
}

const pid = Number(readFileSync(pidPath, "utf8").trim());
if (Number.isInteger(pid) && pid > 1) {
  try { process.kill(pid, "SIGTERM"); } catch {}
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try { process.kill(pid, 0); await new Promise((resolvePromise) => setTimeout(resolvePromise, 200)); }
    catch { break; }
  }
}
rmSync(pidPath, { force: true });
console.log(JSON.stringify({ status: "stopped" }));
