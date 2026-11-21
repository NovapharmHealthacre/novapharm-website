/**
 * Read-only HTML smoke signals for the publicly released corporate site.
 * A positive signal is NOT WCAG / Apple HIG or production acceptance.
 * This parser deliberately inspects public markup only: no JS, cookies,
 * authentication, proprietary Apple assets or patient/customer records.
 */
function attribute(tag, name) {
  if (!tag) return null;
  const pattern = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", "i");
  const match = tag.match(pattern);
  return match ? (match[1] ?? match[2]) : null;
}

export const MANAGED_CONTACT_ORIGIN = "https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com";

// This detects a lost or substituted production form. It cannot accept intake or delivery.
export function inspectManagedContactMarkup(html) {
  if (typeof html !== "string") throw new TypeError("Public Contact markup must be a string");
  const markup = html.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, "")
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, "$1</script>");
  const forms = [...markup.matchAll(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi)].map(match => match[0]);
  const open = form => form.slice(0, form.indexOf(">") + 1);
  const flagged = (tag, flag) => new RegExp("\\s" + flag + "(?=\\s|=|/?>)", "i").test(tag);
  const managed = forms.filter(form => flagged(open(form), "data-live-b2b-enquiry-form"));
  const emailDraftOnly = forms.some(form => flagged(open(form), "data-email-enquiry-form") ||
    /^mailto:/i.test(attribute(open(form), "action") ?? ""));
  const issues = [];
  if (managed.length !== 1) issues.push("Expected exactly one managed business enquiry form");
  if (emailDraftOnly) issues.push("Email-draft form present on managed Contact");
  for (const form of managed) {
    if (attribute(open(form), "data-api-origin") !== MANAGED_CONTACT_ORIGIN) {
      issues.push("Managed Contact is not pinned to the approved receiver");
    }
    const fields = [...form.matchAll(/<input\b[^>]*>/gi)].map(match => match[0]);
    for (const name of ["privacyAcknowledgement", "safetyConfirmation"]) {
      if (!fields.some(field => attribute(field, "name") === name &&
          attribute(field, "type") === "checkbox" && flagged(field, "required"))) {
        issues.push("Required Contact confirmation missing: " + name);
      }
    }
  }
  if (![...markup.matchAll(/<script\b[^>]*>/gi)].some(match =>
    attribute(match[0], "src") === "/assets/js/contact-production.js")) {
    issues.push("Managed Contact production client missing");
  }
  return { emailDraftOnly, issues };
}

export function inspectPublicHigSignals(html) {
  if (typeof html !== "string") throw new TypeError("Public markup must be a string");
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  const meta = name => tags.find(tag => attribute(tag, "name")?.toLowerCase() === name) ?? "";
  const viewport = attribute(meta("viewport"), "content") ?? "";
  const provenance = attribute(meta("novapharm-source-sha"), "content") ?? "";
  const language = attribute(htmlTag, "lang");
  const h1Elements = [...html.matchAll(/<h1\b/gi)].length;
  const skipLinks = [...html.matchAll(/<a\b[^>]*>/gi)].map(match => match[0]).filter(tag => {
    const href = attribute(tag, "href") ?? "";
    const label = (attribute(tag, "class") ?? "") + " " + (attribute(tag, "aria-label") ?? "");
    return /^#[A-Za-z][A-Za-z0-9_-]*$/.test(href) &&
      /skip|bypass/i.test(label);
  });
  const tagsWithId = [...html.matchAll(/<[^>]+>/g)].map(match => match[0]);
  const skipTargetPresent = skipLinks.some(link => {
    const target = (attribute(link, "href") ?? "").slice(1);
    return tagsWithId.some(tag => attribute(tag, "id") === target);
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
