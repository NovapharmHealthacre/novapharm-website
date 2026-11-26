import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const checker=fileURLToPath(new URL("./check-links.mjs",import.meta.url));
function probe(files) {
  const root=mkdtempSync(join(tmpdir(),"novapharm-link-template-"));
  try {
    for(const [path,body] of Object.entries(files)){
      const target=resolve(root,path);
      mkdirSync(resolve(target,".."),{recursive:true});
      writeFileSync(target,body);
    }
    return spawnSync(process.execPath,[checker,root],{encoding:"utf8"});
  } finally { rmSync(root,{recursive:true,force:true}); }
}
const template=refs=>`<!doctype html><html><body>${refs.map(ref=>`<a href="${ref}">Link</a>`).join("")}</body></html>`;
test("exact SES URL substitutions permitted in campaign templates only",()=>{
  const result=probe({"index.html":"<main>Index</main>","docs/campaigns/pharmacy-partners-2026-11.html":template(["{{brand_logo_url}}","{{unsubscribe_url}}","/"])});
  assert.equal(result.status,0,result.stderr);
});
test("unknown campaign placeholder remains a broken link",()=>{
  const result=probe({"index.html":"Index","docs/campaigns/template.html":template(["{{unexpected_url}}"])});
  assert.notEqual(result.status,0,result.stdout);
  assert.match(result.stderr,/unexpected_url/);
});
test("template substitutions are forbidden in published HTML",()=>{
  const result=probe({"index.html":template(["{{unsubscribe_url}}"])});
  assert.notEqual(result.status,0,result.stdout);
});
test("normal missing local files remain errors",()=>{
  const result=probe({"index.html":"Index","docs/campaigns/template.html":template(["/missing-asset.svg"])});
  assert.notEqual(result.status,0,result.stdout);
  assert.match(result.stderr,/missing-asset/);
});
