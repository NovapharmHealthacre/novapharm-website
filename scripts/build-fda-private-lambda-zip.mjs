#!/usr/bin/env node
/**
 * Offline-only FDA Lambda ZIP assembler. Creates no AWS resources, clients,
 * credentials, routes, functions, billing, DNS changes or data publications.
 * Usage: node scripts/build-fda-private-lambda-zip.mjs /tmp/fda-private.zip
 */
import { mkdtempSync, mkdirSync, copyFileSync, statSync, readFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const outputArg=process.argv[2];
if(!outputArg || !outputArg.endsWith(".zip"))
  throw new Error("Supply a destination .zip path; no deployments are supported.");
const output=resolve(outputArg);
const relativePaths=[
  "deployment/aws/fda-private-lambda/index.mjs",
  "src/core/regulatory/fda-aws-lambda-entry.mjs",
  "src/core/regulatory/fda-private-runtime.mjs",
  "src/core/regulatory/fda-private-http-handler.mjs",
  "src/core/regulatory/fda-dynamodb-quota.mjs",
  "src/core/regulatory/openfda-labels.mjs",
  "src/core/regulatory/openfda-evidence.mjs"
];
if(output.startsWith(root+"/") && /\/assets\/|\/apps\/|\/products\//u.test(output))
  throw new Error("Do not place private Lambda artifact in public web directories.");
const temporary=mkdtempSync(join(tmpdir(),"nova-fda-zip-"));
const files=[];
try{
  for(const path of relativePaths){
    const source=resolve(root,path);
    const destination=join(temporary,path.endsWith("/index.mjs")?"index.mjs":path);
    if(!statSync(source).isFile())throw new Error("Missing FDA source: "+path);
    mkdirSync(dirname(destination),{recursive:true});
    copyFileSync(source,destination);
    utimesSync(destination,new Date("2020-01-01T00:00:00Z"),new Date("2020-01-01T00:00:00Z"));
    files.push(path.endsWith("/index.mjs")?"index.mjs":path);
  }
  mkdirSync(dirname(output),{recursive:true});
  const result=spawnSync("zip",["-X","-q",output,...files.sort()],{
    cwd:temporary,encoding:"utf8",timeout:15000
  });
  if(result.status!==0)throw new Error("ZIP assembly failed: "+String(result.stderr||"").slice(0,160));
  const digest=createHash("sha256").update(readFileSync(output)).digest("hex");
  process.stdout.write(JSON.stringify({
    artifact:output,files:files.length,sha256:digest,
    handler:"index.handler",runtime:"nodejs22.x",approval:"NOT_GRANTED",
    deployed:false
  })+"\n");
}finally{
  rmSync(temporary,{recursive:true,force:true});
}
