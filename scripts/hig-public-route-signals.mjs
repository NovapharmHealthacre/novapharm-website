/**
 * Read-only HTML smoke signals for the publicly released corporate site.
 * A positive signal is NOT WCAG / Apple HIG or production acceptance.
 * This parser deliberately inspects public markup only: no JS, cookies,
 * authentication, proprietary Apple assets or patient/customer records.
 */
import { parse } from "parse5";

const htmlNamespace = "http://www.w3.org/1999/xhtml";
const attribute = (element, name) => element?.attrs
  ?.find(item => item.name === name && !item.namespace)?.value ?? null;

function* elements(root) {
  const pending = [root];
  while (pending.length) {
    const node = pending.pop();
    if (node.tagName && node.namespaceURI === htmlNamespace) yield node;
    // Template content is a separate inert fragment, not part of the public UI.
    if (node.tagName === "template") continue;
    const children = node.childNodes ?? [];
    for (let i = children.length - 1; i >= 0; i--) pending.push(children[i]);
  }
}

export const MANAGED_CONTACT_ORIGIN = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";

// This detects a lost or substituted production form. It cannot accept intake or delivery.
export function inspectManagedContactMarkup(html) {
  if (typeof html !== "string") throw new TypeError("Public Contact markup must be a string");
  const nodes = [...elements(parse(html))];
  const forms = nodes.filter(node => node.tagName === "form");
  const managed = forms.filter(form => attribute(form, "data-live-b2b-enquiry-form") !== null);
  const emailDraftOnly = forms.some(form => attribute(form, "data-email-enquiry-form") !== null ||
    /^mailto:/i.test(attribute(form, "action")?.trim() ?? ""));
  const issues = [];
  if (managed.length !== 1) issues.push("Expected exactly one managed business enquiry form");
  if (emailDraftOnly) issues.push("Email-draft form present on managed Contact");
  for (const form of managed) {
    if (attribute(form, "data-api-origin") !== MANAGED_CONTACT_ORIGIN) {
      issues.push("Managed Contact is not pinned to the approved receiver");
    }
    const fields = [...elements(form)].filter(node => node.tagName === "input");
    for (const name of ["privacyAcknowledgement", "safetyConfirmation"]) {
      if (!fields.some(field => attribute(field, "name") === name &&
          attribute(field, "type")?.toLowerCase() === "checkbox" && attribute(field, "required") !== null)) {
        issues.push("Required Contact confirmation missing: " + name);
      }
    }
  }
  if (!nodes.some(node => node.tagName === "script" &&
    attribute(node, "src") === "/assets/js/contact-production.js")) {
    issues.push("Managed Contact production client missing");
  }
  return { emailDraftOnly, issues };
}

export function inspectPublicHigSignals(html) {
  if (typeof html !== "string") throw new TypeError("Public markup must be a string");
  const nodes = [...elements(parse(html))];
  const htmlTag = nodes.find(node => node.tagName === "html");
  const meta = name => nodes.find(node => node.tagName === "meta" &&
    attribute(node, "name")?.toLowerCase() === name);
  const viewport = attribute(meta("viewport"), "content") ?? "";
  const provenance = attribute(meta("novapharm-source-sha"), "content") ?? "";
  const language = attribute(htmlTag, "lang");
  const h1Elements = nodes.filter(node => node.tagName === "h1").length;
  const skipLinks = nodes.filter(tag => {
    if (tag.tagName !== "a") return false;
    const href = attribute(tag, "href") ?? "";
    const label = (attribute(tag, "class") ?? "") + " " + (attribute(tag, "aria-label") ?? "");
    return /^#[A-Za-z][A-Za-z0-9_-]*$/.test(href) &&
      /skip|bypass/i.test(label);
  });
  const ids = new Set(nodes.map(node => attribute(node, "id")).filter(Boolean));
  const skipTargetPresent = skipLinks.some(link => {
    const target = (attribute(link, "href") ?? "").slice(1);
    return ids.has(target);
  });
  const signals = {
    language,
    responsiveViewport: /(?:^|[,;\s])width\s*=\s*device-width(?:$|[,;\s])/i.test(viewport),
    h1Elements,
    skipLinkWithTarget: skipTargetPresent,
    deployedSourceSha: /^[a-f0-9]{40}$/i.test(provenance) ? provenance.toLowerCase() : null
  };
  const warnings = [];
  if (!signals.language) warnings.push("HTML document language is not declared");
  if (!signals.responsiveViewport) warnings.push("Device-width viewport metadata not found");
  if (signals.h1Elements !== 1) warnings.push("Expected one SSR H1; found " + signals.h1Elements);
  if (!signals.skipLinkWithTarget) warnings.push("Linked keyboard skip target not found in server HTML");
  if (!signals.deployedSourceSha) warnings.push("Exact deployed source SHA not exposed in server HTML");
  return { ...signals, warnings, evidenceLevel: "unauthenticated-ssr-markup-only" };
}
