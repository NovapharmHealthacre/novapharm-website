import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {test} from "node:test";
import {verifyByteStream} from "./data/verify-epd-full-stream.mjs";
const csv="YEAR_MONTH,PRACTICE_CODE,BNF_PRESENTATION_CODE,ITEMS,NIC\n2026-08,ABC123,0208020Z0AAAFA,2,3.45\n";
const bytes=Buffer.from(csv,"utf8");
const sha=createHash("sha256").update(bytes).digest("hex");
function parts(b){return (async function*(){yield b.subarray(0,7);yield b.subarray(7,22);yield b.subarray(22);})();}
test("offline complete stream digest verifies publisher bytes while refusing any customer release",async()=>{
 const r=await verifyByteStream({chunks:parts(bytes),expectedBytes:bytes.length,expectedSha256:sha});
 assert.equal(r.bytes,bytes.length);assert.equal(r.sha256,sha);
 assert.equal(r.physical_newlines,2);
 assert.equal(r.status,"full_csv_integrity_verified_private_only");
 assert.equal(r.accepted_observations,0);
 assert.equal(r.customer_publish_approved,false);
 assert.equal(r.raw_csv_persisted,false);
 assert.equal(r.physical_lines_may_not_equal_csv_records,true);
});
test("size mismatch, hash mismatch and missing headers all fail closed",async()=>{
 for(const opts of [
  {expectedBytes:bytes.length+1,expectedSha256:sha},
  {expectedBytes:bytes.length,expectedSha256:"0".repeat(64)},
  {expectedBytes:bytes.length,expectedSha256:"nope"},
  {expectedBytes:bytes.length,expectedSha256:sha,maxBytes:5},
 ])await assert.rejects(()=>verifyByteStream({chunks:parts(bytes),...opts}),/rejected/);
 const notCsv=Buffer.from("A,B\nC,D\n");
 await assert.rejects(()=>verifyByteStream({chunks:parts(notCsv),
  expectedBytes:notCsv.length,
  expectedSha256:createHash("sha256").update(notCsv).digest("hex")}),/rejected/);
});
test("truncated CSV cannot become verified",async()=>{
 const truncated=bytes.subarray(0,bytes.length-10);
 await assert.rejects(()=>verifyByteStream({chunks:parts(truncated),
  expectedBytes:bytes.length,expectedSha256:sha}),/rejected/);
});
