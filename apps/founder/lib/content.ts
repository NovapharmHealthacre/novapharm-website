import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { founderContact, founderProfile, novapharmOrganisation, profileReviewedOn, publications } from "./site-data";

export interface SourceLink {
  readonly label: string;
  readonly url: string;
}

export interface ArticleRecord {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly summary: string;
  readonly author: string;
  readonly published: string;
  readonly modified: string;
  readonly category: string;
  readonly canonicalPath: string;
  readonly legacyPaths: readonly string[];
  readonly socialImage: string;
  readonly sources: readonly SourceLink[];
  readonly related: readonly string[];
  readonly public: true;
  readonly body: string;
  readonly html: string;
  readonly reading: Readonly<{ words: number; minutes: number }>;
}

export interface PageRecord {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
  readonly public: true;
  readonly body: string;
  readonly html: string;
}

const contentRoot = path.join(process.cwd(), "content");
const allowedLink = /^(?:https?:\/\/|mailto:|\/|#)/;

function assertSafeMarkdown(body: string, filename: string): void {
  if (/<[A-Za-z!/]/.test(body)) throw new Error(`${filename}: raw HTML is not allowed`);
  for (const match of body.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (!target || !allowedLink.test(target)) throw new Error(`${filename}: disallowed link target`);
  }
}

function renderMarkdown(body: string, filename: string): string {
  assertSafeMarkdown(body, filename);
  return marked.parse(body, { async: false, gfm: true }) as string;
}

function requiredString(data: Record<string, unknown>, key: string, filename: string): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${filename}: missing ${key}`);
  return value;
}

function requiredDate(data: Record<string, unknown>, key: string, filename: string): string {
  const value = data[key];
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${filename}: ${key} must be an ISO calendar date`);
  }
  return date;
}

function requiredStringArray(data: Record<string, unknown>, key: string, filename: string): readonly string[] {
  const value = data[key];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${filename}: ${key} must be a string array`);
  }
  return value;
}

function requiredSources(data: Record<string, unknown>, filename: string): readonly SourceLink[] {
  const value = data["sources"];
  if (!Array.isArray(value)) throw new Error(`${filename}: sources must be an array`);
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new Error(`${filename}: invalid source`);
    const source = entry as Record<string, unknown>;
    const label = requiredString(source, "label", filename);
    const url = requiredString(source, "url", filename);
    if (!/^https:\/\//.test(url)) throw new Error(`${filename}: source URLs must use HTTPS`);
    return Object.freeze({ label, url });
  });
}

function readingTime(body: string): Readonly<{ words: number; minutes: number }> {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Object.freeze({ words, minutes: Math.max(1, Math.ceil(words / 220)) });
}

function articleFromFile(filename: string): ArticleRecord {
  const source = fs.readFileSync(path.join(contentRoot, "articles", filename), "utf8");
  const parsed = matter(source);
  const data = parsed.data as Record<string, unknown>;
  if (data["public"] !== true) throw new Error(`${filename}: only approved public articles may enter this app`);
  const canonicalPath = requiredString(data, "canonicalPath", filename);
  const slug = filename.replace(/\.md$/, "");
  if (canonicalPath !== `/essays/${slug}/`) throw new Error(`${filename}: canonical path does not match its slug`);
  return Object.freeze({
    slug,
    title: requiredString(data, "title", filename),
    description: requiredString(data, "description", filename),
    summary: requiredString(data, "summary", filename),
    author: requiredString(data, "author", filename),
    published: requiredDate(data, "published", filename),
    modified: requiredDate(data, "modified", filename),
    category: requiredString(data, "category", filename),
    canonicalPath,
    legacyPaths: requiredStringArray(data, "legacyPaths", filename),
    socialImage: requiredString(data, "socialImage", filename),
    sources: requiredSources(data, filename),
    related: requiredStringArray(data, "related", filename),
    public: true,
    body: parsed.content.trim(),
    html: renderMarkdown(parsed.content.trim(), filename),
    reading: readingTime(parsed.content),
  });
}

export function getArticles(): readonly ArticleRecord[] {
  return fs
    .readdirSync(path.join(contentRoot, "articles"))
    .filter((filename) => filename.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b))
    .map(articleFromFile)
    .sort((a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));
}

export function getArticle(slug: string): ArticleRecord | undefined {
  return getArticles().find((article) => article.slug === slug);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

const publicationRecord = publications
  .map(
    (publication) =>
      `### ${publication.title}\n\n**${publication.subject} · ${formatDate(publication.date)}**\n\n${publication.abstract}\n\n- [Read in English](${publication.english})\n- [日本語で読む](${publication.japanese})`,
  )
  .join("\n\n");

const pageVariables: Readonly<Record<string, string | number>> = Object.freeze({
  EMAIL: founderContact.email,
  LINKEDIN_URL: founderContact.linkedIn,
  PERSON_SHORT_BIO: founderProfile.shortBio,
  PERSON_MEDIUM_BIO: founderProfile.mediumBio,
  COMPANY_NAME: "NovaPharm Healthcare Ltd",
  COMPANY_LEGAL_NAME: novapharmOrganisation.legalName,
  COMPANY_NUMBER: novapharmOrganisation.companyNumber,
  COMPANY_URL: `${novapharmOrganisation.website}/`,
  COMPANIES_HOUSE_URL: novapharmOrganisation.evidence[0]?.publicUrl ?? "",
  COMPANY_STATUS: "Active",
  COMPANY_LEGAL_FORM: "private limited company",
  COMPANY_INCORPORATED: formatDate(novapharmOrganisation.incorporatedOn),
  PUBLISHED_INSTALLMENT_COUNT: publications.length,
  VERIFICATION_DATE: formatDate(profileReviewedOn),
  PUBLICATION_RECORD: publicationRecord,
});

function interpolate(body: string, filename: string): string {
  const resolved = body.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const value = pageVariables[key];
    if (value === undefined) throw new Error(`${filename}: unknown content variable ${key}`);
    return String(value);
  });
  if (/\{\{[A-Z0-9_]+\}\}/.test(resolved)) throw new Error(`${filename}: unresolved content variable`);
  return resolved;
}

function pageFromFile(filename: string): PageRecord {
  const source = fs.readFileSync(path.join(contentRoot, "pages", filename), "utf8");
  const parsed = matter(source);
  const data = parsed.data as Record<string, unknown>;
  if (data["public"] !== true) throw new Error(`${filename}: only approved public pages may enter this app`);
  const body = interpolate(parsed.content.trim(), filename);
  return Object.freeze({
    slug: filename.replace(/\.md$/, ""),
    title: requiredString(data, "title", filename),
    description: requiredString(data, "description", filename),
    canonicalPath: requiredString(data, "canonicalPath", filename),
    public: true,
    body,
    html: renderMarkdown(body, filename),
  });
}

export function getPage(slug: string): PageRecord {
  const filename = `${slug}.md`;
  if (!/^[a-z-]+\.md$/.test(filename) || !fs.existsSync(path.join(contentRoot, "pages", filename))) {
    throw new Error(`Unknown founder page: ${slug}`);
  }
  return pageFromFile(filename);
}
