import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {gitBlobSha,REVIEWED_CONTACT_BLOBS} from "./verify-public-branding-only-release.mjs";
import {unstampedReviewedContactHtml} from "./lib/reviewed-contact-provenance.mjs";
const template=readFileSync(new URL("../src/content/contact-managed-release.html",import.meta.url),"utf8");
const sha="a".repeat(40);
const receipt='  <meta name="novapharm-source-sha" content="'+sha+'">\n';
const stamped=template.replace("</head>",receipt+"</head>");
test("byte-exact approved managed Contact recovered only from the publisher's single provenance insertion",()=>{
  assert.equal(gitBlobSha(template),REVIEWED_CONTACT_BLOBS["src/content/contact-managed-release.html"]);
  assert.notEqual(gitBlobSha(stamped),gitBlobSha(template));
  const result=unstampedReviewedContactHtml(stamped);
  assert.equal(result.sourceSha,sha);
  assert.equal(result.unstampedHtml,template);
  assert.equal(gitBlobSha(result.unstampedHtml),REVIEWED_CONTACT_BLOBS["src/content/contact-managed-release.html"]);
});
test("missing, duplicate, malformed and extra source receipts are denied",()=>{
  for(const html of [
    template, stamped+receipt, stamped.replace(receipt,receipt+receipt),
    stamped.replace('content="'+sha+'"','content="bogus"'),
    stamped.replace(receipt,receipt.replace("  "," ")),
    stamped.replace(receipt,receipt.replace("\n","")),
    stamped+"<meta name=\"novapharm-source-sha\" content=\""+sha+"\">",
    "x".repeat(1600001)
  ]) assert.throws(()=>unstampedReviewedContactHtml(html));
});
test("Contact markup or API tampering remains detectable after stripping receipt",()=>{
  for(const html of [
    stamped.replace("data-live-b2b-enquiry-form","data-email-enquiry-form"),
    stamped.replace("https://h4dc1e4u57.execute-api.eu-north-1.amazonaws.com","https://unreviewed.example"),
    stamped.replace("#FBFAEF","#FFFFFF")
  ]) {
    const result=unstampedReviewedContactHtml(html);
    assert.notEqual(gitBlobSha(result.unstampedHtml),REVIEWED_CONTACT_BLOBS["src/content/contact-managed-release.html"]);
  }
});
