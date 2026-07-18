import { rmSync } from "node:fs";
import { processIsRunning, readPid, runtimePaths } from "./runtime.mjs";

const pid = readPid();
if (!processIsRunning(pid)) {
  rmSync(runtimePaths.pid, { force: true });
  console.log(JSON.stringify({ status: "not_running" }));
  process.exit(0);
}

process.kill(pid, "SIGTERM");
const deadline = Date.now() + 10000;
while (processIsRunning(pid) && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 200));
}
if (processIsRunning(pid)) throw new Error("The local portal did not stop cleanly. No force-stop was attempted.");
rmSync(runtimePaths.pid, { force: true });
console.log(JSON.stringify({ status: "stopped", pid }));
