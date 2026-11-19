import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=name=>JSON.parse(readFileSync(new URL("../docs/intelligence/"+name,import.meta.url),"utf8"));
const research=read("country-101-new-24-publisher-research-20261118.json");
const proposal=read("country-101-scope-proposal-20261118.json");
const catalogue=read("country-101-client-catalog-20261118.json");
const base=read("global-pharma-sources-20261117.json");

test("all 24 new-country publisher references are strictly research-only, never admitted APIs",()=>{
  assert.equal(research.contract,"novapharm.intelligence.24-national-publisher-research-leads.v1");
  assert.equal(research.leads.length,24);
  assert.equal(research.commercialAndAiReuseApproved,false);
  assert.equal(research.apiConnectionsEnabled,false);
  assert.equal(research.medicineRecordsIncluded,false);
  assert.equal(research.customerPublishedCountries,0);
  const byIso=new Map(proposal.proposedCountries.map(c=>[c.iso2,c]));
  const seen=new Set();
  for(const lead of research.leads){
    assert.ok(byIso.has(lead.iso2),"Research lead is not a proposed national jurisdiction");
    assert.ok(!seen.has(lead.iso2),"Duplicate country research lead");
    seen.add(lead.iso2);
    const original=byIso.get(lead.iso2);
    assert.equal(lead.country,original.country);
    assert.equal(lead.region,original.region);
    assert.equal(lead.sourceDiscovery,"official-reference-identified-not-integrated");
    assert.equal(lead.apiEndpoint,null);
    assert.equal(lead.apiValidated,false);
    assert.equal(lead.rightsStatus,"not-reviewed");
    assert.equal(lead.dataAdmission,"not-admitted");
    assert.equal(lead.customerLive,false);
    assert.ok(typeof lead.publisherName==="string"&&lead.publisherName.length>=3);
    assert.ok(typeof lead.caveat==="string"&&lead.caveat.length>=20);
    const url=new URL(lead.referenceUrl);
    assert.equal(url.protocol,"https:");
    assert.equal(url.username,"");
    assert.equal(url.password,"");
    assert.equal(url.port,"");
    assert.equal(url.hash,"");
    assert.notEqual(url.hostname,"localhost");
    assert.doesNotMatch(url.hostname,/(?:^|\.)(?:example\.(?:com|org)|invalid)$/iu);
    assert.ok(!base.sources.some(s=>s.country===lead.country),
      "Research lead must not mutate the original 101 canonical source candidates");
    const mapped=catalogue.countries.find(c=>c.iso2===lead.iso2);
    assert.ok(mapped);
    assert.equal(mapped.scopeOrigin,"PROPOSED_RESEARCH_COUNTRY");
    assert.equal(mapped.coverage,"research-geography-only");
    assert.equal(mapped.candidateSourceCount,0);
    assert.deepEqual(mapped.candidateSources,[]);
    assert.equal(mapped.customerLive,false);
    assert.equal(mapped.commercialAndAiReuseApproved,false);
    assert.equal(mapped.datasetAdmission,"not-admitted");
    assert.deepEqual(mapped.publisherResearchLead,{
      publisherName:lead.publisherName,
      referenceUrl:lead.referenceUrl,
      leadType:lead.leadType,
      caveat:lead.caveat,
      status:"publisher-reference-only-not-integrated",
      rightsStatus:"not-reviewed"
    });
  }
  assert.equal(seen.size,24);
  assert.equal(catalogue.countries.filter(c=>c.publisherResearchLead!==null).length,24);
  assert.equal(catalogue.countries.filter(c=>c.candidateSourceCount>0).length,77);
  assert.equal(catalogue.summary.customerLiveNationalCountries,0);
});

test("protected web and offline Expo iOS Android show publisher leads without network requests",()=>{
  const web=readFileSync(new URL("../apps/portal/components/country-source-coverage.tsx",import.meta.url),"utf8");
  const expo=readFileSync(new URL("../native/novapharm-intelligence-mobile/CountryDirectoryScreen.tsx",import.meta.url),"utf8");
  assert.match(web,/publisherResearchLead\?\.publisherName/);
  assert.match(web,/publisherResearchLead\.referenceUrl/);
  assert.match(web,/Rights not reviewed/);
  assert.match(expo,/publisherResearchLead\?\.publisherName/);
  assert.match(expo,/publisherResearchLead\.leadType/);
  assert.match(expo,/No live medicine API/);
  assert.doesNotMatch(web,/\bfetch\s*\(|XMLHttpRequest|client_secret|Bearer /i);
  assert.doesNotMatch(expo,/\bfetch\s*\(|XMLHttpRequest|SecureStore|client_secret|Bearer /i);
});
