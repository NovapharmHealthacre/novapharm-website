/**
 * NovaPharm Intelligence's 22 supplied bibliography entries, 21 distinct works.
 * Scholarly reference registry, NOT trained weights, an inference engine or an
 * assurance that all linked resources can be copied or used for model training.
 * Titles and URLs are pointers to publications; no content is bundled.
 */
export const multimodalResearchRegistryVersion = "novapharm.intelligence.multimodal.research-basis.v1";
export const multimodalResearchReferences = Object.freeze([
  {
    "number": 1,
    "year": 2005,
    "title": "Invariant visual representation by single neurons in the human brain",
    "url": "https://www.nature.com/articles/nature03687",
    "theme": "invariance",
    "engineeringRule": "Test view, context and label-layout variants against one trusted reference; invariance is not identity proof."
  },
  {
    "number": 2,
    "year": 2016,
    "title": "Deep Residual Learning for Image Recognition",
    "url": "https://openaccess.thecvf.com/content_cvpr_2016/html/He_Deep_Residual_Learning_CVPR_2016_paper.html",
    "theme": "architecture",
    "engineeringRule": "Record vision backbone and preprocessing versions; compare against simple baselines on approved holdouts."
  },
  {
    "number": 3,
    "year": 2009,
    "title": "Visualizing Higher-Layer Features of a Deep Network",
    "url": "https://papers.baulab.info/papers/also/Erhan-2009.pdf",
    "theme": "interpretability",
    "engineeringRule": "Inspect high-layer concepts in an isolated model-evaluation environment."
  },
  {
    "number": 4,
    "year": 2013,
    "title": "Intriguing properties of neural networks",
    "url": "https://arxiv.org/abs/1312.6199",
    "theme": "adversarial",
    "engineeringRule": "Include small perturbations and model-transfer attacks in independent validation."
  },
  {
    "number": 5,
    "year": 2014,
    "title": "Understanding Deep Image Representations by Inverting Them",
    "url": "https://arxiv.org/abs/1412.0035",
    "theme": "interpretability",
    "engineeringRule": "Assess whether model embeddings can leak or reconstruct protected image information."
  },
  {
    "number": 6,
    "year": 2015,
    "title": "Deep Neural Networks are Easily Fooled: High Confidence Predictions for Unrecognizable Images",
    "url": "https://arxiv.org/abs/1412.1897",
    "theme": "adversarial",
    "engineeringRule": "Reject out-of-distribution or unrecognizable inputs even with a high model score."
  },
  {
    "number": 7,
    "year": 2015,
    "title": "Visualizing GoogLeNet Classes",
    "url": "https://www.auduno.com/2015/07/29/visualizing-googlenet-classes/",
    "theme": "interpretability",
    "engineeringRule": "Treat synthetic feature images as exploratory diagnostics, not empirical medicine evidence."
  },
  {
    "number": 8,
    "year": 2015,
    "title": "Inceptionism: Going Deeper into Neural Networks",
    "url": "https://research.google/blog/inceptionism-going-deeper-into-neural-networks/",
    "theme": "interpretability",
    "engineeringRule": "Check visualisation artefacts and never treat activation-maximizing images as real products."
  },
  {
    "number": 9,
    "year": 2016,
    "title": "Synthesizing the preferred inputs for neurons in neural networks via deep generator networks",
    "url": "https://arxiv.org/abs/1605.09304",
    "theme": "interpretability",
    "engineeringRule": "Separate generator-derived stimulus studies from licensed clinical or packaging ground truth."
  },
  {
    "number": 10,
    "year": 2017,
    "title": "Plug & Play Generative Networks: Conditional Iterative Generation of Images in Latent Space",
    "url": "https://openaccess.thecvf.com/content_cvpr_2017/html/Nguyen_Plug__Play_CVPR_2017_paper.html",
    "theme": "interpretability",
    "engineeringRule": "Isolate conditional generation to sandbox research; no synthetic packaging in authoritative records."
  },
  {
    "number": 11,
    "year": 2016,
    "title": "Multifaceted Feature Visualization: Uncovering the Different Types of Features Learned By Each Neuron in Deep Neural Networks",
    "url": "https://arxiv.org/abs/1602.03616",
    "theme": "interpretability",
    "engineeringRule": "Probe multi-faceted features; one activated feature cannot determine medicine identity."
  },
  {
    "number": 12,
    "year": 2017,
    "title": "Feature Visualization",
    "url": "https://distill.pub/2017/feature-visualization/",
    "theme": "interpretability",
    "engineeringRule": "Require independent dataset examples alongside feature visualization and saliency claims."
  },
  {
    "number": 13,
    "year": 2021,
    "title": "Multimodal Neurons in Artificial Neural Networks",
    "url": "https://openai.com/index/multimodal-neurons/",
    "theme": "multimodal",
    "engineeringRule": "Test visual/text disagreement and typographic overlay attacks, with automatic abstention and source review."
  },
  {
    "number": 14,
    "year": 1995,
    "title": "WordNet: A Lexical Database for English",
    "url": "https://wordnet.princeton.edu/",
    "theme": "terminology",
    "engineeringRule": "Scope semantic synonyms by sense, language and version; do not replace licensed medicine identifiers."
  },
  {
    "number": 15,
    "year": 2019,
    "title": "Excavating AI: The Politics of Images in Machine Learning Training Sets",
    "url": "https://excavating.ai/",
    "theme": "governance",
    "engineeringRule": "Require training-set consent, provenance, label scrutiny, usage rights and revocation."
  },
  {
    "number": 16,
    "year": 2020,
    "title": "Lines of Sight",
    "url": "https://logicmag.io/commons/lines-of-sight/",
    "theme": "governance",
    "engineeringRule": "Review labeling power, offensive categories and population/geography imbalance before training."
  },
  {
    "number": 17,
    "year": 1997,
    "title": "Single Neuron Activity in Human Hippocampus and Amygdala during Recognition of Faces and Objects",
    "url": "https://pubmed.ncbi.nlm.nih.gov/9182800/",
    "theme": "invariance",
    "engineeringRule": "Treat human neural recognition findings as conceptual analogies, not clinical machine certification."
  },
  {
    "number": 18,
    "year": 2000,
    "title": "Category-specific visual responses of single neurons in the human medial temporal lobe",
    "url": "https://pubmed.ncbi.nlm.nih.gov/10966627/",
    "theme": "invariance",
    "engineeringRule": "Evaluate learned category boundaries and confusion; do not infer biologically faithful AI units."
  },
  {
    "number": 19,
    "year": 2017,
    "title": "Learning to Generate Reviews and Discovering Sentiment",
    "url": "https://arxiv.org/abs/1704.01444",
    "theme": "interpretability",
    "engineeringRule": "Emergent text features require probing and cannot justify clinical or commercial decisions."
  },
  {
    "number": 20,
    "year": 2013,
    "title": "Efficient Estimation of Word Representations in Vector Space",
    "url": "https://arxiv.org/abs/1301.3781",
    "theme": "terminology",
    "engineeringRule": "Measure lexical nearest-neighbour errors; semantic similarity must never overwrite exact dosage or registration codes."
  },
  {
    "number": 21,
    "year": 2017,
    "title": "Adversarial Patch",
    "url": "https://arxiv.org/abs/1712.09665",
    "theme": "adversarial",
    "engineeringRule": "Test physically plausible overlaid patches, rotations, scales and print conditions."
  }
].map((reference) => Object.freeze(reference)));
export const multimodalResearchDuplicates = Object.freeze([
  Object.freeze({ suppliedNumber: 22, canonicalNumber: 15, reason: "Identical Crawford–Paglen (2019) reference" })
]);
export const multimodalEvaluationDimensions = Object.freeze({
  invariance: "Independently verify view, angle, light, domain and identity-class stability",
  architecture: "Baseline, backbone version, weight provenance, preprocessing and signed model review",
  interpretability: "Activation, feature-facet, inversion leakage and synthetic-image misuse inspection",
  adversarial: "Typographic overlay, adversarial patch, subtle perturbation and out-of-distribution refusal",
  multimodal: "Separate image-text agreement from verified label, manufacturer, registration and source truth",
  terminology: "Jurisdiction, spelling, synonyms, translated terms, strength, route and exact product codes",
  governance: "Dataset rights, consent, label harms, privacy, demographic coverage and withdrawal"
});
export const multimodalModelReleaseBlockers = Object.freeze([
  "independent_model_license_and_signed_weights",
  "independent_dataset_rights_and_revocation",
  "authenticated_tenant_and_source_authority",
  "representative_country_language_product_holdouts",
  "real_image_adversarial_and_bias_evaluation",
  "interpretability_and_embedding_inversion_privacy_review",
  "validated_ood_abstention_and_human_override",
  "regulatory_intended_purpose_quality_security_approval",
  "signed_web_ios_android_device_and_deployment_verification"
]);
/**
 * Future model-evaluation plan only. A test registration is never verification.
 * Deliberately no input permits this registry to grant release authority.
 */
export function assessMultimodalResearchBasis() {
  const covered = new Set(multimodalResearchReferences.map((reference) => reference.theme));
  return Object.freeze({
    contract: multimodalResearchRegistryVersion,
    suppliedEntries: 22,
    distinctWorks: multimodalResearchReferences.length,
    duplicateEntries: multimodalResearchDuplicates.length,
    dimensions: Object.freeze(Object.keys(multimodalEvaluationDimensions).map((id) =>
      Object.freeze({ id, planned: covered.has(id), independentlyMeasured: false }))),
    outstandingProductionEvidence: multimodalModelReleaseBlockers,
    realModelEvaluationCount: 0,
    trainingDataImported: false,
    modelInferenceEnabled: false,
    dataRightsApproved: false,
    productionAccepted: false,
    canPublish: false,
    decisionReady: false
  });
}
