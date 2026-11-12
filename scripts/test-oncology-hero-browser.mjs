import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, webkit } from "playwright";

const origin = process.env.PUBLIC_PAGES_BASE_URL || "http://127.0.0.1:4310";
const artifactDir = path.resolve(process.env.ONCOLOGY_HERO_ARTIFACT_ROOT || "artifacts/oncology-hero");
const viewports = [
  { name:"mobile-390", width:390, height:844 },
  { name:"tablet-768", width:768, height:1024 },
  { name:"desktop-1440", width:1440, height:900 },
  { name:"wide-1728", width:1728, height:1000 }
];

for (const [engine, browserType] of [["chromium",chromium],["webkit",webkit]]) {
  const browser = await browserType.launch({headless:true});
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({
        viewport: {width:viewport.width,height:viewport.height},
        locale:"en-GB", reducedMotion:"reduce", colorScheme:"light"
      });
      try {
        const response=await page.goto(origin+"/oncology/",{waitUntil:"networkidle",timeout:30000});
        assert.equal(response?.status(),200,`${engine} ${viewport.name}: page HTTP`);
        await page.locator(".npoc-hope-hero").waitFor({state:"visible"});
        // Lazy category images must be decoded *while intersecting the viewport*.
        // Scrolling past all cards before awaiting their decode can leave earlier
        // lazy images unloaded indefinitely on WebKit and busy CI runners.
        // Preserve the real public lazy-loading behaviour and strict 15s limit.
        await page.evaluate(async () => {
          await Promise.race([
            document.fonts.ready,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Oncology fonts did not load within 15 seconds")), 15_000)),
          ]);
        });
        for (const image of await page.locator(".npoc-hope-hero img,.npoc-focus-cards img").all()) {
          await image.scrollIntoViewIfNeeded({timeout:15_000});
          await image.evaluate(async (img) => {
            const src = img.currentSrc || img.src;
            await Promise.race([
              img.decode(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Oncology image ${src} did not load within 15 seconds`)), 15_000)),
            ]);
            if (!img.complete || img.naturalWidth <= 0) {
              throw new Error(`Oncology image is missing or broken: ${src}`);
            }
          });
        }
        const layout=await page.evaluate(() => {
          const hero=document.querySelector(".npoc-hope-hero");
          const imageLayer=hero?.querySelector(".npoc-hero-visual");
          const image=imageLayer?.querySelector("img");
          const heading=hero?.querySelector("h1");
          const cards=Array.from(document.querySelectorAll(".npoc-focus-cards .npoc-focus-card"));
          const rect=node=>node?.getBoundingClientRect();
          const mask=imageLayer?getComputedStyle(imageLayer):null;
          return {
            heading:heading?.textContent?.trim(),
            hasAnnotation:!!document.querySelector(".npoc-image-note"),
            heroWidth:rect(hero)?.width || 0,
            heroHeight:rect(hero)?.height || 0,
            copyX:rect(hero?.querySelector(".npoc-hero-copy"))?.x || 0,
            viewportWidth:innerWidth,
            imageLoaded:!!image?.complete && image.naturalWidth>0,
            imageFit:image?getComputedStyle(image).objectFit:null,
            portraitWidth:rect(image)?.width||0,
            portraitHeight:rect(image)?.height||0,
            layerWidth:rect(imageLayer)?.width||0,
            fade:[mask?.maskImage,mask?.webkitMaskImage].some(value=>typeof value==="string"&&value.includes("gradient")),
            focusHeadingLines: (() => { const h=document.querySelector(".npoc-focus-copy h2"); return h ? Math.round(rect(h).height/parseFloat(getComputedStyle(h).lineHeight)) : 0; })(),
            cards:cards.map(card=>({
              x:rect(card)?.x||0,y:rect(card)?.y||0,
              width:rect(card)?.width||0,height:rect(card)?.height||0,
              labelPosition:getComputedStyle(card.querySelector("span")).position
            })),
            pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
          };
        });
        const label=`${engine} ${viewport.name}`;
        assert.match(layout.heading,/A Hope for\s*Tomorrow\./,`${label}: heading`);
        assert.equal(layout.hasAnnotation,false,`${label}: removed annotation returned`);
        assert.ok(layout.imageLoaded,`${label}: portrait did not load`);
        assert.equal(layout.imageFit,viewport.width>=1101?"cover":"contain",`${label}: desktop photograph must fill its canvas without a letterbox seam; smaller screens preserve portrait framing`);
        assert.ok(layout.portraitWidth>260 && layout.portraitHeight>200,`${label}: portrait collapsed`);
        assert.ok(layout.heroWidth>=layout.viewportWidth-2,`${label}: hero is not full width`);
        assert.equal(layout.cards.length,3,`${label}: three category images`);
        assert.ok(layout.cards.every(card=>card.width>=170 && card.height>=245),`${label}: cards too small`);
        assert.ok(layout.cards.every(card=>Math.abs(card.y-layout.cards[0].y)<2),`${label}: cards not aligned`);
        assert.ok(layout.cards.every(card=>Math.abs(card.height-layout.cards[0].height)<2),`${label}: card heights differ`);
        assert.ok(layout.cards.every(card=>card.labelPosition==="absolute"),`${label}: labels not overlaid`);
        assert.ok(layout.pageOverflow<=2,`${label}: document horizontal overflow`);
        if(viewport.width>760){
          assert.ok(layout.layerWidth/layout.heroWidth>=(viewport.width>=1101?.55:.7),`${label}: image not integrated into hero`);
          assert.equal(layout.fade,true,`${label}: photo has a hard boundary, no gradient mask`);
        }else{
          assert.equal(layout.fade,false,`${label}: mobile photo should be unmasked`);
        }
        // Screenshot SS2, 12 November: desktop hero text starts near the left
        // margin and three balanced cards fill the remaining portfolio row.
        if(viewport.width>=1101){
          assert.ok(layout.copyX/layout.heroWidth<=.095,`${label}: hero content drifts too far right`);
          assert.ok(layout.heroHeight>=500 && layout.heroHeight<=635,`${label}: hero is not an editorial banner`);
          assert.ok(layout.cards.every(card=>card.width>=.18*layout.viewportWidth),`${label}: portfolio cards are too narrow`);
          assert.ok(layout.cards.every(card=>card.height<=325),`${label}: portfolio cards are too tall`);
          assert.equal(layout.focusHeadingLines,2,`${label}: Selected Therapies / Real Impact must fit two editorial lines`);
          assert.ok(layout.cards[0].x<.37*layout.viewportWidth,`${label}: portfolio row has excess left whitespace`);
        }
        const destination=path.join(artifactDir,engine,viewport.name);
        await mkdir(destination,{recursive:true});
        await page.locator(".npoc-hope-hero").screenshot({path:path.join(destination,"hero.png"),animations:"disabled"});
        await page.locator(".npoc-hope-focus").screenshot({path:path.join(destination,"focus.png"),animations:"disabled"});
        console.log(`PASS ${label}: full-bleed hero, seamless desktop fade, uncut portrait, 3 aligned cards, no overflow`);
      }finally{await page.close();}
    }
  }finally{await browser.close();}
}
console.log("Oncology hero acceptance passed on Chromium and Safari/WebKit for all 4 viewports.");
