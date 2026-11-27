import sharp from "sharp";
import { createHash } from "node:crypto";
import { readFile,writeFile,mkdir } from "node:fs/promises";
import path from "node:path";
const registerPath="docs/retail/brand-logo-source-register-20261127.json";
const register=JSON.parse(await readFile(registerPath,"utf8"));
const stage=path.join(process.env.RUNNER_TEMP,"retail-logo-originals");
const hash=b=>createHash("sha256").update(b).digest("hex");
await mkdir("assets/media/brands",{recursive:true});
for(const b of register.brands){
 if(!/^[a-z-]+$/.test(b.id)||b.displayUrl!=="/assets/media/brands/"+b.id+".png")throw Error("Unexpected logo target");
 const original=await readFile(path.join(stage,b.id+".source"));
 if(hash(original)!==b.originalSha256)throw Error("Original checksum mismatch "+b.id);
 const image=sharp(original,{failOn:"error",limitInputPixels:4096*4096});
 const meta=await image.metadata();
 if(!meta.width||!meta.height||meta.width<20||meta.height<20||meta.width>4096||meta.height>4096||!["png","jpeg","webp"].includes(meta.format)||meta.pages>1)throw Error("Invalid logo raster "+b.id);
 await image.clone().raw().toBuffer();
 const png=meta.format==="png"?original:await image.png().toBuffer();
 await writeFile(b.displayUrl.slice(1),png);
 b.sha256=hash(png);b.retrievedWidth=meta.width;b.retrievedHeight=meta.height;b.deliveryFormat="png";
 b.deliveryTransformation=meta.format==="png"?"byte-exact copy":"PNG encoding of decoded pixels; no recolour or geometry change";
 console.log(b.id+" "+meta.width+"x"+meta.height+" "+b.selectedSourceKind+" "+b.sha256);
 for(const page of ["src/content/products-editorial.html","products/index.html"]){
  let html=await readFile(page,"utf8");
  const re=new RegExp('(src="'+b.displayUrl.replaceAll(".","\\.")+'"[^>]*?width=")\\d+(" height=")\\d+(")');
  if(!re.test(html))throw Error("Missing logo dimensions "+page+" "+b.id);
  html=html.replace(re,(_,a,between,end)=>a+meta.width+between+meta.height+end);
  await writeFile(page,html);
 }
}
await writeFile(registerPath,JSON.stringify(register,null,2)+"\n");
