/**
 * Summarize read-only live HIG HTML gaps without preserving or printing bodies,
 * full exception messages, submitted forms or any authenticated content.
 * This diagnostic is never a production HIG acceptance certificate.
 */
const checkedRoutes = new Set([
  "/", "/legal/accessibility/", "/contact/", "/products/", "/capabilities/", "/oncology/"
]);

export function summarizeHigPublicSampleGaps(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Public sample observations must be an array");
  return rows.filter(row => Array.isArray(row?.errors) && row.errors.length > 0).map(row => {
    const route = checkedRoutes.has(row.route) ? row.route : "[unrecognized route]";
    const issueTypes = [];
    const errors = row.errors;
    if (errors.some(value => typeof value === "string" && value.startsWith("HTTP status "))) issueTypes.push("http_status");
    if (errors.includes("Response not HTML")) issueTypes.push("unexpected_content_type");
    if (errors.includes("Missing English HTML language")) issueTypes.push("language");
    if (errors.includes("Missing or duplicate H1")) issueTypes.push("heading");
    if (errors.includes("No published provenance SHA")) issueTypes.push("source_sha_absent");
    if (errors.includes("Current accessibility disclosure cannot be confirmed")) issueTypes.push("disclosure");
    if (issueTypes.length === 0 || errors.length > issueTypes.length) issueTypes.push("other_redacted");
    return {
      route,
      httpStatus: Number.isInteger(row.httpStatus) && row.httpStatus >= 100 && row.httpStatus <= 599
        ? row.httpStatus : null,
      html: String(row.contentType || "").toLowerCase().includes("text/html"),
      hasDocumentLanguage: typeof row.lang === "string" && /^en(?:-|$)/i.test(row.lang),
      singleH1: row.h1Count === 1,
      hasSourceSha: /^[a-f0-9]{40}$/i.test(row.sourceSha || ""),
      issueTypes
    };
  });
}
