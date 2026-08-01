import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") return reject(new Error("An ephemeral test port could not be allocated."));
      probe.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitUntilLive(origin: string, child: ChildProcess): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    if (child.exitCode !== null) throw new Error(`The API process stopped before becoming ready with exit code ${child.exitCode}.`);
    try {
      const response = await fetch(`${origin}/api/health/live`, { signal: AbortSignal.timeout(800) });
      if (response.ok) return;
    } catch {
      // The process is still initialising its isolated validation database.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The API-only service did not become live within 20 seconds.");
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => child.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

test("the extracted runtime exposes only the governed API boundary", { timeout: 30_000 }, async () => {
  const repositoryRoot = path.resolve(process.cwd(), "../..");
  const port = await availablePort();
  const runId = `${process.pid}-${Date.now()}`;
  const databasePath = `/tmp/novapharm-api-boundary-${runId}.sqlite`;
  const documentRoot = `/tmp/novapharm-api-boundary-documents-${runId}`;
  const secureRoot = `/tmp/novapharm-api-boundary-secure-${runId}`;
  const salt = randomBytes(16).toString("hex");
  const syntheticPassword = `Aa1!${randomBytes(32).toString("base64url")}`;
  const apiOrigin = `http://127.0.0.1:${port}`;
  const portalOrigin = "http://127.0.0.1:4303";
  const environment = { ...process.env };
  for (const name of ["PORTAL_PASSWORD", "BOOTSTRAP_ADMIN_PASSWORD", "PORTAL_USERS_JSON", "RESEND_API_KEY", "MICROSOFT_CLIENT_SECRET"]) delete environment[name];
  Object.assign(environment, {
    NODE_ENV: "test",
    NODE_NO_WARNINGS: "1",
    HOST: "127.0.0.1",
    PORT: String(port),
    PUBLIC_ORIGIN: "http://127.0.0.1:4300",
    PUBLIC_API_ORIGIN: apiOrigin,
    PORTAL_ORIGIN: portalOrigin,
    SITE_URL: "http://127.0.0.1:4300",
    DATABASE_PROVIDER: "sqlite",
    DATABASE_PATH: databasePath,
    DOCUMENT_STORAGE_ROOT: documentRoot,
    SECURE_CONTENT_ROOT: secureRoot,
    SESSION_SECRET: randomBytes(40).toString("base64url"),
    PORTAL_USERNAME: "BoundaryAdmin",
    PORTAL_DISPLAY_NAME: "Boundary Administrator",
    PORTAL_PASSWORD_SALT: salt,
    PORTAL_PASSWORD_HASH: pbkdf2Sync(syntheticPassword, salt, 210_000, 32, "sha256").toString("hex"),
  });

  const child = spawn(process.execPath, ["--import", "tsx", "apps/api/src/server.ts"], {
    cwd: repositoryRoot,
    env: environment,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let errors = "";
  child.stderr?.on("data", (chunk) => { errors += String(chunk); });

  try {
    await waitUntilLive(apiOrigin, child);

    const live = await fetch(`${apiOrigin}/api/health/live`);
    assert.equal(live.status, 200);
    assert.equal((await live.json()).service, "novapharm-api");
    assert.match(live.headers.get("x-robots-tag") ?? "", /noindex/);

    const root = await fetch(apiOrigin);
    assert.equal(root.status, 404);
    assert.deepEqual(await root.json(), { error: "Not found." });
    assert.match(root.headers.get("content-type") ?? "", /application\/json/);
    assert.match(root.headers.get("x-robots-tag") ?? "", /noindex/);

    const publicAsset = await fetch(`${apiOrigin}/assets/brand/novapharm-healthcare-logo.svg`);
    assert.equal(publicAsset.status, 404);
    assert.match(publicAsset.headers.get("content-type") ?? "", /application\/json/);

    const robots = await fetch(`${apiOrigin}/robots.txt`);
    assert.equal(robots.status, 200);
    assert.equal(await robots.text(), "User-agent: *\nDisallow: /\n");

    const allowed = await fetch(`${apiOrigin}/api/security/csrf`, { headers: { Origin: portalOrigin } });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("access-control-allow-origin"), portalOrigin);
    assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");

    const preflight = await fetch(`${apiOrigin}/api/auth/login`, {
      method: "OPTIONS",
      headers: { Origin: portalOrigin, "Access-Control-Request-Method": "POST" },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), portalOrigin);

    const rejected = await fetch(`${apiOrigin}/api/security/csrf`, { headers: { Origin: "https://untrusted.example.test" } });
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json()).code, "origin_rejected");
    assert.equal(rejected.headers.get("access-control-allow-origin"), null);
  } finally {
    await stop(child);
    rmSync(databasePath, { force: true });
    rmSync(documentRoot, { recursive: true, force: true });
    rmSync(secureRoot, { recursive: true, force: true });
  }

  assert.equal(errors, "", `The API-only service wrote unexpected errors:\n${errors}`);
});
