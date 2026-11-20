#!/usr/bin/env node
/** Read one real Canadian government DIN record, then discard medicine content. */
import {probeCanadianDpdPublicSource} from
  "../src/core/intelligence-canada-dpd-public-live-probe.mjs";

const receipt=await probeCanadianDpdPublicSource();
if(receipt.schemaBoundRecords!==1 || !receipt.sourceNativeDinPreserved ||
   !receipt.officialSourceHttpResponseVerified || receipt.canPublish ||
   receipt.publisherDatasetSnapshotAdmitted || receipt.customerCountryLive ||
   receipt.rawDrugRecordsRetained){
  throw new Error("Canadian government live DIN source observation not verified");
}
process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
