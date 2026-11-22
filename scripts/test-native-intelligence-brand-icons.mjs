import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const text=p=>readFileSync(resolve(p),"utf8");
const bin=p=>readFileSync(resolve(p));
const hash=p=>createHash("sha256").update(bin(p)).digest("hex");
const dimensions=p=>{
  const b=bin(p);
  assert.equal(b.subarray(0,8).toString("hex"),"89504e470d0a1a0a",p+" PNG signature");
  return [b.readUInt32BE(16),b.readUInt32BE(20)];
};
const base="native/novapharm-intelligence-ios/App/Assets.xcassets/AppIcon.appiconset/";
const android="native/novapharm-intelligence-android/app/src/main/res/";
const report=JSON.parse(text("audit/generated/native-intelligence-icon-provenance.json"));
const official=JSON.parse(text("config/brand-identities.json")).brands.intelligence;
const checkColour=(a,b)=>{
  const v=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)/255).map(y=>y<=.04045?y/12.92:((y+.055)/1.055)**2.4);
  const L=x=>{const [r,g,b]=v(x);return .2126*r+.7152*g+.0722*b};
  return (Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05);
};

test("all native assets derive from the byte-approved Intelligence SVG",()=>{
 assert.equal(official.hex,"#2546D8");
 assert.equal(official.browserIconZipSha256,hash("assets/brand/novapharm-intelligence-favicon.svg"));
 assert.equal(report.sourceSha256,official.browserIconZipSha256);
 assert.equal(report.color,official.hex);
 assert.equal(report.lightInk,"#0B0B0E");
 assert.equal(report.outputs.length,15);
 for(const asset of report.outputs){
   assert.equal(hash(asset.filename),asset.sha256,asset.filename+" does not match provenance");
   assert.equal(bin(asset.filename).length,asset.bytes);
 }
});

test("XcodeGen builds three system-aware 1024px iOS icon assets",()=>{
 const p=JSON.parse(text(base+"Contents.json"));
 assert.equal(p.images.length,3);
 assert.ok(text("native/novapharm-intelligence-ios/project.yml").includes("ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon"));
 for(const i of p.images){
  assert.deepEqual(dimensions(base+i.filename),[1024,1024]);
  assert.equal(i.idiom,"universal");
 }
 assert.deepEqual(p.images[1].appearances,[{appearance:"luminosity",value:"dark"}]);
 assert.deepEqual(p.images[2].appearances,[{appearance:"luminosity",value:"tinted"}]);
});

test("Android launcher has density-specific icons plus source-verified adaptive foreground",()=>{
 const manifest=text("native/novapharm-intelligence-android/app/src/main/AndroidManifest.xml");
 assert.ok(manifest.includes('android:icon="@mipmap/ic_launcher"'));
 assert.ok(manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"'));
 assert.ok(!manifest.includes("android.permission.INTERNET"),"offline research build must stay offline");
 for(const [density,size] of [["mdpi",48],["hdpi",72],["xhdpi",96],["xxhdpi",144],["xxxhdpi",192]]){
   for(const name of ["ic_launcher.png","ic_launcher_round.png"]){
    assert.deepEqual(dimensions(android+"mipmap-"+density+"/"+name),[size,size]);
   }
 }
 for(const name of ["ic_launcher_foreground.png","ic_launcher_monochrome.png"])
  assert.deepEqual(dimensions(android+"drawable-nodpi/"+name),[432,432]);
 for(const name of ["ic_launcher.xml","ic_launcher_round.xml"]){
  const adaptive=text(android+"mipmap-anydpi-v26/"+name);
  assert.ok(adaptive.includes("android:drawable=\"@color/nova_research_accent\""));
  assert.ok(adaptive.includes("android:drawable=\"@drawable/ic_launcher_foreground\""));
  assert.ok(adaptive.includes("android:drawable=\"@drawable/ic_launcher_monochrome\""));
 }
});

test("Sovereign Black is applied to light mode without destroying semantic native dark mode",()=>{
 const light=text(android+"values/colors.xml");
 const dark=text(android+"values-night/colors.xml");
 assert.ok(light.includes("#0B0B0E"));
 assert.ok(light.includes("#2546D8"));
 assert.ok(dark.includes("#F5F5F7"));
 assert.ok(dark.includes("#A8B8FF"));
 assert.ok(checkColour("#FFFFFF","#0B0B0E")>=7);
 const swift=text("native/novapharm-intelligence-ios/App/NovaTheme.swift");
 assert.ok(swift.includes("static let primaryInk"));
 assert.ok(swift.includes("UIColor.label"));
 assert.ok(swift.includes("red: 11.0 / 255"));
});
