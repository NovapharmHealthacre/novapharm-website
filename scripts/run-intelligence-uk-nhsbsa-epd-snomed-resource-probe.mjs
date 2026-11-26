#!/usr/bin/env node
/** Emits receipt-only JSON, never data/headers/metadata or raw exceptions. */
import { probeNhsbsaEpdSnomedResource } from "../src/core/intelligence-uk-nhsbsa-epd-snomed-resource-probe.mjs";
const receipt = await probeNhsbsaEpdSnomedResource();
if (receipt.publisherRowsRead !== 0 || receipt.canPublish || receipt.customerCountryLive ||
    receipt.publisherDataAdmitted || receipt.rawMetadataRetained) throw Error("Publisher metadata receipt not safe to archive");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
