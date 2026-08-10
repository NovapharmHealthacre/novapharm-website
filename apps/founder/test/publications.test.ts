import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { jsonFeed, rssXml } from "../lib/feed";
import { externalPublicationSchema } from "../lib/seo";
import { publications } from "../lib/site-data";

const expected = Object.freeze([
  Object.freeze({
    title: "Why Onshoring Alone Won’t Secure Pharma Supply Chains",
    publisher: "Pharmaceutical Commerce",
    date: "2026-07-31",
  }),
  Object.freeze({
    title:
      "UK–EU Pharmaceutical Market Access and Compliance in the Post-Brexit Era — 4. Compliance-Driven Approaches to Cross-Border Market Entry",
    publisher: "Yakuji Nippo",
    date: "2026-07-23",
  }),
  Object.freeze({
    title: "Parallel Import Frameworks and Risk Considerations",
    publisher: "Yakuji Nippo",
    date: "2026-05-12",
  }),
  Object.freeze({
    title: "Regulatory and Compliance Considerations Post-Brexit",
    publisher: "Yakuji Nippo",
    date: "2026-03-12",
  }),
  Object.freeze({
    title: "UK and EU Pharmaceutical Market Access Pathways After Brexit",
    publisher: "Yakuji Nippo",
    date: "2026-02-06",
  }),
]);

test("publication registry contains exactly five verified external publications in reverse chronology", () => {
  assert.equal(publications.length, 5);
  assert.deepEqual(
    publications.map((publication) => ({
      title: publication.title,
      publisher: publication.publisher,
      date: publication.publicationDate,
    })),
    expected,
  );
  assert.equal(new Set(publications.map((publication) => publication.id)).size, publications.length);
  assert.equal(new Set(publications.map((publication) => publication.canonicalUrl)).size, publications.length);
});

test("publication links and translations are verified HTTPS publisher records", () => {
  const verifiedTranslations = new Set([
    "https://www.yakuji.co.jp/entry129530.html",
    "https://www.yakuji.co.jp/entry131266.html",
    "https://www.yakuji.co.jp/entry133527.html",
    "https://www.yakuji.co.jp/entry136964.html",
  ]);
  for (const publication of publications) {
    assert.equal(new URL(publication.canonicalUrl).protocol, "https:");
    assert.equal(publication.evidenceStatus, "verified_external_publication");
    for (const translation of publication.translations) {
      assert.ok(verifiedTranslations.has(translation.url), `Unverified translation link: ${translation.url}`);
      assert.equal(new URL(translation.url).hostname, "www.yakuji.co.jp");
    }
  }
  assert.equal(
    publications[0]?.translations.length,
    0,
    "Pharmaceutical Commerce has no verified translation counterpart",
  );
});

test("publication nodes, feeds and approved knowledge corpus include all five external records", () => {
  const nodes = publications.map(externalPublicationSchema);
  assert.equal(new Set(nodes.map((node) => node["@id"])).size, 5);
  assert.ok(nodes.every((node) => (node["author"] as { "@id": string })["@id"].endsWith("/#person")));

  const rss = rssXml([], publications);
  const feed = jsonFeed([], publications) as { items: readonly { title: string }[] };
  for (const publication of publications) {
    assert.match(rss, new RegExp(publication.publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.ok(feed.items.some((item) => item.title === publication.title));
  }

  const knowledge = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public", "assets", "founder-knowledge.json"), "utf8"),
  ) as { sourceCount: number; documents: readonly { type: string; url: string }[] };
  const externalDocuments = knowledge.documents.filter((document) => document.type === "Verified external publication");
  assert.equal(knowledge.sourceCount, knowledge.documents.length);
  assert.equal(externalDocuments.length, 5);
  assert.deepEqual(
    new Set(externalDocuments.map((document) => document.url)),
    new Set(publications.map((item) => item.canonicalUrl)),
  );
});
