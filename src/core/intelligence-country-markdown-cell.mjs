/**
 * Encode any source label as plain text for a GitHub-flavoured Markdown table.
 * Escape existing backslashes first so they cannot neutralise pipe escaping.
 * Also neutralise inline HTML and line-separator injections.
 * This is report rendering only; never authorizes production data.
 */
export function escapeMarkdownTableCell(value) {
  return String(value)
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/\\/gu, "\\\\")
    .replace(/\|/gu, "\\|")
    .replace(/[\r\n\u2028\u2029]+/gu, " ");
}
