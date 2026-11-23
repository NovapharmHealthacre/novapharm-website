import test from "node:test";
import assert from "node:assert/strict";
import { canShip, canShipFromLiveReceipts, extractLiveSourceReceipt } from "./check-pages-monotonic-release.mjs";

const a="a".repeat(40), b="b".repeat(40), c="c".repeat(40);
test("approved newer build may publish despite unrelated newer main commits", () => {
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:"ahead"}),true);
});
test("current main and candidate exactly match", () => {
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:b,publishedToCandidate:"ahead",candidateToMain:"identical"}),true);
});
test("publishing the already live build is safe but a rollback is not", () => {
  assert.equal(canShip({publishedSha:b,candidateSha:b,mainSha:c,publishedToCandidate:"identical",candidateToMain:"ahead"}),true);
  assert.equal(canShip({publishedSha:c,candidateSha:b,mainSha:c,publishedToCandidate:"behind",candidateToMain:"ahead"}),false);
});
test("diverged history, missing deployment and unknown comparisons fail closed", () => {
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"diverged",candidateToMain:"ahead"}),false);
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:"behind"}),false);
  assert.equal(canShip({publishedSha:"",candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:"ahead"}),false);
  assert.equal(canShip({publishedSha:a,candidateSha:b,mainSha:c,publishedToCandidate:"ahead",candidateToMain:undefined}),false);
});

const audit={sourceSha:a,origin:"https://novapharmhealthcare.com",total:6,passed:6,
  results:["/","/legal/accessibility/","/contact/","/products/","/capabilities/","/oncology/"]
    .map(route=>({route,status:200,passed:true,errors:[]}))};
test("disconnected deployment SHA still requires six independently verified live source receipts",()=>{
  const v={lastDeploymentSha:c,liveSourceSha:a,candidateSha:b,mainSha:b,
    liveSourceToCandidate:"ahead",candidateToMain:"identical",audit};
  assert.equal(canShipFromLiveReceipts(v),true);
  for(const invalid of [
    {...v,audit:null},
    {...v,audit:{...audit,passed:5}},
    {...v,audit:{...audit,sourceSha:c}},
    {...v,audit:{...audit,origin:"https://untrusted.example"}},
    {...v,audit:{...audit,results:audit.results.slice(1)}},
    {...v,audit:{...audit,results:[...audit.results.slice(0,5),audit.results[0]]}},
    {...v,audit:{...audit,results:audit.results.map((r,i)=>i===2?{...r,errors:["Contact missing"]}:r)}},
    {...v,liveSourceToCandidate:"behind"},
    {...v,liveSourceToCandidate:"diverged"},
    {...v,candidateToMain:"behind"},
    {...v,lastDeploymentSha:""}
  ]) assert.equal(canShipFromLiveReceipts(invalid),false);
});
test("unique exact source SHA extraction rejects missing, duplicate and oversized HTML",()=>{
  const meta=sha=>'<meta name="novapharm-source-sha" content="'+sha+'">';
  assert.equal(extractLiveSourceReceipt("<head>"+meta(a)+"</head>"),a);
  assert.equal(extractLiveSourceReceipt("<head></head>"),"");
  assert.equal(extractLiveSourceReceipt(meta(a)+meta(a)),"");
  assert.equal(extractLiveSourceReceipt("X".repeat(1600001)),"");
});
