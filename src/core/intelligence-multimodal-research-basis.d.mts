export type MultimodalResearchTheme = "invariance" | "architecture" | "interpretability" | "adversarial" | "multimodal" | "terminology" | "governance";
export type MultimodalResearchReference = Readonly<{
  number: number; year: number; title: string; url: string;
  theme: MultimodalResearchTheme; engineeringRule: string;
}>;
export declare const multimodalResearchRegistryVersion: "novapharm.intelligence.multimodal.research-basis.v1";
export declare const multimodalResearchReferences: readonly MultimodalResearchReference[];
export declare const multimodalResearchDuplicates: readonly Readonly<{
  suppliedNumber: number; canonicalNumber: number; reason: string;
}>[];
export declare const multimodalEvaluationDimensions: Readonly<Record<MultimodalResearchTheme,string>>;
export declare const multimodalModelReleaseBlockers: readonly string[];
export declare function assessMultimodalResearchBasis(): Readonly<{
  contract: "novapharm.intelligence.multimodal.research-basis.v1";
  suppliedEntries: number;
  distinctWorks: number;
  duplicateEntries: number;
  dimensions: readonly Readonly<{id:MultimodalResearchTheme;planned:boolean;independentlyMeasured:false}>[];
  outstandingProductionEvidence: readonly string[];
  realModelEvaluationCount: 0;
  trainingDataImported: false;
  modelInferenceEnabled: false;
  dataRightsApproved: false;
  productionAccepted: false;
  canPublish: false;
  decisionReady: false;
}>;
