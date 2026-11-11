import assert from "node:assert/strict";
import test from "node:test";
import { buildObservedMedicineChange as build } from "../src/core/medicine-observed-change.mjs";
const id="medicine-0123456789abcdef0123456789abcdef";
const series=[
  {month_key:"2026-07",metric_value:10},
  {month_key:"2026-08",metric_value:15},
  {month_key:"2026-09",metric_value:20},
];
const args=()=>({
 medicineId:id,dataset:"epd",sourceId:"nhsbsa.epd",metric:"items",dataState:"accepted_facts",
 series,reconciliation:{applicable:true,reconciles:true,seriesTruncated:false}
});
test("recorded three-month change retains source and method without opportunity claim",()=>{
 const v=build(args());
 assert.equal(v.contract,"novapharm.intelligence.observed-medicine-change.v1");
 assert.equal(v.state,"observed_change_candidate_requires_review");
 assert.equal(v.observation.absoluteChange,10);
 assert.equal(v.observation.percentageChange,100);
 assert.deepEqual(v.observation.comparisonMonths,["2026-07","2026-08","2026-09"]);
 assert.equal(v.decisionReady,false);
 assert.equal(v.sourceRights,"must_be_checked_at_service_boundary");
 assert.equal(v.observation.directionalLabel,"increased");
 assert.deepEqual(v,build({...args(),series:[...series].reverse()}));
});
test("zero baseline reports absolute change but cannot claim defined percentage",()=>{
 const v=build({...args(),series:[{month_key:"2026-07",metric_value:0},series[1],series[2]]});
 assert.equal(v.observation.absoluteChange,20);
 assert.equal(v.observation.percentageChange,null);
});
test("no medicine, no accepted facts, no reconciliation, truncated data and invalid source produce no signal",()=>{
 const cases=[
  {medicineId:null},{medicineId:"bad"}, {dataState:"source_not_ingested"},
  {reconciliation:{applicable:true,reconciles:false}},{reconciliation:{applicable:false,reconciles:true}},
  {reconciliation:{applicable:true,reconciles:true,seriesTruncated:true}},
  {sourceId:"external.fake"},{dataset:"some_other_dataset"},{metric:"items_per_1000"},
  {series:[]},{series:[series[0],series[2],{month_key:"2026-10",metric_value:15}]},
  {series:[series[0],series[0],series[2]]},
  {series:[{month_key:"2026-07",metric_value:"Infinity"},series[1],series[2]]},
  {series:[{month_key:"2026-07",metric_value:-1},series[1],series[2]]}
 ];
 for(const change of cases){const v=build({...args(),...change});
  assert.equal(v.state,"insufficient_comparable_evidence",JSON.stringify(change));
  assert.equal(v.observation,null);
  assert.equal(v.decisionReady,false);
 }
});
test("numeric strings that SQLite can supply are accepted without JS coercion of nonnumerics",()=>{
 const v=build({...args(),series:series.map(x=>({...x,metric_value:String(x.metric_value)}))});
 assert.equal(v.observation.percentageChange,100);
});
test("source name, customer details, raw text or private payload are never projected",()=>{
 const v=build({...args(),patient_email:"secret@example.com",series:series.map(x=>({...x,customer:"private"}))});
 const text=JSON.stringify(v);
 assert.doesNotMatch(text,/secret@example|private|patient_email/);
});
