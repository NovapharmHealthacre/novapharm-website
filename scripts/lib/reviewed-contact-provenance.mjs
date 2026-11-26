// Only one exact publisher-inserted provenance receipt is permitted. Parsing
// is bounded and uses literal scans rather than backtracking HTML regexes.
const START='  <meta name="novapharm-source-sha" content="';
const END='">\n';
const NAME="novapharm-source-sha";
function exactSha(value) {
  return value.length===40 && [...value].every(ch=>ch>="0"&&ch<="9" || ch>="a"&&ch<="f");
}
export function unstampedReviewedContactHtml(html) {
  if(typeof html!=="string" || html.length>1600000) throw Error("Reviewed Contact HTML unavailable or too large");
  const at=html.indexOf(START);
  if(at<0 || html.indexOf(NAME)!==at+START.indexOf(NAME) ||
     html.indexOf(NAME,at+START.length)!==-1)
    throw Error("Managed Contact source receipt missing, duplicated or malformed");
  const sourceSha=html.slice(at+START.length,at+START.length+40);
  const stamp=START+sourceSha+END;
  if(!exactSha(sourceSha) || html.slice(at,at+stamp.length)!==stamp ||
     !html.startsWith("</head>",at+stamp.length))
    throw Error("Managed Contact source receipt has unexpected shape");
  return {sourceSha,unstampedHtml:html.slice(0,at)+html.slice(at+stamp.length)};
}
