import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const runtimeRoot = resolve(process.argv[2] || "/private/tmp/novapharm-pr10-browser-runtime");
const pidPath = join(runtimeRoot, "server.pid");
if (!runtimeRoot.startsWith("/private/tmp/")) throw new Error("Browser validation runtime must remain under /private/tmp.");
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
