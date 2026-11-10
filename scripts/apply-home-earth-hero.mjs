import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// The earlier public-page parity pass intentionally replaces the homepage.
// Restore the approved real-Earth art direction *after* all page generators,
// while preserving the validated commercial pathways and footer boundaries.
const path = resolve(process.cwd(), "index.html");
const html = readFileSync(path, "utf8");
const previousHero = /<section class="pharma-home-hero">[\s\S]*?<\/section>/g;
const matches = html.match(previousHero) ?? [];
if (matches.length !== 1 || !html.includes('id="commercial-pathways"')) {
  throw new Error("Approved Earth homepage: expected one generated hero and preserved commercial pathways.");
}
const approvedHero = `<section class="npd-apple-hero nph-earth-hero" aria-labelledby="nph-earth-title">
  <div class="container nph-earth-layout">
    <div class="nph-earth-copy">
      <p class="nph-earth-eyebrow">NOVAPHARM HEALTHCARE</p>
      <h1 id="nph-earth-title">Medicine.<br>Where it needs to be.</h1>
      <p class="nph-earth-lead">A better way to understand, access and move medicine.</p>
      <div class="nph-earth-actions">
        <a class="nph-earth-primary" href="/about/">Explore NovaPharm</a>
        <a class="nph-earth-secondary" href="/partner-with-us/">Partner with us</a>
      </div>
      <p class="nph-earth-status">Regulated wholesale supply has not commenced.</p>
    </div>
    <figure class="nph-earth-visual">
      <img src="/assets/media/home/earth-reference-1400.jpg" alt="Morning light above the curved horizon of Earth" loading="eager" decoding="async" fetchpriority="high">
    </figure>
  </div>
</section>`;
const next = html
  .replace(previousHero, approvedHero)
  .replace(/<link rel="preload" as="image" href="\/assets\/media\/home\/supply-network-hero\.avif"[^>]*>/, '<link rel="preload" as="image" href="/assets/media/home/earth-reference-1400.jpg" fetchpriority="high">');
for (const required of [
  'class="npd-apple-hero nph-earth-hero"',
  'src="/assets/media/home/earth-reference-1400.jpg"',
  'id="commercial-pathways"',
  'Regulated wholesale supply has not commenced.'
]) {
  if (!next.includes(required)) throw new Error("Approved Earth homepage missing release contract: " + required);
}
if (next.includes('class="pharma-home-hero"')) throw new Error("Retired hero remains in the final output.");
writeFileSync(path, next, "utf8");
console.log("Restored approved morning-Earth hero while preserving the public commercial page.");
