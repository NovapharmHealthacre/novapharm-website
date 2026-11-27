// Evidence-based 395-GTIN payment admission reconciliation. Read-only, no checkout writes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validGtin} from '../src/core/multibrand-retail.mjs';

const uniqueGtins=(ids,known,name)=>{
  assert(Array.isArray(ids),name+' must be an array');
  const set=new Set();
  for(const id of ids){
    assert(typeof id==='string'&&validGtin(id),name+' contains an invalid GTIN');
    assert(!set.has(id),name+' contains a duplicate GTIN');
    if(known)assert(known.has(id),name+' contains an unknown GTIN');
    set.add(id);
  }
  return set;
};
export function reconcile(source,manifest,catalogue,discovery,ledger=null){
  assert(source?.schema==='novapharm-connective-source-references-v1' && Array.isArray(source.products) && source.products.length===395,'Expected the complete supplier source register');
  const ids=uniqueGtins(source.products.map(x=>x.ean),null,'supplier register');
  assert(manifest?.schema==='novapharm.retail-owner-release.v1' && manifest.approval==='granted','Missing owner retail manifest');
  const inManifest=uniqueGtins(manifest.approvedGtins,ids,'retail manifest');
  const inCatalogue=uniqueGtins(catalogue.map(x=>x.ean),ids,'approved public catalogue');
  assert(inCatalogue.size===inManifest.size && [...inManifest].every(id=>inCatalogue.has(id)),'Manifest and published catalogue differ');
  const active=new Set(),staged=new Set();
  if(ledger!==null){
    assert(ledger.schema==='novapharm.connective.readonly-payment-snapshot.v1','Expected a validated read-only AWS snapshot');
    for(const g of uniqueGtins(ledger.approvedGtins,ids,'AWS approved GTINs'))active.add(g);
    for(const g of uniqueGtins(ledger.stagedGtins,ids,'AWS staged GTINs')){
      assert(!active.has(g),'GTIN cannot be both approved and staged');staged.add(g);
    }
    assert([...active].every(g=>inManifest.has(g)),'Unexpected AWS approved GTIN outside owner manifest; investigate before publication');
  }
  let byGtin=new Map();
  if(discovery!==null){
    assert(discovery?.schema==='novapharm.connective.bulk-evidence-review.v1'&&Array.isArray(discovery.records)&&discovery.records.length===395,'Incomplete read-only manufacturer research');
    const keys=uniqueGtins(discovery.records.map(x=>x.gtin),ids,'manufacturer research');
    assert(keys.size===395,'Manufacturer research has missing records');
    byGtin=new Map(discovery.records.map(x=>[x.gtin,x]));
  }
  const rows=source.products.map(p=>{
    const g=p.ean,regulated=p.classificationReview==='medicine_class_review',listed=inManifest.has(g),admitted=active.has(g),pending=staged.has(g);
    const evidence=byGtin.get(g),manufacturerReview=evidence?.review??'NOT_RESEARCHED';
    assert(!regulated||!listed,'Regulated medicine entered consumer-approved manifest');
    let status;
    if(regulated)status='REGULATED_HOLD';
    else if(ledger!==null && admitted)status='AWS_PAYMENT_ADMITTED';
    else if(ledger!==null && pending)status='STAGED_NOT_PAYMENT_ADMITTED';
    else if(listed)status=ledger===null?'MANIFEST_APPROVED_AWS_NOT_CHECKED':'MANIFEST_APPROVED_AWS_NOT_ADMITTED';
    else if(manufacturerReview==='MANUFACTURER_LABEL_CANDIDATE_REVIEW')status='MANUFACTURER_LABEL_REVIEW';
    else if(manufacturerReview==='MANUFACTURER_LINK_REVIEW')status='MANUFACTURER_LINK_REVIEW';
    else status='MANUFACTURER_AND_PRODUCT_EVIDENCE_REQUIRED';
    const blockers=regulated?['legal_classification_and_sale_authority']:
      admitted?['confirm_live_customer_purchase_journey']:
      listed?['live_AWS_offer_admission','confirm_live_customer_purchase_journey']:
      ['exact_UK_pack_and_label','ingredients_allergens_directions_warnings','tax_and_product_class','supplier_backed_ordering_commitment','public_approved_catalogue','AWS_offer_admission','live_checkout_test'];
    return {gtin:g,brand:p.brand,name:p.name,pack:p.pack,classificationReview:p.classificationReview,
      ownerCommerciallyAuthorisedForScreening:!regulated,publicCatalogueApproved:listed,
      awsLedgerChecked:ledger!==null,awsPaymentAdmitted:ledger===null?null:admitted,
      manufacturerResearch:manufacturerReview,status,blockers};
  });
  const statuses=rows.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{});
  return {schema:'novapharm.connective.payment-readiness-matrix.v1',scope:'395_supplier_GTINs',
    reportStatus:'READ_ONLY_NOT_PAYMENT_APPROVAL',awsLedgerChecked:ledger!==null,
    total:rows.length,ownerCommerciallyAuthorised:rows.filter(x=>x.ownerCommerciallyAuthorisedForScreening).length,
    regulatedHold:rows.filter(x=>x.status==='REGULATED_HOLD').length,manifestApproved:inManifest.size,
    awsPaymentAdmitted:ledger===null?null:active.size,awsStaged:ledger===null?null:staged.size,statuses,rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const source=JSON.parse(readFileSync('src/content/connective-source-references.json','utf8'));
    const manifest=JSON.parse(readFileSync('config/retail/approved-connective-checkout-release-20261126.json','utf8'));
    const catalogue=JSON.parse(readFileSync('src/content/approved-consumer-catalogue.json','utf8'));
    const discovery=JSON.parse(readFileSync(process.argv[2]??'research/connective-bulk-evidence-review.json','utf8'));
    const ix=process.argv.indexOf('--ledger');
    const ledger=ix===-1?null:JSON.parse(readFileSync(process.argv[ix+1],'utf8'));
    const target=process.argv[3]??'research/connective-payment-readiness-matrix.json';
    const result=reconcile(source,manifest,catalogue,discovery,ledger);
    mkdirSync(dirname(resolve(target)),{recursive:true});
    writeFileSync(resolve(target),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({total:result.total,ownerAuthorised:result.ownerCommerciallyAuthorised,
      manifestApproved:result.manifestApproved,awsLedgerChecked:result.awsLedgerChecked,
      awsPaymentAdmitted:result.awsPaymentAdmitted,statuses:result.statuses}));
  }catch(error){console.error(error);process.exitCode=1;}
}
