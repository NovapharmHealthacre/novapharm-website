#!/usr/bin/env node
/**
 * Performs two bounded official public HTTP GETs and writes RECEIPTS ONLY.
 * No source records are logged, saved, published, or granted usage rights.
 * This is a reproducible live publisher smoke check, not production ingestion.
 */
import { probeOfficialPublicPharmaSource } from
  "../src/core/intelligence-official-live-pharma-probes.mjs";

const sources=["us-fda-drugsfda","sg-hsa-registered-products"];
const report={
  contract:"novapharm.intelligence.official-live-probe-report.v1",
  readinessScope:"LIVE_OFFICIAL_PUBLISHER_HTTP_ONLY_NOT_CUSTOMER_RUNTIME",
  containsPharmaceuticalSourceRecords:false,
  customerDataEnabled:false,
  regulatedEvidenceAdmitted:false,
  sources:[]
};
for(const sourceId of sources){
  const receipt=await probeOfficialPublicPharmaSource(sourceId);
  report.sources.push(receipt);
}
if(report.sources.length!==sources.length ||
   report.sources.some(x=>x.schemaBoundRecordCount!==1 ||
     x.customerCountryLive || x.canPublish || x.actualProductionApiConnected)){
  throw new Error("Official live publisher checks incomplete or unsafe");
}
process.stdout.write(JSON.stringify(report,null,2)+"\n");
