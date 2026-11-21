import assert from "node:assert/strict";
import test from "node:test";
import { checkpoint, gitBlobIdentity, checkRecoverySnapshot } from "./check-restored-pages-content-baseline.mjs";

test("the recovered publisher checkpoint has distinct verifiable critical file pins", () => {
  assert.match(checkpoint.publisherCommit, /^[a-f0-9]{40}$/);
  assert.equal(Object.keys(checkpoint.files).length,31,"12 core files plus all 19 Nutraxin detail pages");
  const products=Object.keys(checkpoint.files).filter(path=>path.startsWith("products/nutraxin/") && path.endsWith("/index.html") && path.split("/").length===4);
  assert.equal(products.length,19);
  assert.equal(new Set(products).size,19);
  assert.ok(Object.keys(checkpoint.files).includes("index.html"));
  assert.ok(Object.keys(checkpoint.files).includes("contact/index.html"));
  assert.ok(Object.keys(checkpoint.files).includes("products/marketplace/index.html"));
  assert.ok(Object.keys(checkpoint.files).includes("assets/js/nutraxin-retail-store.js"));
  assert.equal(new Set(Object.keys(checkpoint.files)).size,Object.keys(checkpoint.files).length);
});

test("Git blob identity includes file length and raw bytes, including binary", () => {
  const data=Buffer.from([0x00,0xff,0xc0,0x1f]);
  assert.match(gitBlobIdentity(data),/^[a-f0-9]{40}$/);
  assert.notEqual(gitBlobIdentity(data),gitBlobIdentity(Buffer.from([0x00,0xff,0xc0,0x1e])));
  assert.notEqual(gitBlobIdentity(Buffer.from("a")),gitBlobIdentity(Buffer.from("a\n")));
  assert.throws(()=>gitBlobIdentity("not bytes"),/Buffer/);
});

test("unchanged checkpoint passes but silent coordinated rollback never inherits live parity",()=>{
  const paths={"index.html":gitBlobIdentity(Buffer.from("approved")),
    "products/index.html":gitBlobIdentity(Buffer.from("approved products"))};
  const read=path=>{
    if(path.endsWith("/index.html")&&!path.includes("products"))return Buffer.from("approved");
    if(path.endsWith("/products/index.html"))return Buffer.from("approved products");
    throw new Error("missing");
  };
  const ok=checkRecoverySnapshot({tree:"/public",files:paths,read});
  assert.equal(ok.exactCheckpointMatches,2);
  assert.equal(ok.changedOrMissing,0);
  const broken=checkRecoverySnapshot({tree:"/public",files:paths,
    read:path=>path.includes("products")?Buffer.from("OLD PRODUCTS"):Buffer.from("approved")});
  assert.equal(broken.changedOrMissing,1);
  assert.match(broken.rows[1].error,/Changed restored/);
});

test("a missing file and traversal cannot pass the pinned recovery inventory",()=>{
  const missing=checkRecoverySnapshot({tree:"/public",
    files:{"contact/index.html":"a".repeat(40)},
    read:()=>{throw new Error("ENOENT") }});
  assert.equal(missing.changedOrMissing,1);
  assert.match(missing.rows[0].error,/Missing\/unreadable/);
  assert.throws(()=>checkRecoverySnapshot({tree:"/public",
    files:{"../private/session.html":"a".repeat(40)},read:()=>Buffer.alloc(1)}),/Unsafe/);
  assert.throws(()=>checkRecoverySnapshot({tree:"/public",
    files:{"index.html":"bad"},read:()=>Buffer.alloc(1)}),/Invalid expected/);
});

test("neither matching blob pins nor inventory records imply HIG or authorized production signoff",()=>{
  const report=checkRecoverySnapshot({tree:"/public",files:{},read:()=>Buffer.alloc(0)});
  for(const key of ["higAccepted","productionApproved","signedNativeAccepted","protectedPortalAccepted"])
    assert.equal(key in report,false);
});
