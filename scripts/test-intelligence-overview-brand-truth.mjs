import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatIntelligenceOverviewMetric } from "../apps/portal/lib/intelligence-overview-metric.mjs";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("overview distinguishes unknown from observed zero and rejects invalid or duplicate counts",()=>{
 const f=v=>formatIntelligenceOverviewMetric({metrics:[{key:"medicines",value:v}]},"medicines");
 assert.equal(f(0),"0"); assert.equal(f(50593),"50,593");
 for(const v of [null,undefined,NaN,Infinity,-1,1.5,"0"]) assert.equal(f(v),"Not available");
 assert.equal(formatIntelligenceOverviewMetric({metrics:[]},"medicines"),"Not available");
 assert.equal(formatIntelligenceOverviewMetric({metrics:[{key:"medicines",value:1},{key:"medicines",value:2}]},"medicines"),"Not available");
});
test("protected Intelligence uses approved semantic tokens and keeps accessible navigation",()=>{
 const css=read("apps/portal/components/medicines-intelligence.module.css");
 for(const token of ["--mi-ink: #0b0b0e","--mi-line: #dedcd5","--mi-soft: #f8f7f3","--mi-surface: #ffffff","--mi-blue: #2546d8","--mi-red: #9d1b32"]) assert.ok(css.includes(token),token);
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.match(css,/forced-colors: active/);
 const component=read("apps/portal/components/medicines-intelligence.tsx");
 for(const key of ["medicines","pharmacies","population-linked-practices"]) assert.ok(component.includes('formatIntelligenceOverviewMetric(snapshot, "'+key+'")'));
 assert.match(component,/Protected, server-authorised, no public caching/);
 assert.match(component,/aria-controls="medicines-navigation-panel"/);
 assert.match(component,/aria-keyshortcuts="Meta\+K Control\+K"/);
});
