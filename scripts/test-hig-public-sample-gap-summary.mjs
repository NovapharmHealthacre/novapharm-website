import assert from "node:assert/strict";
import test from "node:test";
import { summarizeHigPublicSampleGaps } from "./hig-public-sample-gap-summary.mjs";

const good = {route:"/capabilities/",httpStatus:200,contentType:"text/html",lang:"en",
  h1Count:1,sourceSha:"a".repeat(40),errors:[]};
test("healthy source observations do not manufacture live failures",()=>{
  assert.deepEqual(summarizeHigPublicSampleGaps([good]),[]);
});
test("known static routes expose missing provenance without printing HTML or arbitrary errors",()=>{
  const row={route:"/contact/",httpStatus:200,contentType:"text/html; charset=utf-8",
    lang:"en-GB",h1Count:1,sourceSha:null,
    errors:["No published provenance SHA"]};
  assert.deepEqual(summarizeHigPublicSampleGaps([row]),[{
    route:"/contact/",httpStatus:200,html:true,hasDocumentLanguage:true,
    singleH1:true,hasSourceSha:false,issueTypes:["source_sha_absent"]
  }]);
});
test("untrusted error strings or URLs are redacted even when a request fails",()=>{
  const secret="secret-do-not-log";
  const result=summarizeHigPublicSampleGaps([{route:"https://untrusted.invalid/"+secret,
    httpStatus:418,contentType:"text/plain; token="+secret,lang:"",
    h1Count:0,sourceSha:null,errors:["Unexpected network error: "+secret]}]);
  const bytes=JSON.stringify(result);
  assert.ok(!bytes.includes(secret));
  assert.ok(!bytes.includes("untrusted.invalid"));
  assert.equal(result[0].route,"[unrecognized route]");
  assert.deepEqual(result[0].issueTypes,["other_redacted"]);
});
test("missing language, H1, response type and accessibility text yield bounded problem codes",()=>{
  const result=summarizeHigPublicSampleGaps([{route:"/legal/accessibility/",httpStatus:200,
    contentType:"text/plain",lang:null,h1Count:2,sourceSha:"b".repeat(40),
    errors:["Response not HTML","Missing English HTML language","Missing or duplicate H1",
      "Current accessibility disclosure cannot be confirmed"]}]);
  assert.deepEqual(result[0].issueTypes,
    ["unexpected_content_type","language","heading","disclosure"]);
});
test("helper rejects invalid report collections rather than producing a green empty summary",()=>{
  assert.throws(()=>summarizeHigPublicSampleGaps({results:[]}),TypeError);
});
