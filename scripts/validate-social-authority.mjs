import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
let failures = 0;
const fail = (message) => { failures += 1; console.error(`Social authority validation failed: ${message}`); };
const read = (path) => readFileSync(join(root, path), "utf8");

for (const path of [
  "seo/generated/social-image-register.json",
  "seo/generated/structured-data-register.json"
]) {
  if (!existsSync(join(root, path))) fail(`missing ${path}`);
}

if (!failures) {
  const social = JSON.parse(read("seo/generated/social-image-register.json"));
  const structured = JSON.parse(read("seo/generated/structured-data-register.json"));
  if (social.length < 30) fail(`expected representative images for at least 30 public pages; found ${social.length}`);
  if (structured.length !== social.length) fail("structured-data and social-image registers cover different page counts");
  const routes = new Set();
  for (const item of social) {
    if (routes.has(item.route)) fail(`duplicate social-image route ${item.route}`);
    routes.add(item.route);
    if (!item.absoluteUrl?.startsWith("https://novapharmhealthcare.com/")) fail(`${item.route} has a non-canonical social image URL`);
    if (!item.alt || !item.width || !item.height || !item.type) fail(`${item.route} has incomplete social-image metadata`);
    const file = item.url?.replace(/^\//, "");
    if (file && !existsSync(join(root, file))) fail(`${item.route} references missing social image ${item.url}`);
    const page = item.route === "/" ? "index.html" : `${item.route.replace(/^\//, "")}index.html`;
    if (!existsSync(join(root, page))) { fail(`missing page for social route ${item.route}`); continue; }
    const html = read(page);
    if (!html.includes("<!-- page-specific-social-start -->") || !html.includes(`content="${item.absoluteUrl}"`)) fail(`${page} does not materialise its registered social image`);
    if (!html.includes(`name="twitter:image" content="${item.absoluteUrl}"`)) fail(`${page} Twitter image does not match the register`);
  }
  for (const page of structured) {
    if (!routes.has(page.route)) fail(`structured-data route ${page.route} lacks a social-image record`);
    if (!page.entities?.length) fail(`structured-data route ${page.route} has no entities`);
    if (!page.entities.some((entity) => entity.types.some((type) => ["WebPage", "AboutPage", "ContactPage", "ProfilePage", "Article", "BlogPosting"].includes(type)))) {
      fail(`structured-data route ${page.route} lacks a page or article entity`);
    }
  }
}

if (failures) process.exit(1);
console.log("Validated representative social images and the structured-data register across canonical public pages.");
