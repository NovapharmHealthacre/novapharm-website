import assert from "node:assert/strict";
import test from "node:test";
import { FOUR_NATION_SOURCES, UK_MEDICINE_PRESENTATION_SOURCES, probeThreeUkMedicinePresentationPublishers, probeUkNationPublisherMetadata, probeAllFourUkPublishers } from "../src/core/uk-four-nation-source-metadata.mjs";

const id1 = "bafa30b6-4426-4578-a128-935d13b228e5";
const id2 = "35b93e03-6330-4a7e-9be0-1f07c1495cc5";
const fixtures = {
  "nhsbsa.epd": { name: "english-prescribing-dataset-epd-with-snomed-code", resources: [
    {id:id1,format:"CSV",name:"EPD_SNOMED_202608"},
    {id:id2,format:"CSV",name:"EPD_SNOMED_202609"},
  ]},
  "phs.prescribed-dispensed": { name: "prescribed-dispensed", resources: [
    {id:id1,format:"CSV",name:"Prescribed & Dispensed Jan - Mar 2026"},
    {id:id2,format:"CSV",name:"Prescribed & Dispensed Apr - Jun 2026"},
  ]},
  "bso.dispensing-contractor": { name: "dispensing-by-contractor", resources: [
    {id:id1,format:"CSV",name:"Dispensed Items by GP and Pharmacy, August 2026"},
    {id:id2,format:"CSV",name:"Dispensed Items by GP and Pharmacy, September 2026"},
  ]},
};

test("four pinned official sources span England Scotland Wales Northern Ireland", () => {
  assert.equal(FOUR_NATION_SOURCES.length, 4);
  assert.deepEqual(new Set(FOUR_NATION_SOURCES.map(x=>x.jurisdiction)),
    new Set(["GB-ENG","GB-SCT","GB-WLS","GB-NIR"]));
  assert.ok(FOUR_NATION_SOURCES.every(s=>new URL(s.url).protocol==="https:"));
});

test("official publisher fixtures give separate monthly and quarterly periods, never raw medicine rows", async () => {
  const requested = [];
  const results = await probeAllFourUkPublishers({
    now: () => new Date("2026-11-21T12:00:00Z"),
    fetchImplementation: async (url, opts) => {
      requested.push({url, opts});
      const source = FOUR_NATION_SOURCES.find(x=>x.url === String(url));
      assert.ok(source, "only fixed official publisher URL is requested");
      if(source.kind==="publisher_page") return new Response("<html>Publisher home only</html>", {headers:{"content-type":"text/html"}});
      const result = fixtures[source.sourceId];
      assert.ok(result);
      return new Response(JSON.stringify({success:true,result}),{headers:{"content-type":"application/json"}});
    },
  });
  assert.equal(requested.length,4);
  assert.ok(requested.every(x=>x.opts.method==="GET" && x.opts.redirect==="error"));
  assert.deepEqual(results.map(x=>x.latestReportingPeriod), ["2026-09","2026-Q2",null,"2026-09"]);
  assert.equal(results[2].metadataStatus,"official_page_reachable_no_machine_readable_feed_accepted");
  for(const receipt of results) {
    assert.equal(receipt.rawMedicineRowsRead,0);
    assert.equal(receipt.medicineDataAdmitted,false);
    assert.equal(receipt.sourceRightsIndependentlyApproved,false);
    assert.equal(receipt.customerCountryLive,false);
    assert.equal(receipt.canPublish,false);
    assert.equal(JSON.stringify(receipt).includes("Prescribed & Dispensed"),false);
  }
});

test("wrong dataset, malformed response, redirects and invalid resource periods fail closed", async () => {
  const sourceId="phs.prescribed-dispensed";
  const responses=[
    new Response(JSON.stringify({success:true,result:{name:"another-dataset",resources:[]}}),{headers:{"content-type":"application/json"}}),
    new Response("not-json",{headers:{"content-type":"application/json"}}),
    new Response(JSON.stringify({success:true,result:{name:"prescribed-dispensed",resources:[{id:id1,format:"CSV",name:"Prescribed Aug 2026"}]}}),{headers:{"content-type":"application/json"}}),
    Response.redirect("https://example.org",302),
  ];
  for (const response of responses) {
    await assert.rejects(
      () => probeUkNationPublisherMetadata(sourceId,{fetchImplementation:async()=>response}),
      /UK official-source metadata probe failed closed/
    );
  }
  await assert.rejects(
    () => probeUkNationPublisherMetadata("unrecognised.source"),
    /unrecognised source/
  );
});

test("Welsh publisher webpage cannot be represented as machine-readable clinical or prescribing ingestion", async()=>{
  const result=await probeUkNationPublisherMetadata("nwssp.practice-pharmacy-flow",{
    fetchImplementation:async()=>new Response("<html><a href='/private.xlsx'>Download</a></html>",{headers:{"content-type":"text/html"}}),
  });
  assert.equal(result.datedResources,0);
  assert.equal(result.latestReportingPeriod,null);
  assert.equal("latestResourceId" in result,false);
  assert.equal(result.canPublish,false);
});

test("three additional medicine-presentation publisher sources remain separate from dispensing-flow data", async()=>{
  assert.equal(UK_MEDICINE_PRESENTATION_SOURCES.length,3);
  const queries=[];
  const responses={
    "phs.prescriptions-community":{ name:"prescriptions-in-the-community", resources:[
      {id:id1,format:"CSV",name:"Prescriptions in the Community - Data by Prescriber Location – August 2026"},
      {id:id2,format:"CSV",name:"Prescriptions in the Community - Data by Dispenser Location – July 2026"},
    ]},
    "bso.gp-prescribing":{name:"gp-prescribing-data",resources:[
      {id:id1,format:"CSV",name:"GP Prescribing Northern Ireland, August 2026"},
      {id:id2,format:"CSV",name:"GP Prescribing Northern Ireland, September 2026"},
    ]},
  };
  const rows=await probeThreeUkMedicinePresentationPublishers({fetchImplementation:async(url)=>{
    queries.push(String(url));
    const source=UK_MEDICINE_PRESENTATION_SOURCES.find(s=>s.url===String(url));
    assert.ok(source);
    if(source.kind==="publisher_page")
      return new Response("<html>GPDataFileCCYYMM</html>",{headers:{"content-type":"text/html"}});
    return new Response(JSON.stringify({success:true,result:responses[source.sourceId]}),{headers:{"content-type":"application/json"}});
  }});
  assert.equal(queries.length,3);
  assert.deepEqual(rows.map(x=>x.latestReportingPeriod),["2026-08",null,"2026-09"]);
  assert.ok(rows.every(x=>x.rawMedicineRowsRead===0 && x.medicineDataAdmitted===false && x.canPublish===false));
});
