import assert from "node:assert/strict";
import test from "node:test";
import {inspectSyntheticFeature,syntheticReferenceGradient,syntheticReferenceFeatures,SYNTHETIC_MICROSCOPE_CONTRACT} from "../src/core/ai/model-microscope-synthetic-reference.mjs";
test("synthetic neuron and circuit inspections are deterministic, bounded and unpublishable",()=>{
  for(const [layerId,ids] of Object.entries(syntheticReferenceFeatures))for(const featureId of ids){
    const report=inspectSyntheticFeature({layerId,featureId});
    assert.deepEqual(report,inspectSyntheticFeature({layerId,featureId}));
    assert.equal(report.contract,SYNTHETIC_MICROSCOPE_CONTRACT);
    assert.equal(report.mode,"synthetic_offline_reference_only");
    assert.equal(report.canPublish,false);
    assert.equal(report.liveModel,false);
    assert.equal(report.clinicalDecisionReady,false);
    assert.equal(report.gridWidth,4);
    assert.equal(report.optimizedGrid.length,4);
    assert.ok(report.optimizedGrid.flat().every(x=>Number.isFinite(x)&&x>=0&&x<=1));
    assert.ok(report.finalActivation>=report.initialActivation-0.00001);
  }
});
test("analytic input gradient agrees with symmetric finite differences for every feature and circuit",()=>{
  const input=Array(16).fill(0.25),eps=1e-6;
  for(const [layerId,ids] of Object.entries(syntheticReferenceFeatures))for(const featureId of ids){
    const result=syntheticReferenceGradient({layerId,featureId,input});
    for(let i=0;i<16;i++){
      const upper=[...input],lower=[...input];upper[i]+=eps;lower[i]-=eps;
      const plus=syntheticReferenceGradient({layerId,featureId,input:upper}).activation;
      const minus=syntheticReferenceGradient({layerId,featureId,input:lower}).activation;
      assert.ok(Math.abs(result.gradient[i]-(plus-minus)/(2*eps))<1e-7,layerId+" "+featureId+" "+i);
    }
  }
});
test("rejects unknown features, unbounded or nonfinite inputs, and excessive iterations",()=>{
  for(const opts of [
    {layerId:"none",featureId:"center-columns"},
    {layerId:"features",featureId:"unknown"},
    {layerId:"features",featureId:"center-columns",steps:-1},
    {layerId:"features",featureId:"center-columns",steps:Infinity},
    {layerId:"features",featureId:"center-columns",steps:999999}
  ]) assert.throws(()=>inspectSyntheticFeature(opts));
  for(const x of [Infinity,NaN,-1,2]) assert.throws(()=>syntheticReferenceGradient({
    layerId:"features",featureId:"center-columns",input:Array(16).fill(x)
  }));
});
