/**
 * Tiny first-party synthetic neural network for offline research acceptance.
 * This deterministic educational control is NOT a pharmaceutical model,
 * private inspection service, or visualization of OpenAI's model internals.
 * No licensed model, patient data, network, or model-file download.
 */
export const SYNTHETIC_MICROSCOPE_CONTRACT = "novapharm.intelligence.synthetic-microscope-reference.v1";
const WIDTH = 4, PIXELS = WIDTH * WIDTH;
const FEATURES = Object.freeze([
  Object.freeze({ id: "center-columns", weights: Object.freeze(Array.from({length: PIXELS}, (_, i) => i % WIDTH === 1 || i % WIDTH === 2 ? 1 : -0.25)), bias: -0.1 }),
  Object.freeze({ id: "center-rows", weights: Object.freeze(Array.from({length: PIXELS}, (_, i) => Math.floor(i/WIDTH) === 1 || Math.floor(i/WIDTH) === 2 ? 1 : -0.25)), bias: -0.1 }),
  Object.freeze({ id: "main-diagonal", weights: Object.freeze(Array.from({length: PIXELS}, (_, i) => Math.floor(i/WIDTH) === i % WIDTH ? 1 : -0.25)), bias: -0.1 })
]);
const CIRCUITS = Object.freeze([
  Object.freeze({ id: "cross-combination", weights: Object.freeze([0.7, 0.7, -0.2]), bias: -0.1 }),
  Object.freeze({ id: "diagonal-combination", weights: Object.freeze([0.1, 0.1, 0.9]), bias: -0.1 })
]);
const relu = x => Math.max(0, x);
const dot = (w, x) => w.reduce((sum, wi, i) => sum + wi*x[i], 0);
const clip = x => Math.max(0,Math.min(1,x));
function forward(input) {
  if (!Array.isArray(input) || input.length !== PIXELS || input.some(x => !Number.isFinite(x) || x<0 || x>1))
    throw new Error("Synthetic reference input must be 16 bounded finite values.");
  const featurePre=FEATURES.map(n=>dot(n.weights,input)+n.bias);
  const featureActivations=featurePre.map(relu);
  const circuitPre=CIRCUITS.map(n=>dot(n.weights,featureActivations)+n.bias);
  return {featurePre,featureActivations,circuitPre,circuitActivations:circuitPre.map(relu)};
}
function selection(layerId, featureId) {
  if(typeof layerId!=="string"||typeof featureId!=="string")throw new Error("Invalid synthetic reference.");
  const nodes=layerId==="features"?FEATURES:layerId==="circuits"?CIRCUITS:null;
  const index=nodes?.findIndex(n=>n.id===featureId)??-1;
  if(index<0)throw new Error("Unknown synthetic layer or feature.");
  return {nodes,index,layerId,featureId};
}
function scoreGradient(input,chosen) {
  const state=forward(input);
  if(chosen.layerId==="features")return {
    score:state.featureActivations[chosen.index],
    gradient:state.featurePre[chosen.index]>0?[...chosen.nodes[chosen.index].weights]:Array(PIXELS).fill(0)
  };
  if(state.circuitPre[chosen.index]<=0)return {score:0,gradient:Array(PIXELS).fill(0)};
  const weights=chosen.nodes[chosen.index].weights;
  return {
    score:state.circuitActivations[chosen.index],
    gradient:Array.from({length:PIXELS},(_,pixel)=>FEATURES.reduce(
      (sum,feature,i)=>sum+(state.featurePre[i]>0?weights[i]*feature.weights[pixel]:0),0))
  };
}
export function inspectSyntheticFeature({layerId,featureId,steps=24}={}) {
  const chosen=selection(layerId,featureId);
  if(!Number.isSafeInteger(steps)||steps<1||steps>64)throw new Error("Invalid optimization steps.");
  let input=Array(PIXELS).fill(0.25);
  const initial=scoreGradient(input,chosen).score;
  for(let step=0;step<steps;step++){
    const {gradient}=scoreGradient(input,chosen);
    input=input.map((value,pixel)=>clip(value+0.075*(gradient[pixel]-0.025*(value-0.25))));
  }
  const final=scoreGradient(input,chosen).score, state=forward(input);
  const activations=layerId==="features"?state.featureActivations:state.circuitActivations;
  return Object.freeze({
    contract:SYNTHETIC_MICROSCOPE_CONTRACT,mode:"synthetic_offline_reference_only",
    modelId:"first-party-4x4-toy-network-not-registered-for-production",
    layerId,featureId,steps,gridWidth:WIDTH,
    optimizedGrid:Object.freeze(Array.from({length:WIDTH},(_,row)=>Object.freeze(
      input.slice(row*WIDTH,(row+1)*WIDTH).map(x=>Number(x.toFixed(5)))
    ))),
    initialActivation:Number(initial.toFixed(5)),
    finalActivation:Number(final.toFixed(5)),
    layerActivations:Object.freeze(activations.map(x=>Number(x.toFixed(5)))),
    explanation:"Fixed synthetic neural network research demonstration, not medicine or clinical model evidence.",
    liveModel:false,canPublish:false,clinicalDecisionReady:false,
    regulatoryDecisionReady:false,commercialDecisionReady:false
  });
}
export function syntheticReferenceGradient({layerId,featureId,input}) {
  const {score,gradient}=scoreGradient(input,selection(layerId,featureId));
  return Object.freeze({activation:score,gradient:Object.freeze(gradient)});
}
export const syntheticReferenceFeatures=Object.freeze({
  features:Object.freeze(FEATURES.map(n=>n.id)),
  circuits:Object.freeze(CIRCUITS.map(n=>n.id))
});
