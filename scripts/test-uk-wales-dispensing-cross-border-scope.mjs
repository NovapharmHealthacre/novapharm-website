import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WALES_DISPENSING_SCOPE_SOURCE_IDS,
  classifyWalesDispensingSource,
  assessWalesDispensingSourcePair,
} from '../src/core/uk-wales-dispensing-cross-border-scope.mjs';

const gp = (sourceVersion='official-2026-07', reportingPeriod='2026-07') =>
  ({sourceId:'nwssp.gp-dispensing', sourceVersion, reportingPeriod});
const english = (sourceVersion='official-2026-07', reportingPeriod='2026-07') =>
  ({sourceId:'nwssp.english-dispensing', sourceVersion, reportingPeriod});

test('only two specifically identified Welsh dispensing publisher scopes are accepted', () => {
  assert.deepEqual(WALES_DISPENSING_SCOPE_SOURCE_IDS.sort?.call([...WALES_DISPENSING_SCOPE_SOURCE_IDS]),
    ['nwssp.english-dispensing', 'nwssp.gp-dispensing']);
  assert.throws(() => classifyWalesDispensingSource({
    sourceId:'nhsbsa.epd', sourceVersion:'official-2026-07', reportingPeriod:'2026-07',
  }), /unsupported source identity/);
  assert.throws(() => classifyWalesDispensingSource({
    sourceId:'nwssp.gp-prescribing', sourceVersion:'official-2026-07', reportingPeriod:'2026-07',
  }), /unsupported source identity/);
});

test('origin and community dispensing are separate, with no inferred patient residence', () => {
  const a = classifyWalesDispensingSource(gp());
  const b = classifyWalesDispensingSource(english());
  assert.deepEqual(a.prescribingJurisdictions,['GB-WLS']);
  assert.deepEqual(a.communityDispensingJurisdictions,['GB-WLS','GB-ENG']);
  assert.deepEqual(b.prescribingJurisdictions,['GB-ENG']);
  assert.deepEqual(b.communityDispensingJurisdictions,['GB-WLS']);
  for(const x of [a,b]){
    assert.equal(x.publisherJurisdiction,'GB-WLS');
    assert.equal(x.actualRowGeographyVerified,false);
    assert.equal(x.patientResidenceVerified,false);
    assert.equal(x.archiveFormatVerified,false);
    assert.equal(x.sourceSchemaVerified,false);
    assert.equal(x.independentSourceRightsApproved,false);
    assert.equal(x.canIngest,false);
    assert.equal(x.canPublish,false);
    assert.equal(x.canSumMetrics,false);
    assert.equal(x.admittedMedicineRows,0);
    assert.equal(Object.isFrozen(x),true);
    assert.equal(Object.isFrozen(x.communityDispensingJurisdictions),true);
  }
});

test('cross-border pair cannot become national total or prove disjoint populations', () => {
  const result=assessWalesDispensingSourcePair(gp(),english());
  assert.equal(result.relationship,'different_prescribing_origin_and_dispensing_scope');
  assert.equal(result.independentMeasureGrainReconciliationRequired,true);
  assert.equal(result.separateOriginAndCommunityDispensingAttributionRequired,true);
  assert.equal(result.actualCrossSourceOverlapVerified,false);
  assert.equal(result.englandEpdOrPcaAdditivityProven,false);
  assert.equal(result.crossBorderNationalSumAllowed,false);
  assert.equal(result.canSumMetrics,false);
  assert.equal(result.canIngest,false);
  assert.equal(result.canPublish,false);
  assert.equal(result.admittedMedicineRows,0);
});

test('duplicate and source revisions are identified but never imply sum approval', () => {
  const identical=assessWalesDispensingSourcePair(gp(),gp());
  const conflict=assessWalesDispensingSourcePair(gp(),gp('official-2026-revised'));
  const different=assessWalesDispensingSourcePair(gp(),gp('official-2026-08','2026-08'));
  assert.equal(identical.relationship,'identical_metadata_candidate');
  assert.equal(conflict.relationship,'same_period_version_conflict');
  assert.equal(different.relationship,'different_reporting_periods');
  for(const x of [identical,conflict,different]){
    assert.equal(x.canSumMetrics,false);
    assert.equal(x.admittedMedicineRows,0);
    assert.equal(x.rightsApproved,false);
  }
});

test('invalid reporting period and source version metadata always reject', () => {
  for(const reportingPeriod of [undefined,null,'','2026-Q3','2026-00','2026-13','2026-07-01',202607]){
    assert.throws(()=>classifyWalesDispensingSource({...gp(),reportingPeriod}),/reporting month/);
    assert.throws(()=>assessWalesDispensingSourcePair(english(),{...gp(),reportingPeriod}),/reporting month/);
  }
  for(const sourceVersion of [undefined,null,'','x','../escape','with spaces','x'.repeat(101),0]){
    assert.throws(()=>classifyWalesDispensingSource({...gp(),sourceVersion}),/source version/);
  }
});

test('caller must not forge rights, count, row geography, publication or other source fields',()=>{
  for(const field of ['canPublish','canIngest','sourceRightsApproved','rightsApproved',
    'admittedMedicineRows','observations','quantity','cost','patientResidence','geographicCoverageVerified',
    'archiveFormat','dataPersisted']){
    assert.throws(()=>classifyWalesDispensingSource({...gp(),[field]:true}),/unexpected field/);
  }
  for(const malformed of [null,undefined,[],false,'nwssp.gp-dispensing',{}]){
    assert.throws(()=>classifyWalesDispensingSource(malformed),/refused/);
  }
});
