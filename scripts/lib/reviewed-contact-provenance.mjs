// The approved managed Contact template is immutable. The publisher adds one
// source-SHA receipt immediately before </head>; comparing that rendered HTML
// directly to the unstamped Git blob would falsely report a regression.
// Reject every other modification, duplicate receipt and malformed receipt.
export function unstampedReviewedContactHtml(html) {
  if (typeof html !== "string" || html.length > 1600000) throw Error("Reviewed Contact HTML unavailable or too large");
  const allReceipts=[...html.matchAll(/<meta\b[^>]*\bname=(["'])novapharm-source-sha\1[^>]*>/gi)];
  const expected=/  <meta name="novapharm-source-sha" content="([a-f0-9]{40})">\n(?=<\/head>)/g;
  const stamped=[...html.matchAll(expected)];
  if(allReceipts.length!==1 || stamped.length!==1 ||
     allReceipts[0][0]!==stamped[0][0].trim()) {
    throw Error("Managed Contact provenance is missing, duplicated or not the exactly reviewed stamp");
  }
  return {sourceSha:stamped[0][1],unstampedHtml:html.replace(expected,"")};
}
