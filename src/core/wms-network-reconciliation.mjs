import { reviewQualified3plSnapshot } from "./wms-control-tower.mjs";

/**
 * Warehouse/ERP inventory reconciliation across owner, site, bin, SKU and batch.
 * Only an independent comparison packet. Even zero variances cannot establish
 * live stock, physical counts, released medicines or available-to-promise.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/u;
const HASH=/^[0-9a-f]{64}$/iu;
const TIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const id=x=>typeof x==="string"&&ID.test(x);
const validTime=x=>typeof x==="string"&&TIME.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
const qty=x=>Number.isSafeInteger(x)&&x>=0;
const obj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const fields=["onHand","reserved","quarantined","damaged"];
const lock=x=>Object.freeze(x);
const base=(state,reasons,extras={})=>lock({
  status:state,reasons:lock(reasons),varianceRows:lock([]),
  comparedLots:null,sourceReconciled:false,saleAuthorised:false,
  availableToPromise:null,stockAdjustmentIssued:false,
  inventoryCountAccepted:false,dispatchAuthorised:false,...extras
});
function makeKey(row) {
  return [row.ownerId,row.locationId,row.sku,row.batchNumber].join("|");
}
function rowsToIndex(rows,tenantId,siteId) {
  const index=new Map();
  for(const row of rows){
    if(!obj(row)||row.tenantId!==tenantId||row.siteId!==siteId||
      ![row.ownerId,row.locationId,row.sku,row.batchNumber].every(id)||
      !fields.every(f=>qty(row[f]))||
      row.reserved+row.quarantined+row.damaged>row.onHand)
      return {reason:"invalid_or_cross_scope_inventory_lot"};
    const key=makeKey(row);
    if(index.has(key))return {reason:"duplicate_bin_owner_batch"};
    index.set(key,row);
  }
  return {index};
}
/**
 * The 'ledgerSnapshot' must be a separately originated, time-bounded record.
 * It cannot be a restatement of the provider payload; provenance and
 * independence must be checked by the integration adapter outside this module.
 */
export function review3plInventoryReconciliation({
  providerPacket,ledgerSnapshot,tenantId,siteId,asOf=new Date().toISOString()
}={}) {
  const at=validTime(asOf);
  if(!id(tenantId)||!id(siteId)||!Number.isFinite(at))
    return base("blocked",["trusted_scope_or_clock_missing"]);
  const provider=reviewQualified3plSnapshot(providerPacket,{tenantId,siteId,asOf});
  if(provider.state!=="candidate_for_independent_review")
    return base("blocked",["3pl_provider_packet_not_qualified",...provider.reasons]);
  const m=ledgerSnapshot?.manifest;
  if(!obj(m)||m.tenantId!==tenantId||m.siteId!==siteId||
    m.sourceSystem!=="novapharm_inventory_ledger"||m.synthetic!==false||
    !id(m.evidenceId)||!HASH.test(m.sha256||"")||
    m.reviewState!=="evidence_submitted_for_independent_reconciliation")
    return base("blocked",["ledger_provenance_missing"]);
  const captured=validTime(m.capturedAt);
  if(!Number.isFinite(captured)||captured>at||at-captured>86400000||
    !Array.isArray(ledgerSnapshot.lines)||ledgerSnapshot.lines.length>20000)
    return base("blocked",["ledger_snapshot_stale_or_invalid"]);
  const warehouseRows=rowsToIndex(providerPacket.lots,tenantId,siteId);
  const ledgerRows=rowsToIndex(ledgerSnapshot.lines,tenantId,siteId);
  if(warehouseRows.reason||ledgerRows.reason)
    return base("blocked",[warehouseRows.reason||ledgerRows.reason]);
  const keys=new Set([...warehouseRows.index.keys(),...ledgerRows.index.keys()]);
  const variances=[];
  for(const key of [...keys].sort()){
    const w=warehouseRows.index.get(key);
    const l=ledgerRows.index.get(key);
    const source=w||l;
    if(!w||!l){
      variances.push(lock({ownerId:source.ownerId,locationId:source.locationId,
        sku:source.sku,batchNumber:source.batchNumber,
        reason:!w?"provider_row_missing":"ledger_row_missing",deltas:null}));
      continue;
    }
    const deltas=Object.fromEntries(fields.map(f=>[f,w[f]-l[f]]));
    if(Object.values(deltas).some(delta=>delta!==0))
      variances.push(lock({
        ownerId:w.ownerId,locationId:w.locationId,sku:w.sku,
        batchNumber:w.batchNumber,reason:"quantity_variance",deltas:lock(deltas)
      }));
  }
  return base(variances.length?"variance_requires_review":"candidate_for_independent_reconciliation",
    ["external_provider_authentication_physical_count_and_quality_review_required"],{
      varianceRows:lock(variances),comparedLots:keys.size,
      warehouseEvidenceId:provider.evidenceId,
      ledgerEvidenceId:m.evidenceId,
    });
}
