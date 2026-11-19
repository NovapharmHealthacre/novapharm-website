import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const campaign = JSON.parse(readFileSync(join(root, "docs/marketing/native-linkedin-campaign.json"), "utf8"));
assert.equal(campaign.paid_media_budget_gbp, 0);
assert.equal(campaign.autopublish_enabled, false);
assert.equal(campaign.accounts_connected, false);
assert.equal(campaign.posts.length, 9);
const brands = new Map([["healthcare", 0], ["nutraxin", 0], ["intelligence", 0]]);
const ids = new Set();
const dates = new Set();
for (const post of campaign.posts) {
  assert.ok(brands.has(post.brand), "Unknown organic marketing brand");
  brands.set(post.brand, brands.get(post.brand) + 1);
  assert.ok(!ids.has(post.id), "Duplicate campaign item");
  ids.add(post.id);
  assert.ok(!dates.has(post.planned_date), "Duplicate day in initial campaign calendar");
  dates.add(post.planned_date);
  assert.match(post.planned_date, /^2026-11-(?:[12][0-9]|30)$/);
  assert.equal(post.channel, "linkedin-native");
  assert.equal(post.status, "draft_requires_owner_publication");
  assert.equal(post.paid_media_budget_gbp, 0);
  assert.ok(post.hook.length >= 12 && post.hook.length <= 120, "One clear editorial hook");
  assert.ok(post.body.length >= 140 && post.body.length <= 900, "Focused, detailed organic copy");
  assert.ok(post.source && post.source.length >= 12, "Evidence source label required");
  assert.doesNotMatch(post.body, /(?:guaranteed results|clinically proven cure|NHS approved|stock is guaranteed|payment is verified)/i);
  const destination = new URL(post.destination);
  const tracked = new URL(post.tracked_url);
  assert.equal(destination.protocol, "https:");
  assert.equal(destination.hostname, "novapharmhealthcare.com");
  assert.equal(destination.search, "");
  assert.equal(tracked.hostname, destination.hostname);
  assert.equal(tracked.pathname, destination.pathname);
  assert.equal(tracked.searchParams.get("utm_source"), "linkedin");
  assert.equal(tracked.searchParams.get("utm_medium"), "organic_social");
  assert.equal(tracked.searchParams.get("utm_campaign"), "novapharm_founder_led_2026q4");
  assert.match(tracked.searchParams.get("utm_content") || "", /^[a-z0-9_]+$/);
  assert.equal([...tracked.searchParams.keys()].length, 4);
  const file = join(root, destination.pathname, "index.html");
  assert.ok(existsSync(file), "Organic destination must exist in the generated public website: " + destination.pathname);
}
for (const [brand, count] of brands) assert.equal(count, 3, "Three native LinkedIn posts per brand: " + brand);

const articleDirectory = join(root, "src/content/insights");
const articles = readdirSync(articleDirectory).filter(name => name.endsWith(".json"));
assert.ok(articles.length >= 6);
for (const name of articles) {
  const article = JSON.parse(readFileSync(join(articleDirectory, name), "utf8"));
  const canonical = `https://novapharmhealthcare.com/news-insights/${article.slug}/`;
  const html = readFileSync(join(root, "news-insights", article.slug, "index.html"), "utf8");
  assert.equal((html.match(/data-native-article-share/g) || []).length, 1, "One native share control per authored article");
  const expected = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(canonical);
  assert.ok(html.includes(`href="${expected}"`), "Native sharing must use the canonical article URL");
  assert.ok(html.includes('rel="noopener noreferrer external" referrerpolicy="no-referrer"'), "Safe sharing link");
  assert.doesNotMatch(html, /<script[^>]+(?:platform\.linkedin\.com|linkedin\.com)/, "No LinkedIn tracking SDK");
}
console.log("Native organic QA passed: nine truthful posts, zero paid budget, 3 brands, nine canonical landing targets, six consent-free LinkedIn share links.");
