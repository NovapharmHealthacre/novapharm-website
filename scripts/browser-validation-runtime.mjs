import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

export const defaultBrowserValidationRoot = process.platform === "darwin"
  ? "/private/tmp/novapharm-pr10-browser-runtime"
  : join(tmpdir(), "novapharm-pr10-browser-runtime");

function within(root, candidate) {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot !== "" && !pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot);
}

function allowedRoots() {
  const roots = [tmpdir(), "/private/tmp"];
  if (process.env.GITHUB_ACTIONS === "true" && process.env.RUNNER_TEMP) roots.push(process.env.RUNNER_TEMP);
  return [...new Set(roots.map((root) => resolve(root)))];
}

export function assertBrowserValidationRoot(input) {
  const candidate = resolve(input);
  const roots = allowedRoots();
  if (!roots.some((root) => within(root, candidate))) {
    throw new Error("Browser validation runtime must remain inside an approved operating-system temporary directory.");
  }

  if (existsSync(candidate)) {
    const realCandidate = realpathSync(candidate);
    const realRoots = roots.filter(existsSync).map((root) => realpathSync(root));
    if (!realRoots.some((root) => within(root, realCandidate))) {
      throw new Error("Browser validation runtime resolved outside an approved temporary directory.");
    }
  }
  return candidate;
}
