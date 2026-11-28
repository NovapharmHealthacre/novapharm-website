// Commerce-policy-gated UK discovery feed. No ads or in-ChatGPT checkout.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const BASE = "https://novapharmhealthcare.com";
export const OUTPUT = "feeds/chatgpt-products.csv";
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const ALLOWED_CLASSES = new Set(["cosmetic", "consumer_non_medicinal"]);
export const COLUMNS = Object.freeze([
  "item_id", "title", "description", "url", "brand", "seller_name",
  "image_url", "price", "availability", "gtin",
  "target_countries", "store_country",
  "is_eligible_search", "is_eligible_checkout", "is_ads_eligible"
]);

function validGtin(gtin) {
  if (typeof gtin !== "string" || !/^\\d{13}$/.test(gtin)) return false;
  const digits = [...gtin].map(Number);
  const check = (10 - [...digits.slice(0, -1)].reverse().reduce(
    (sum, digit, index) => sum + digit * (index % 2 ? 1 : 3), 0
  ) % 10) % 10;
  return digits.at(-1) === check;
}
function recentUtc(value, now) {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/.test(value)) return false;
  const timestamp = Date.parse(value), age = now.getTime() - timestamp;
  return Number.isFinite(timestamp) && age >= 0 && age <= MAX_AGE_MS;
}
function nonblank(value, max = 5000) {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= max && !/[\\u0000-\\u0008\\u000b\\u000e-\\u001f]/.test(value);
}
function safeProductUrl(url, ean) {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === BASE &&
      parsed.pathname === "/products/health-and-wellbeing/" + ean + "/" &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch { return false; }
}
function csvCell(raw) {
  const value = String(raw);
  return /[",\\r\\n]/.test(value) ? '"' + value.replaceAll('"', '""') + '"' : value;
}

export function buildChatGptRows(catalogue, manifest, now = new Date()) {
  assert(Array.isArray(catalogue), "Verified catalogue must be an array");
  assert(manifest?.schema === "novapharm-chatgpt-gb-verified-offers-v1" &&
    manifest.market === "GB" && manifest.currency === "GBP" &&
    Array.isArray(manifest.offers), "Incorrect verified-offer manifest");
  const products = new Map();
  for (const product of catalogue) {
    assert(validGtin(product.ean) && !products.has(product.ean),
      "Invalid or duplicate catalogue GTIN");
    products.set(product.ean, product);
  }
  const seen = new Set();
  return manifest.offers.map((offer) => {
    const id = offer?.ean;
    assert(validGtin(id) && !seen.has(id), "Invalid or duplicate ChatGPT item");
    seen.add(id);
    const product = products.get(id);
    assert(product, "Offer is missing approved product identity: " + id);
    assert(ALLOWED_CLASSES.has(product.productClass),
      "Product class prohibited or not reviewed for ChatGPT: " + id);
    assert(product.identityConfirmed === true && product.imageRightsConfirmed === true &&
      product.publicListingApproved === true, "Missing approved consumer listing: " + id);
    assert(offer.policyApproved === true && nonblank(offer.policyReviewReference, 200),
      "OpenAI commerce policy review missing: " + id);
    assert(offer.sellerApproved === true && offer.checkoutVerified === true &&
      offer.source === "verified-live-retail" && offer.priceIncludesVat === true,
      "Not a verified live retail checkout offer: " + id);
    assert(Number.isSafeInteger(offer.pricePence) && offer.pricePence > 0,
      "Missing verified consumer price: " + id);
    assert(["in_stock", "out_of_stock"].includes(offer.availability),
      "Missing verified availability: " + id);
    assert(recentUtc(offer.priceCheckedAt, now) && recentUtc(offer.stockCheckedAt, now),
      "Price or stock evidence stale: " + id);
    assert(safeProductUrl(offer.productUrl, id), "Unexpected checkout landing page: " + id);
    assert(nonblank(product.name, 150) && nonblank(product.brand, 120) &&
      nonblank(product.description, 5000), "Missing factual product information: " + id);
    assert(/^\\/assets\\/media\\/products\\/connective\\/[A-Za-z0-9/_-]+\\.(?:webp|png|jpe?g|avif)$/.test(product.image),
      "Missing owner-approved product photograph: " + id);
    return {
      item_id: id, title: product.name, description: product.description,
      url: offer.productUrl, brand: product.brand,
      seller_name: "NovaPharm Healthcare Ltd", image_url: BASE + product.image,
      price: (offer.pricePence / 100).toFixed(2) + " GBP",
      availability: offer.availability, gtin: id,
      target_countries: '["GB"]', store_country: "GB",
      is_eligible_search: "true", is_eligible_checkout: "false", is_ads_eligible: "false"
    };
  });
}

export function serializeChatGptRows(rows) {
  return COLUMNS.join(",") + "\\n" + rows.map(row =>
    COLUMNS.map(key => csvCell(row[key])).join(",")
  ).join("\\n") + (rows.length ? "\\n" : "");
}

export function stageChatGptFeed(root, publicDirectory, now = new Date()) {
  const catalogue = JSON.parse(readFileSync(join(root, "src/content/approved-consumer-catalogue.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "src/content/chatgpt-uk-verified-offers.json"), "utf8"));
  const rows = buildChatGptRows(catalogue, manifest, now);
  // A header-only feed is not a valid retail offer. Never publish a fake product.
  if (!rows.length) return { rows: 0, published: false };
  for (const row of rows) {
    const image = join(publicDirectory, new URL(row.image_url).pathname.slice(1));
    const page = join(publicDirectory, new URL(row.url).pathname.slice(1), "index.html");
    assert(existsSync(image) && existsSync(page),
      "Actual customer product page or pack image missing: " + row.item_id);
  }
  const destination = join(publicDirectory, OUTPUT);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, serializeChatGptRows(rows), { encoding: "utf8", flag: "wx" });
  return { rows: rows.length, published: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const catalogue = JSON.parse(readFileSync(join(root, "src/content/approved-consumer-catalogue.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "src/content/chatgpt-uk-verified-offers.json"), "utf8"));
  const rows = buildChatGptRows(catalogue, manifest);
  console.log(JSON.stringify({
    verifiedEligibleRows: rows.length, wouldPublish: rows.length > 0,
    target: OUTPUT, productUploadPerformed: false, checkoutActivated: false
  }));
}
