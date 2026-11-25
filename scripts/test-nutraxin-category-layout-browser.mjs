// Isolated public-category geometry regression; no external requests or checkout.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";
const origin = new URL(process.env.PUBLIC_PAGES_BASE_URL || "http://127.0.0.1:4310").origin;
const categories = JSON.parse(readFileSync("assets/data/nutraxin-uk-category-intents.json","utf8")).categories;
assert.equal(categories.length,5);
const out = resolve(process.env.PUBLIC_PAGES_BROWSER_ARTIFACT_ROOT || "artifacts/public-pages-browser","nutraxin-category-layout");
mkdirSync(out,{recursive:true});
const results=[], failures=[];
const viewports=[{name:"desktop",width:1440,height:900},{name:"tablet",width:768,height:1024},{name:"mobile",width:390,height:844},{name:"small-mobile",width:320,height:720},{name:"print",width:794,height:1123}];
for (const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]) {
  const browser=await engine.launch({headless:true});
  try {
    const context=await browser.newContext({colorScheme:"light",reducedMotion:"reduce"});
    await context.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage();
    for (const viewport of viewports) for (const category of categories) {
      const label=engineName+"/"+viewport.name+"/"+category.slug;
      try {
        await page.setViewportSize({width:viewport.width,height:viewport.height});
        await page.emulateMedia({media:viewport.name==="print"?"print":"screen"});
        const response=await page.goto(origin+"/products/nutraxin/"+category.slug+"/",{waitUntil:"load",timeout:20000});
        assert.equal(response.status(),200,label);
        await page.evaluate(async()=>{await document.fonts.ready; const imgs=[...document.querySelectorAll(".nx-category-card img")]; for(const img of imgs) img.loading="eager"; await Promise.all(imgs.map(img=>img.decode()));});
        const metrics=await page.evaluate(()=>{
          const grid=document.querySelector(".nx-category-grid");
          const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
          return {overflow:document.documentElement.scrollWidth>innerWidth+3, columns:getComputedStyle(grid).gridTemplateColumns,cards:[...grid.querySelectorAll(".nx-category-card")].map(card=>{
            const image=card.querySelector("img"),copy=card.querySelector(".nx-category-copy"),link=card.querySelector(".nx-category-link"),visual=card.querySelector(".nx-category-visual");
            return {card:rect(card),image:rect(image),visual:rect(visual),copy:rect(copy),link:rect(link),href:link.getAttribute("href"),fit:getComputedStyle(image).objectFit,naturalRatio:image.naturalWidth/image.naturalHeight,loaded:image.complete&&image.naturalWidth>0,overflow:card.scrollWidth>card.clientWidth+3,breakInside:getComputedStyle(card).breakInside};
          })};
        });
        assert.equal(metrics.cards.length,category.products.length,label);
        assert.equal(metrics.overflow,false,label+" page overflow");
        for (const [i,c] of metrics.cards.entries()) {
          assert(c.loaded&&c.fit==="contain",label+" pack missing or cropped");
          assert(c.image.width>=(viewport.name==="print"?100:160),label+" narrow pack: "+c.image.width);
          assert(c.image.height>=90,label+" collapsed pack");
          assert(Math.abs(Math.log(c.naturalRatio/(c.image.width/c.image.height)))<.12,label+" image element aspect ratio differs from source");
          assert(c.image.x>=c.visual.x-2&&c.image.right<=c.visual.right+2,label+" image spills outside visual");
          assert.equal(c.overflow,false,label+" card overflow");
          assert.equal(c.href,"/products/nutraxin/"+category.products[i]+"/",label+" wrong product link");
          if(viewport.name==="print") {
            assert(c.visual.right<=c.copy.x+3,label+" print columns overlap");
            assert(c.breakInside.includes("avoid"),label+" print card can split");
          } else {
            assert(c.visual.bottom<=c.copy.y+3,label+" image and text overlap");
            assert(c.link.height>=44,label+" CTA target too small");
          }
        }
        if(viewport.name==="mobile"||viewport.name==="small-mobile")assert(metrics.cards[1].card.y>metrics.cards[0].card.y,label+" mobile must stack");
        if(viewport.name==="desktop"||viewport.name==="tablet")assert(Math.abs(metrics.cards[1].card.y-metrics.cards[0].card.y)<4,label+" expected two columns");
        results.push({label,pass:true});
        if(viewport.name==="desktop"||viewport.name==="mobile")await page.screenshot({path:resolve(out,category.slug+"-"+engineName+"-"+viewport.name+".png"),fullPage:true});
        if(viewport.name==="print"&&engineName==="chromium")await page.pdf({path:resolve(out,category.slug+".pdf"),format:"A4",printBackground:true});
      } catch(error){failures.push({label,error:String(error.message||error)});}
    }
    await context.close();
  } finally {await browser.close();}
}
writeFileSync(resolve(out,"audit.json"),JSON.stringify({expected:50,passed:results.length,results,failures},null,2)+"\n");
console.log(JSON.stringify({expected:50,passed:results.length,failures},null,2));
assert.equal(failures.length,0,"Category retail layout regression");
assert.equal(results.length,50);
