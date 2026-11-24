import assert from 'node:assert/strict';
import test from 'node:test';
import { assessUkBackfillCandidateCoverage } from '../src/core/uk-four-nation-backfill-candidate.mjs';
const receipt = (sourceId, jurisdiction, reportingPeriod, overrides={}) => ({
  sourceId, jurisdiction, reportingPeriod,
  sourceVersion:'candidate-version-1',
  status:'private_quarantine_integrity_verified',
  archiveIntegrityVerified:true,
  canIngest:false,canPublish:false,
  admittedMedicineRows:0,datasetRecordsRead:0,
  expectedSha256:'b'.repeat(64),
  ...overrides
});
test('England complete candidate months never imply licensed or live medicines',()=>{
 const x=assessUkBackfillCandidateCoverage({
  sourceId:'nhsbsa.epd',startPeriod:'2026-07',endPeriod:'2026-09',
  receipts:['2026-07','2026-08','2026-09'].map(p=>receipt('nhsbsa.epd','GB-ENG',p))
 });
 assert.equal(x.requestedPeriods,3);
 assert.equal(x.candidateIntegrityVerifiedPeriods,3);
 assert.equal(x.candidateCoverageComplete,true);
 assert.deepEqual(x.missingPeriods,[]);
 assert.equal(x.independentPublisherHashesVerified,false);
 assert.equal(x.sourceRightsIndependentlyApproved,false);
 assert.equal(x.clinicalRowsReconciled,0);
 assert.equal(x.canPublish,false);
 assert.equal(x.canIngest,false);
});
test('Scotland quarterly flow stays quarterly and cannot use an arbitrary month',()=>{
 const args={sourceId:'phs.prescribed-dispensed',startPeriod:'2026-Q1',endPeriod:'2026-Q3',
  receipts:[receipt('phs.prescribed-dispensed','GB-SCT','2026-Q1'),
            receipt('phs.prescribed-dispensed','GB-SCT','2026-Q3')]};
 const x=assessUkBackfillCandidateCoverage(args);
 assert.deepEqual(x.missingPeriods,['2026-Q2']);
 assert.equal(x.candidateCoverageComplete,false);
 assert.throws(()=>assessUkBackfillCandidateCoverage({...args,startPeriod:'2026-01'}),/precision/);
});
test('Northern Ireland version conflicts are review blockers, not double counted',()=>{
 const x=assessUkBackfillCandidateCoverage({sourceId:'bso.gp-prescribing',
  startPeriod:'2026-08',endPeriod:'2026-09',
  receipts:[receipt('bso.gp-prescribing','GB-NIR','2026-08'),
            receipt('bso.gp-prescribing','GB-NIR','2026-08',{sourceVersion:'candidate-version-2'}),
            receipt('bso.gp-prescribing','GB-NIR','2026-09')]});
 assert.deepEqual(x.conflictingVersionPeriods,['2026-08']);
 assert.equal(x.candidateIntegrityVerifiedPeriods,1);
 assert.equal(x.candidateCoverageComplete,false);
});
test('Wales unverified private receipt cannot become an accepted month',()=>{
 const r=receipt('nwssp.gp-prescribing','GB-WLS','2026-09',{archiveIntegrityVerified:false});
 const x=assessUkBackfillCandidateCoverage({sourceId:'nwssp.gp-prescribing',
  startPeriod:'2026-09',endPeriod:'2026-09',receipts:[r]});
 assert.deepEqual(x.unverifiedPeriods,['2026-09']);
 assert.equal(x.canIngest,false);
 assert.equal(x.customerCountryLive,false);
});
test('foreign, out-of-window, oversized, malformed and unsupported sources fail',()=>{
 const args={sourceId:'nhsbsa.epd',startPeriod:'2026-08',endPeriod:'2026-09'};
 const good=receipt('nhsbsa.epd','GB-ENG','2026-08');
 for(const bad of [
   receipt('bso.gp-prescribing','GB-NIR','2026-08'),
   receipt('nhsbsa.epd','GB-ENG','2026-07'),
   receipt('nhsbsa.epd','GB-WLS','2026-08'),
   receipt('nhsbsa.epd','GB-ENG','2026-Q3')
 ])assert.throws(()=>assessUkBackfillCandidateCoverage({...args,receipts:[bad]}),/refused/);
 assert.throws(()=>assessUkBackfillCandidateCoverage({...args,receipts:Array(513).fill(good)}),/refused/);
 assert.throws(()=>assessUkBackfillCandidateCoverage({...args,startPeriod:'1900-01',endPeriod:'2026-09',receipts:[]}),/refused/);
 assert.throws(()=>assessUkBackfillCandidateCoverage({...args,sourceId:'unregistered',receipts:[]}),/refused/);
});

test('non-geographic NHSBSA terminology history is never presented as national prescribing coverage',()=>{
 const mapping=assessUkBackfillCandidateCoverage({
  sourceId:'nhsbsa.bnf-snomed-map',startPeriod:'2026-08',endPeriod:'2026-09',
  receipts:['2026-08','2026-09'].map(p=>receipt('nhsbsa.bnf-snomed-map','GB-ENG',p))
 });
 assert.equal(mapping.candidateCoverageComplete,true);
 assert.equal(mapping.geographyApplicability,'not_applicable');
 assert.equal(mapping.geographicCoverageVerified,false);
 assert.equal(mapping.sourceRightsIndependentlyApproved,false);
 assert.equal(mapping.canIngest,false);
 assert.equal(mapping.canPublish,false);
 const epd=assessUkBackfillCandidateCoverage({
  sourceId:'nhsbsa.epd',startPeriod:'2026-09',endPeriod:'2026-09',receipts:[]
 });
 assert.equal(epd.geographyApplicability,'source_specific');
 assert.equal(epd.geographicCoverageVerified,false);
 assert.equal(epd.canIngest,false);
});
