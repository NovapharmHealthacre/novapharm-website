import { publications } from "../lib/site-data";

const timeoutMs = 15_000;
const expectedHosts = new Set(["www.yakuji.co.jp", "www.pharmaceuticalcommerce.com"]);

interface LinkTarget {
  readonly label: string;
  readonly url: string;
  readonly evidenceText: readonly string[];
}

function normaliseEvidenceText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[‘’]/gu, "'")
    .replace(/[–—]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-GB");
}

function targets(): readonly LinkTarget[] {
  return publications.flatMap((publication) => [
    {
      label: `${publication.publisher}: ${publication.title}`,
      url: publication.canonicalUrl,
      evidenceText: [publication.author, publication.title.split(/[—|]/u)[0]?.trim() || publication.title],
    },
    ...publication.translations.map((translation) => ({
      label: `${publication.publisher}: ${translation.title}`,
      url: translation.url,
      evidenceText: [publication.author],
    })),
  ]);
}

async function verify(target: LinkTarget) {
  const source = new URL(target.url);
  if (source.protocol !== "https:" || !expectedHosts.has(source.hostname)) {
    throw new Error(`${target.label}: unapproved publication origin ${source.origin}`);
  }

  const response = await fetch(source, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "NovaPharm-Publication-Evidence-Check/1.0 (+https://vishal.novapharmhealthcare.com/)",
    },
  });
  const finalUrl = new URL(response.url);
  if (!response.ok) throw new Error(`${target.label}: publisher returned HTTP ${response.status}`);
  if (!expectedHosts.has(finalUrl.hostname)) {
    throw new Error(`${target.label}: redirected to unapproved origin ${finalUrl.origin}`);
  }

  const body = normaliseEvidenceText(await response.text());
  for (const expectedText of target.evidenceText) {
    if (!body.includes(normaliseEvidenceText(expectedText))) {
      throw new Error(`${target.label}: identifying publisher text was not found`);
    }
  }

  return Object.freeze({
    label: target.label,
    requestedUrl: target.url,
    resolvedUrl: finalUrl.href,
    status: response.status,
  });
}

const results = [];
for (const target of targets()) results.push(await verify(target));

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      canonicalPublicationCount: publications.length,
      checkedLinkCount: results.length,
      results,
    },
    null,
    2,
  ),
);
