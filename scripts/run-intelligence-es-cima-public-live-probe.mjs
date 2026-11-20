#!/usr/bin/env node
/**
 * Real public Spanish CIMA source HTTP proof. No drug content is printed or
 * stored; stdout contains only source identity, SHA-256 and non-live flags.
 */
import {probeCimaPublicMedicine} from "../src/core/intelligence-es-cima-public-live-probe.mjs";

const receipt=await probeCimaPublicMedicine();
if(!receipt.publicPublisherResponded || receipt.schemaBoundRecords!==1 ||
  receipt.countryCustomerLive || receipt.canPublish ||
  receipt.sourceUseRightsIndependentlyReviewed ||
  receipt.sourceDatasetAdmitted || receipt.rawMedicineRecordsRetained){
  throw new Error("CIMA live source observation not established");
}
process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
