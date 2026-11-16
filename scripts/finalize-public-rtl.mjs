/**
 * Final release-only RTL interface wiring.
 *
 * Public static pages are regenerated and rewritten by multiple governed
 * editorial/commerce passes. Apply the preview bootstrap AFTER those passes
 * and BEFORE the source-SHA stamp, without touching approved copy, protected
 * data, privacy choices, or the GitHub Pages safety boundary.
 *
 * Only files within the public artifact's allowlisted route families are
 * considered. Authenticated portal routes and private/generated workspaces
 * are deliberately excluded.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const publicRtlDirectories = Object.freeze([
  "about", "account-application", "capabilities", "careers", "contact",
  "cro", "distribution", "investor-information", "leadership", "legal",
  "market-access", "markets", "news-insights", "oncology", "partner-with-us",
  "products", "product-portfolio", "regulatory-services",
  "service-unavailable", "services", "technology", "trust-centre",
]);
const rootFiles = Object.freeze(["index.html", "404.html", "500.html", "portal/index.html"]);
const rtlScript = '<script src="/assets/js/rtl-localization.js"></script>';
const rtlStylesheet = '<link rel="stylesheet" href="/assets/css/rtl-localization.css">';

function* collectHtml(base, directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const file = join(directory, entry.name);
    if (entry.isDirectory()) yield* collectHtml(base, file);
    else if (entry.isFile() && file.endsWith(".html")) yield file;
  }
}

export function publicRtlFiles(root = process.cwd()) {
  const base = resolve(root);
  const paths = new Set();
  for (const name of rootFiles) {
    const file = join(base, name);
    if (existsSync(file)) paths.add(file);
  }
  for (const name of publicRtlDirectories) {
    for (const file of collectHtml(base, join(base, name))) paths.add(file);
  }
  return [...paths].sort();
}

export function finalizePublicRtlArtifacts(root = process.cwd()) {
  const files = publicRtlFiles(root);
  if (files.length < 50) throw new Error("Refusing to finalize an incomplete public RTL estate");
  let updated = 0;
  for (const file of files) {
    const original = readFileSync(file, "utf8");
    if (!/<head\b[^>]*>/i.test(original) || !/<\/head>/i.test(original)) {
      throw new Error("Public page missing HTML head: " + file);
    }
    if (!/<main\b[^>]*>/i.test(original)) {
      throw new Error("Public page missing main landmark: " + file);
    }
    let html = original;
    if (!html.includes(rtlScript)) {
      html = html.replace(/<head\b[^>]*>/i, (head) => head + "\n  " + rtlScript);
    }
    // The shared bundle already contains the exact RTL rules. Legacy pages
    // with a separate stylesheet still need the shared RTL stylesheet.
    if (!/href=["']\/assets\/css\/novapharm\.bundle\.css(?:\?[^"']*)?["']/i.test(html) &&
        !html.includes(rtlStylesheet)) {
      html = html.replace(/<\/head>/i, "  " + rtlStylesheet + "\n</head>");
    }
    html = html.replace(/<main\b[^>]*>/i, (main) => {
      let tag = main;
      if (!/\blang\s*=/i.test(tag)) tag = tag.slice(0, -1) + ' lang="en-GB">';
      if (!/\bdata-np-untranslated(?:\s|=|>)/i.test(tag)) {
        tag = tag.slice(0, -1) + " data-np-untranslated>";
      }
      return tag;
    });
    if (html !== original) {
      writeFileSync(file, html, "utf8");
      updated += 1;
    }
  }
  console.log("RTL public artifact finalized: " + files.length + " pages, " + updated + " updated.");
  return { total: files.length, updated };
}

export function validatePublicRtlArtifacts(root = process.cwd()) {
  const base = resolve(root);
  const script = join(base, "assets/js/rtl-localization.js");
  const css = join(base, "assets/css/rtl-localization.css");
  if (!existsSync(script) || !existsSync(css)) {
    throw new Error("RTL bootstrap or CSS missing from staged public artifact");
  }
  const files = publicRtlFiles(root);
  if (files.length < 50) throw new Error("RTL public release covers fewer than 50 pages");
  for (const file of files) {
    const html = readFileSync(file, "utf8");
    const scriptCount = html.split(rtlScript).length - 1;
    if (scriptCount !== 1) throw new Error("Exactly one RTL bootstrap required in " + file);
    const main = html.match(/<main\b[^>]*>/i)?.[0] ?? "";
    if (!/\blang="en-GB"/i.test(main) || !/\bdata-np-untranslated\b/i.test(main)) {
      throw new Error("Untranslated English main landmark not annotated in " + file);
    }
    if (!/href=["']\/assets\/css\/(?:novapharm\.bundle|rtl-localization)\.css/i.test(html)) {
      throw new Error("RTL style entrypoint missing in " + file);
    }
  }
  return { total: files.length, valid: files.length };
}
