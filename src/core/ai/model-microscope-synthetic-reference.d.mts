export type SyntheticMicroscopeReference = Readonly<{
  contract: string;
  mode: "synthetic_offline_reference_only";
  modelId: string;
  layerId: string;
  featureId: string;
  steps: number;
  gridWidth: number;
  optimizedGrid: readonly (readonly number[])[];
  initialActivation: number;
  finalActivation: number;
  layerActivations: readonly number[];
  explanation: string;
  liveModel: false;
  canPublish: false;
  clinicalDecisionReady: false;
  regulatoryDecisionReady: false;
  commercialDecisionReady: false;
}>;
export function inspectSyntheticFeature(options: {
  layerId: "features" | "circuits";
  featureId: string;
  steps?: number;
}): SyntheticMicroscopeReference;
export function syntheticReferenceGradient(options: {
  layerId: "features" | "circuits";
  featureId: string;
  input: number[];
}): Readonly<{ activation: number; gradient: readonly number[] }>;
export const SYNTHETIC_MICROSCOPE_CONTRACT: string;
export const syntheticReferenceFeatures: Readonly<{
  features: readonly string[];
  circuits: readonly string[];
}>;
