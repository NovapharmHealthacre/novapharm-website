import { readFileSync } from "node:fs";
import { INDEXNOW_KEY, INDEXNOW_KEY_URL, SITE_URL } from "../src/seo/authority-config.mjs";

const args = process.argv.slice(2);
const submit = args.includes("--submit");
const urlsFileIndex = args.indexOf("--urls-file");
const explicitUrls = args.filter((arg) => /^https?:\/\//.test(arg));
const fileUrls = urlsFileIndex >= 0 && args[urlsFileIndex + 1]
  ? readFileSync(args[urlsFileIndex + 1], "utf8").split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
  : [];
const urls = [...new Set([...explicitUrls, ...fileUrls])];
const host = new URL(SITE_URL).host;

if (!urls.length) {
  console.log("IndexNow: no canonical URLs supplied; nothing to do.");
  process.exit(0);
}

for (const value of urls) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.host !== host) throw new Error(`IndexNow URL is outside ${host}: ${value}`);
  if (/\/(portal|employee|admin|_secure|docs|api)\//.test(url.pathname)) throw new Error(`IndexNow refuses private route: ${url.pathname}`);
}

const payload = {
  host,
  key: INDEXNOW_KEY,
  keyLocation: INDEXNOW_KEY_URL,
  urlList: urls.slice(0, 10000)
};

if (!submit) {
  console.log(JSON.stringify({ dryRun: true, ...payload }, null, 2));
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8", "user-agent": "NovaPharm-IndexNow/1.0" },
  body: JSON.stringify(payload)
});

const accepted = new Set([200, 202]);
const known = {
  200: "submitted successfully",
  202: "received; key validation pending",
  400: "invalid request format",
  403: "verification key rejected",
  422: "URL or key does not match the host",
  429: "rate limited"
};
const summary = known[response.status] || `unexpected status ${response.status}`;
console.log(`IndexNow ${response.status}: ${summary}; ${urls.length} canonical URL(s).`);
if (!accepted.has(response.status)) process.exit(1);
