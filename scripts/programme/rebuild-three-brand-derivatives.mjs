#!/usr/bin/env node
/** Source-verified PNG, ICO and JPEG derivatives from owner-approved SVG vectors.
 * Never claim these generated binaries are byte-identical to uploaded ZIP files.
 * No network, external art, fonts or publication side effects.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root=process.cwd(), abs=p=>path.join(root,p);
const sha=b=>createHash("sha256").update(b).digest("hex");
const identities=JSON.parse(await readFile(abs("config/brand-identities.json"),"utf8"));
assert.equal(identities.approvedOn,"2026-11-23");
// All light-brand social surfaces inherit the owner-approved white, never retired mineral white.
const officialLight=identities.neutralPalette?.primaryWhite?.hex;
assert.equal(officialLight,"#FFFFFF","Unapproved light social artwork background");
const defs={
  healthcare:{logo:"novapharm-healthcare-logo.svg",icon:"favicon.svg",hex:"#9D1B32",h:258,p:"",social:["novapharm-open-graph-1200x630-white.jpg","novapharm-open-graph-1200x630-red.jpg"]},
  distribution:{logo:"novapharm-distribution-logo.svg",icon:"novapharm-distribution-favicon.svg",hex:"#3D0B13",h:222,p:"novapharm-distribution-",social:["novapharm-distribution-open-graph-1200x630-white.jpg","novapharm-distribution-open-graph-1200x630-garnet.jpg"]},
  intelligence:{logo:"novapharm-intelligence-logo.svg",icon:"novapharm-intelligence-favicon.svg",hex:"#2546D8",h:354,p:"novapharm-intelligence-",social:["novapharm-intelligence-open-graph-1200x630-light.jpg","novapharm-intelligence-open-graph-1200x630-night.jpg"]},
};
const outputs=new Map();
const stage=(p,data)=>{assert.match(p,/^assets\/brand\/[a-z0-9.\/-]+$/);assert.ok(Buffer.isBuffer(data)&&data.length);outputs.set(p,data);};
const iconIco=(pngs)=>{
  const sz=[16,32,48,64,256],head=Buffer.alloc(6+sz.length*16);
  head.writeUInt16LE(1,2);head.writeUInt16LE(sz.length,4);let offset=head.length;
  for(let i=0;i<sz.length;i++){const at=6+i*16,s=sz[i],data=pngs[i];
    head.writeUInt8(s===256?0:s,at);head.writeUInt8(s===256?0:s,at+1);
    head.writeUInt16LE(1,at+4);head.writeUInt16LE(32,at+6);
    head.writeUInt32LE(data.length,at+8);head.writeUInt32LE(offset,at+12);offset+=data.length;}
  return Buffer.concat([head,...pngs]);
};
const square=(svg,n)=>sharp(svg).resize(n,n,{fit:"fill"}).png({compressionLevel:9}).toBuffer();
const social=async(primary,reverse,bg,dark)=>{
  const png=await sharp(dark?reverse:primary).resize({width:960,withoutEnlargement:true}).png().toBuffer();
  const {width,height}=await sharp(png).metadata();
  return sharp({create:{width:1200,height:630,channels:4,background:bg}})
    .composite([{input:png,left:Math.floor((1200-width)/2),top:Math.floor((630-height)/2)}])
    .flatten({background:bg}).jpeg({quality:94,chromaSubsampling:"4:4:4"}).toBuffer();
};
for(const [key,d] of Object.entries(defs)){
  const source=identities.brands[key];assert.equal(d.hex,source.hex);
  const primary=await readFile(abs("assets/brand/"+d.logo));
  const icon=await readFile(abs("assets/brand/"+d.icon));
  assert.equal(sha(primary),source.primaryVectorZipSha256,key+" source vector mismatch");
  assert.equal(sha(icon),source.browserIconZipSha256,key+" favicon source mismatch");
  assert.ok(primary.toString().includes(d.hex));assert.doesNotMatch(primary.toString(),/<script|<foreignObject|javascript:/i);
  stage("assets/brand/"+d.logo.replace(".svg",".png"),
    await sharp(primary).resize(2048,d.h,{fit:"fill"}).png({compressionLevel:9}).toBuffer());
  const sizes=[16,32,48,64,180,192,512,1024,256],rendered=new Map();
  for(const s of sizes)rendered.set(s,await square(icon,s));
  const p=key==="healthcare"
   ?{ico:"favicon.ico",touch:"apple-touch-icon.png",small:"pwa-icon-192.png",large:"pwa-icon-512.png",mask:"pwa-maskable-512.png",app:"novapharm-healthcare-app-icon-1024.png"}
   :{ico:d.p+"favicon.ico",touch:d.p+"apple-touch-icon.png",small:d.p+"pwa-icon-192.png",large:d.p+"pwa-icon-512.png",mask:d.p+"pwa-maskable-512.png",app:d.p+"app-icon-1024.png"};
  stage("assets/brand/"+p.ico,iconIco([16,32,48,64,256].map(s=>rendered.get(s))));
  stage("assets/brand/"+p.touch,rendered.get(180));
  stage("assets/brand/"+p.small,rendered.get(192));
  stage("assets/brand/"+p.large,rendered.get(512));
  stage("assets/brand/"+p.app,rendered.get(1024));
  const emblem=await square(icon,395);
  stage("assets/brand/"+p.mask,await sharp({create:{width:512,height:512,channels:4,background:d.hex}})
    .composite([{input:emblem,top:58,left:58}]).png({compressionLevel:9}).toBuffer());
  if(key==="healthcare")for(const s of [16,32,48,64])stage("assets/brand/favicon-"+s+"x"+s+".png",rendered.get(s));
  const reverse=await readFile(abs("assets/brand/"+d.logo.replace(".svg","-reverse.svg")));
  const dark=key==="healthcare"?"#9D1B32":key==="distribution"?"#3D0B13":"#0B1023";
  stage("assets/brand/"+d.social[0],await social(primary,reverse,officialLight,false));
  stage("assets/brand/"+d.social[1],await social(primary,reverse,dark,true));
}
const governed=new Map([
  ["novapharm-healthcare-logo.png","02_web/primary_transparent/novapharm-logo-red-2048w.png"],
  ["favicon.ico","03_favicon_pwa/favicon.ico"],
  ["apple-touch-icon.png","03_favicon_pwa/apple-touch-icon.png"],
  ["pwa-icon-192.png","03_favicon_pwa/pwa-icon-192.png"],
  ["pwa-icon-512.png","03_favicon_pwa/pwa-icon-512.png"],
  ["pwa-maskable-512.png","03_favicon_pwa/pwa-maskable-512.png"],
  ["novapharm-open-graph-1200x630-white.jpg","05_social_profile/novapharm-open-graph-1200x630-white.jpg"],
  ["novapharm-open-graph-1200x630-red.jpg","05_social_profile/novapharm-open-graph-1200x630-red.jpg"],
]);
for(const s of [16,32,48,64])governed.set("favicon-"+s+"x"+s+".png","03_favicon_pwa/favicon-"+s+"x"+s+".png");
const base="creative-assets/brand/novapharm-logo-asset-pack/";
const sums=await readFile(abs(base+"SHA256SUMS.txt"),"utf8"),touched=new Set();
const updated=sums.split("\n").map(line=>{
  const found=/^([a-f0-9]{64})  (.+)$/.exec(line);if(!found)return line;
  const match=[...governed].find(([,dest])=>dest===found[2]);if(!match)return line;
  const data=outputs.get("assets/brand/"+match[0]);assert.ok(data);
  outputs.set(base+found[2],data);touched.add(found[2]);return sha(data)+"  "+found[2];
}).join("\n");
assert.equal(touched.size,governed.size,"Governed source/register mapping drift");
outputs.set(base+"SHA256SUMS.txt",Buffer.from(updated));
if(!process.argv.includes("--apply")){
  console.log("PREVIEW: "+outputs.size+" verified generated files, no writes");process.exit(0);
}
for(const [file,data] of outputs){
  await mkdir(path.dirname(abs(file)),{recursive:true});await writeFile(abs(file),data);
}
const provenance="audit/generated/three-brand-raster-provenance.json";
const report={schemaVersion:1,sourceDate:"2026-11-22",method:"SVG source master rasterized by sharp",count:outputs.size,
 lightSocialBackground:officialLight,
 limitation:"Generated PNG, JPEG and ICO are derived, not original ZIP binaries.",
 files:[...outputs].filter(([file])=>file.startsWith("assets/brand/")).map(([file,data])=>({path:file,sha256:sha(data),bytes:data.length}))};
await mkdir(path.dirname(abs(provenance)),{recursive:true});
await writeFile(abs(provenance),JSON.stringify(report,null,2)+"\n");
console.log("Generated "+outputs.size+" staged outputs and provenance; no production publication");
