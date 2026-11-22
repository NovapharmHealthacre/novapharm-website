#!/usr/bin/env node
/**
 * NovaPharm Intelligence native icon source pipeline.
 * Uses only exact owner-verified SVG source and project-local sharp dependency.
 * Generates review-only iOS AppIcon and Android launcher resources.
 * No signing credentials, network access, app store publishing, or Apple font files.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root=process.cwd(), here=p=>path.resolve(root,p);
const sha=b=>createHash("sha256").update(b).digest("hex");
const brand=JSON.parse(await readFile(here("config/brand-identities.json"),"utf8")).brands.intelligence;
const icon=await readFile(here("assets/brand/novapharm-intelligence-favicon.svg"));
assert.equal(sha(icon),brand.browserIconZipSha256,"Native artwork must derive from the approved ZIP favicon source");
assert.equal(brand.hex,"#2546D8");
assert.doesNotMatch(icon.toString(),/<script\b|<foreignObject\b|javascript:|<image\b/i);
const output=new Map();
const ios="native/novapharm-intelligence-ios/App/Assets.xcassets/AppIcon.appiconset/";
const android="native/novapharm-intelligence-android/app/src/main/res/";
const write=(name,bytes)=>{assert.ok(bytes.length>100,name+" empty");output.set(name,bytes)};
const recolor=(value)=>Buffer.from(icon.toString().replace(/#2546D8/gi,value));
const render=async(size,background,foreground)=>{
 const source=recolor(foreground),png=await sharp(source).resize(size,size).png().toBuffer();
 return sharp({create:{width:size,height:size,channels:4,background}})
  .composite([{input:png,left:0,top:0}])
  .png({compressionLevel:9}).toBuffer();
};
const transparent=async(size,color)=>sharp(recolor(color)).resize(size,size).png({compressionLevel:9}).toBuffer();
const light=await render(1024,"#FFFFFF","#2546D8");
const dark=await render(1024,"#0B0B0E","#A8B8FF");
const tinted=await render(1024,"#FFFFFF","#0B0B0E");
write(ios+"AppIcon-1024x1024.png",light);
write(ios+"AppIcon-dark-1024x1024.png",dark);
write(ios+"AppIcon-tinted-1024x1024.png",tinted);
const mipmaps=[["mdpi",48],["hdpi",72],["xhdpi",96],["xxhdpi",144],["xxxhdpi",192]];
for(const [density,size] of mipmaps){
 const bytes=await render(size,"#FFFFFF","#2546D8");
 for(const name of ["ic_launcher.png","ic_launcher_round.png"])write(android+"mipmap-"+density+"/"+name,bytes);
}
write(android+"drawable-nodpi/ic_launcher_foreground.png",await transparent(432,"#FFFFFF"));
write(android+"drawable-nodpi/ic_launcher_monochrome.png",await transparent(432,"#FFFFFF"));
const report={schemaVersion:1,brand:"NovaPharm Intelligence",source:"assets/brand/novapharm-intelligence-favicon.svg",
 sourceSha256:sha(icon),color:"#2546D8",lightInk:"#0B0B0E",status:"unsigned-source-assets-only",
 outputs:[...output].map(([filename,bytes])=>({filename,sha256:sha(bytes),bytes:bytes.length}))};
const registry="audit/generated/native-intelligence-icon-provenance.json";
if(!process.argv.includes("--apply")){console.log("PREVIEW "+output.size+" native PNGs, source SHA "+sha(icon));process.exit(0);}
for(const [file,bytes] of output){await mkdir(path.dirname(here(file)),{recursive:true});await writeFile(here(file),bytes);}
await mkdir(path.dirname(here(registry)),{recursive:true});
await writeFile(here(registry),JSON.stringify(report,null,2)+"\n");
console.log("PASS: wrote "+output.size+" native assets and signed-off provenance data, NOT an app release");
