/**
 * Read-only HTML smoke signals for the publicly released corporate site.
 * A positive signal is NOT WCAG / Apple HIG or production acceptance.
 * This parser deliberately inspects public markup only: no JS, cookies,
 * authentication, proprietary Apple assets or patient/customer records.
 */
function attribute(tag, name) {
  if (!tag) return null;
  const pattern = new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')", "i");
  const match = tag.match(pattern);
  return match ? (match[1] ?? match[2]) : null;
}

export function inspectPublicHigSignals(html) {
  if (typeof html !== "string") throw new TypeError("Public markup must be a string");
  const htmlTag = html.match(/<html\\b[^>]*>/i)?.[0] ?? "";
  const tags = [...html.matchAll(/<meta\\b[^>]*>/gi)].map(match => match[0]);
  const meta = name => tags.find(tag => attribute(tag, "name")?.toLowerCase() === name) ?? "";
  const viewport = attribute(meta("viewport"), "content") ?? "";
  const provenance = attribute(meta("novapharm-source-sha"), "content") ?? "";
  const language = attribute(htmlTag, "lang");
  const h1Elements = [...html.matchAll(/<h1\\b/gi)].length;
  const skipLinks = [...html.matchAll(/<a\\b[^>]*>/gi)].map(match => match[0]).filter(tag => {
    const href = attribute(tag, "href") ?? "";
    const label = (attribute(tag, "class") ?? "") + " " + (attribute(tag, "aria-label") ?? "");
    return /^#[A-Za-z][A-Za-z0-9_-]*$/.test(href) &&
      /skip|bypass/i.test(label);
  });
  const skipTargetPresent = skipLinks.some(link => {
    const target = (attribute(link, "href") ?? "").slice(1);
    return [...html.matchAll(/<[^>]+\\bid\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)')[^>]*>/gi)]
      .some(match => (match[1] ?? match[2]) === target);
  });
  const signals = {
    language,
    responsiveViewport: /(?:^|[,;\\s])width\\s*=\\s*device-width(?:$|[,;\\s])/i.test(viewport),
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
