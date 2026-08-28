import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import sharp from "sharp";

const baseUrl = process.env.CORPORATE_PRINT_BASE_URL ?? "http://127.0.0.1:4178";
const artifactRoot = path.resolve(process.env.CORPORATE_PRINT_ARTIFACT_ROOT ?? "tmp/pdfs/corporate-print");
const pdfInfoBinary = process.env.PDFINFO_BIN ?? "pdfinfo";
const pdfToPpmBinary = process.env.PDFTOPPM_BIN ?? "pdftoppm";

const routes = Object.freeze([
  ["home", "/"],
  ["company", "/about/"],
  ["services", "/services/"],
  ["regulatory", "/regulatory-services/"],
  ["cro", "/cro/"],
  ["oncology", "/oncology/"],
  ["products", "/products/"],
  ["partners", "/partner-with-us/"],
  ["technology", "/technology/"],
  ["insights", "/news-insights/"],
  ["contact", "/contact/"],
  ["account", "/account-application/"],
]);

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${binary} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function parsePageCount(pdfInfo) {
  const pages = Number.parseInt(pdfInfo.match(/^Pages:\s+(\d+)$/mu)?.[1] ?? "", 10);
  if (!Number.isInteger(pages) || pages < 1) throw new Error(`Unable to parse PDF page count from:\n${pdfInfo}`);
  return pages;
}

async function inspectRenderedPage(imagePath) {
  const { data, info } = await sharp(imagePath)
    .flatten({ background: "#ffffff" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let inkPixels = 0;
  let darkPixels = 0;
  for (const value of data) {
    if (value < 245) inkPixels += 1;
    if (value < 210) darkPixels += 1;
  }
  return {
    width: info.width,
    height: info.height,
    inkPixels,
    darkPixels,
    inkRatio: Number((inkPixels / data.length).toFixed(6)),
  };
}

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });

const browser = await chromium.launch({ headless: true });
const records = [];

try {
  const context = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });

  for (const [slug, route] of routes) {
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    if (!response?.ok()) throw new Error(`${route} returned ${response?.status()}`);

    const rejectConsent = page.locator("[data-consent-action='reject']:visible").first();
    if (await rejectConsent.count()) await rejectConsent.click();

    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const image of document.images) {
        if (image.loading === "lazy") image.loading = "eager";
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, { timeout: 15_000 });
    await page.evaluate(() => window.scrollTo(0, 0));

    const semanticState = await page.evaluate(() => ({
      bodyCharacters: document.body.innerText.trim().length,
      h1Count: document.querySelectorAll("main h1").length,
      mainCharacters: document.querySelector("main")?.textContent?.trim().length ?? 0,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      title: document.title,
    }));
    if (semanticState.h1Count !== 1) throw new Error(`${route} has ${semanticState.h1Count} main H1 elements`);
    if (semanticState.mainCharacters < 180) throw new Error(`${route} has insufficient printable main content`);
    if (semanticState.horizontalOverflow) throw new Error(`${route} has horizontal overflow before printing`);

    await page.emulateMedia({ media: "print", colorScheme: "light", reducedMotion: "reduce" });
    const printState = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      const forbiddenSelectors = [
        ".site-header",
        ".site-footer",
        ".mobile-menu",
        ".cookie-banner",
        ".preference-backdrop",
        "next-route-announcer",
        ".final-cta",
        ".npd-header",
        ".npd-local-nav",
        ".npd-range-nav",
        ".npd-actions",
        ".npd-footer-top",
        ".npd-footer-legal",
        ".skip-link",
        ".cookie-dialog",
        "[data-cookie-banner]",
      ];
      const visibleForbidden = forbiddenSelectors.filter((selector) => [...document.querySelectorAll(selector)].some(visible));
      const fixedOrSticky = [...document.querySelectorAll("body *")]
        .filter(visible)
        .filter((element) => ["fixed", "sticky"].includes(getComputedStyle(element).position))
        .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${[...element.classList].join(".")}` : ""}`)
        .slice(0, 20);
      const hiddenEvidenceDetails = [...document.querySelectorAll(".evidence-details-body")].filter((element) => !visible(element)).length;
      const clippedEvidenceDetails = [...document.querySelectorAll(".evidence-details")].filter((element) => {
        const summary = element.querySelector("summary");
        const body = element.querySelector(".evidence-details-body");
        if (!summary || !body) return true;
        return element.getBoundingClientRect().height + 1 < summary.getBoundingClientRect().height + body.getBoundingClientRect().height;
      }).length;
      return { visibleForbidden, fixedOrSticky, hiddenEvidenceDetails, clippedEvidenceDetails };
    });
    if (printState.visibleForbidden.length) {
      throw new Error(`${route} exposes print-hidden UI: ${printState.visibleForbidden.join(", ")}`);
    }
    if (printState.fixedOrSticky.length) {
      throw new Error(`${route} retains fixed/sticky print UI: ${printState.fixedOrSticky.join(", ")}`);
    }
    if (printState.hiddenEvidenceDetails) {
      throw new Error(`${route} hides ${printState.hiddenEvidenceDetails} evidence detail sections in print`);
    }
    if (printState.clippedEvidenceDetails) {
      throw new Error(`${route} clips ${printState.clippedEvidenceDetails} evidence detail sections in print`);
    }

    const pdfPath = path.join(artifactRoot, `${slug}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
    });

    const pdfBuffer = await readFile(pdfPath);
    const pageCount = parsePageCount(run(pdfInfoBinary, [pdfPath]));
    const renderDirectory = path.join(artifactRoot, "rendered", slug);
    await mkdir(renderDirectory, { recursive: true });
    const renderPrefix = path.join(renderDirectory, "page");
    run(pdfToPpmBinary, ["-png", "-r", "72", pdfPath, renderPrefix]);
    const renderedFiles = (await readdir(renderDirectory))
      .filter((filename) => filename.endsWith(".png"))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    if (renderedFiles.length !== pageCount) {
      throw new Error(`${route} rendered ${renderedFiles.length} pages but pdfinfo reported ${pageCount}`);
    }

    const pageMetrics = [];
    for (const filename of renderedFiles) {
      const metrics = await inspectRenderedPage(path.join(renderDirectory, filename));
      if (metrics.inkPixels < 250 || metrics.darkPixels < 80) {
        throw new Error(`${route} contains a blank or near-blank PDF page: ${filename}`);
      }
      pageMetrics.push({ filename, ...metrics });
    }

    records.push({
      route,
      title: semanticState.title,
      pageCount,
      byteSize: pdfBuffer.length,
      sha256: createHash("sha256").update(pdfBuffer).digest("hex"),
      semanticState,
      printState,
      pages: pageMetrics,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const generatedAt = new Date().toISOString();
const manifest = { generatedAt, baseUrl, routeCount: routes.length, records };
await writeFile(path.join(artifactRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  path.join(artifactRoot, "manifest.md"),
  `# Corporate print acceptance\n\nGenerated: ${generatedAt}\n\n| Route | Pages | Bytes | SHA-256 |\n| --- | ---: | ---: | --- |\n${records.map((record) => `| \`${record.route}\` | ${record.pageCount} | ${record.byteSize.toLocaleString("en-GB")} | \`${record.sha256}\` |`).join("\n")}\n`,
);

console.log(`Corporate print acceptance passed for ${records.length} routes. Evidence: ${artifactRoot}`);
