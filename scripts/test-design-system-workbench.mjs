import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "playwright";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workbench = join(root, "packages/design-system/workbench/index.html");
const evidenceRoot = join(root, "audit/evidence/design-system");
const baselineRoot = join(evidenceRoot, "baselines");
const update = process.argv.includes("--update");
const engines = [{ name: "chromium", launcher: chromium }, { name: "webkit", launcher: webkit }];
const viewports = [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }];
const selectors = ["#direction-a", "#direction-b", "#direction-c", "#component-workbench"];

await access(workbench);
await mkdir(baselineRoot, { recursive: true });

const contentTypes = new Map([[".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".svg", "image/svg+xml"], [".jpg", "image/jpeg"], [".png", "image/png"], [".webp", "image/webp"], [".avif", "image/avif"]]);
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    const filePath = resolve(root, `.${pathname}`);
    if (!filePath.startsWith(`${root}/`)) throw new Error("Path is outside the workbench root.");
    response.writeHead(200, { "Content-Type": contentTypes.get(extname(filePath)) ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});
await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
assert.ok(address && typeof address === "object");
const workbenchUrl = `http://127.0.0.1:${address.port}/packages/design-system/workbench/index.html`;

async function compareImages(actualPath, baselinePath) {
  const [actual, baseline] = await Promise.all([
    sharp(actualPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(baselinePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  assert.deepEqual(actual.info, baseline.info, `Visual dimensions changed for ${baselinePath}`);
  let changed = 0;
  for (let index = 0; index < actual.data.length; index += 4) {
    const difference = Math.max(
      Math.abs((actual.data[index] ?? 0) - (baseline.data[index] ?? 0)),
      Math.abs((actual.data[index + 1] ?? 0) - (baseline.data[index + 1] ?? 0)),
      Math.abs((actual.data[index + 2] ?? 0) - (baseline.data[index + 2] ?? 0)),
      Math.abs((actual.data[index + 3] ?? 0) - (baseline.data[index + 3] ?? 0)),
    );
    if (difference > 18) changed += 1;
  }
  const pixels = actual.info.width * actual.info.height;
  return { changedPixels: changed, changedRatio: changed / pixels, pixels };
}

const results = [];
try {
  for (const engine of engines) {
    const browser = await engine.launcher.launch({ headless: true });
    try {
      for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      await page.goto(workbenchUrl, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, `${engine.name}/${viewport.name} has horizontal overflow: ${JSON.stringify(overflow)}`);

      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      assert.equal(axe.violations.length, 0, `${engine.name}/${viewport.name} accessibility violations:\n${axe.violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n")}`);
      assert.deepEqual(consoleErrors, [], `${engine.name}/${viewport.name} emitted browser errors.`);
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
      await page.addStyleTag({ content: ".np-skip-link{display:none!important}" });

      for (const selector of selectors) {
        const safeSelector = selector.replace("#", "");
        const actualPath = join(evidenceRoot, `${engine.name}-${viewport.name}-${safeSelector}.png`);
        const baselinePath = join(baselineRoot, `${engine.name}-${viewport.name}-${safeSelector}.png`);
        await page.locator(selector).screenshot({ path: actualPath, animations: "disabled" });
        if (update) {
          await writeFile(baselinePath, await readFile(actualPath));
        }
        await access(baselinePath);
        const comparison = await compareImages(actualPath, baselinePath);
        assert.ok(comparison.changedRatio <= 0.005, `${engine.name}/${viewport.name}/${safeSelector} changed ${(comparison.changedRatio * 100).toFixed(3)}%.`);
        const digest = createHash("sha256").update(await readFile(actualPath)).digest("hex");
        results.push({ engine: engine.name, viewport, selector, file: actualPath.slice(root.length + 1), sha256: digest, ...comparison, accessibilityViolations: 0, horizontalOverflow: false });
      }
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: update ? "baseline-updated-and-compared" : "compared-with-committed-baseline",
  source: "packages/design-system/workbench/index.html",
  engines: engines.map((engine) => engine.name),
  viewports,
  componentFamilies: 24,
  creativeDirections: 3,
  results,
};
await writeFile(join(evidenceRoot, "visual-regression-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Design-system browser acceptance passed: ${results.length} screenshots, two engines, zero axe violations and no horizontal overflow.`);
