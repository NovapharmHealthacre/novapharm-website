# Multimodal Representation Research — 22-Entry Evidence-to-Engineering Matrix

**Date:** 18 November 2026  
**Status:** research bibliography and planned/negative-test engineering controls only. Not a 22-model deployment, licence grant, CLIP feature embedding or approved medical-device software.  
**Sources:** 22 entries supplied; 21 distinct works because #22 repeats #15.  
**Authoritative implementation:** `src/core/intelligence-multimodal-research-basis.mjs`, shared by protected web and the source-only iOS/Android React Native preview.

## Each user-supplied research item and its specific NovaPharm Intelligence implication

| # | Original work | Theme | Engineering interpretation for NovaPharm | Status |
|---|---|---|---|---|
| 1 | [Invariant visual representation by single neurons in the human brain](https://www.nature.com/articles/nature03687) (2005) | invariance | Test view, context and label-layout variants against one trusted reference; invariance is not identity proof. | Planned control; no model evaluated |
| 2 | [Deep Residual Learning for Image Recognition](https://openaccess.thecvf.com/content_cvpr_2016/html/He_Deep_Residual_Learning_CVPR_2016_paper.html) (2016) | architecture | Record vision backbone and preprocessing versions; compare against simple baselines on approved holdouts. | Planned control; no model evaluated |
| 3 | [Visualizing Higher-Layer Features of a Deep Network](https://papers.baulab.info/papers/also/Erhan-2009.pdf) (2009) | interpretability | Inspect high-layer concepts in an isolated model-evaluation environment. | Planned control; no model evaluated |
| 4 | [Intriguing properties of neural networks](https://arxiv.org/abs/1312.6199) (2013) | adversarial | Include small perturbations and model-transfer attacks in independent validation. | Planned control; no model evaluated |
| 5 | [Understanding Deep Image Representations by Inverting Them](https://arxiv.org/abs/1412.0035) (2014) | interpretability | Assess whether model embeddings can leak or reconstruct protected image information. | Planned control; no model evaluated |
| 6 | [Deep Neural Networks are Easily Fooled: High Confidence Predictions for Unrecognizable Images](https://arxiv.org/abs/1412.1897) (2015) | adversarial | Reject out-of-distribution or unrecognizable inputs even with a high model score. | Planned control; no model evaluated |
| 7 | [Visualizing GoogLeNet Classes](https://www.auduno.com/2015/07/29/visualizing-googlenet-classes/) (2015) | interpretability | Treat synthetic feature images as exploratory diagnostics, not empirical medicine evidence. | Planned control; no model evaluated |
| 8 | [Inceptionism: Going Deeper into Neural Networks](https://research.google/blog/inceptionism-going-deeper-into-neural-networks/) (2015) | interpretability | Check visualisation artefacts and never treat activation-maximizing images as real products. | Planned control; no model evaluated |
| 9 | [Synthesizing the preferred inputs for neurons in neural networks via deep generator networks](https://arxiv.org/abs/1605.09304) (2016) | interpretability | Separate generator-derived stimulus studies from licensed clinical or packaging ground truth. | Planned control; no model evaluated |
| 10 | [Plug & Play Generative Networks: Conditional Iterative Generation of Images in Latent Space](https://openaccess.thecvf.com/content_cvpr_2017/html/Nguyen_Plug__Play_CVPR_2017_paper.html) (2017) | interpretability | Isolate conditional generation to sandbox research; no synthetic packaging in authoritative records. | Planned control; no model evaluated |
| 11 | [Multifaceted Feature Visualization: Uncovering the Different Types of Features Learned By Each Neuron in Deep Neural Networks](https://arxiv.org/abs/1602.03616) (2016) | interpretability | Probe multi-faceted features; one activated feature cannot determine medicine identity. | Planned control; no model evaluated |
| 12 | [Feature Visualization](https://distill.pub/2017/feature-visualization/) (2017) | interpretability | Require independent dataset examples alongside feature visualization and saliency claims. | Planned control; no model evaluated |
| 13 | [Multimodal Neurons in Artificial Neural Networks](https://openai.com/index/multimodal-neurons/) (2021) | multimodal | Test visual/text disagreement and typographic overlay attacks, with automatic abstention and source review. | Planned control; no model evaluated |
| 14 | [WordNet: A Lexical Database for English](https://wordnet.princeton.edu/) (1995) | terminology | Scope semantic synonyms by sense, language and version; do not replace licensed medicine identifiers. | Planned control; no model evaluated |
| 15 | [Excavating AI: The Politics of Images in Machine Learning Training Sets](https://excavating.ai/) (2019) | governance | Require training-set consent, provenance, label scrutiny, usage rights and revocation. | Planned control; no model evaluated |
| 16 | [Lines of Sight](https://logicmag.io/commons/lines-of-sight/) (2020) | governance | Review labeling power, offensive categories and population/geography imbalance before training. | Planned control; no model evaluated |
| 17 | [Single Neuron Activity in Human Hippocampus and Amygdala during Recognition of Faces and Objects](https://pubmed.ncbi.nlm.nih.gov/9182800/) (1997) | invariance | Treat human neural recognition findings as conceptual analogies, not clinical machine certification. | Planned control; no model evaluated |
| 18 | [Category-specific visual responses of single neurons in the human medial temporal lobe](https://pubmed.ncbi.nlm.nih.gov/10966627/) (2000) | invariance | Evaluate learned category boundaries and confusion; do not infer biologically faithful AI units. | Planned control; no model evaluated |
| 19 | [Learning to Generate Reviews and Discovering Sentiment](https://arxiv.org/abs/1704.01444) (2017) | interpretability | Emergent text features require probing and cannot justify clinical or commercial decisions. | Planned control; no model evaluated |
| 20 | [Efficient Estimation of Word Representations in Vector Space](https://arxiv.org/abs/1301.3781) (2013) | terminology | Measure lexical nearest-neighbour errors; semantic similarity must never overwrite exact dosage or registration codes. | Planned control; no model evaluated |
| 21 | [Adversarial Patch](https://arxiv.org/abs/1712.09665) (2017) | adversarial | Test physically plausible overlaid patches, rotations, scales and print conditions. | Planned control; no model evaluated |
| 22 | [Crawford & Paglen — Excavating AI](https://excavating.ai/) (2019) | governance | **Duplicate of #15.** No extra model or dataset is implied; one provenance and bias-control requirement is counted. | Deduplicated |

## Cross-platform controls already present in code

- A shared offline input-consent, provenance, vision-vs-text conflict and product/strength/dose-form/manufacturer comparison gate for non-sensitive manually entered candidate strings. It cannot establish medicine identity or rights.
- A shared 22-workspace research policy; no workspace can inherit implicit publication/clinical/tenant rights.
- A fixed set of **12 synthetic offline negative controls**. The probes test our deterministic refusal and conflict logic only. They **do not test image robustness, attack success rate or a neural model**, and they do not constitute clinical validation.
- The web Nova ML review panel and the source-only iOS/Android review screen display the number of distinct cited works and the fact that **zero neural models have been independently evaluated by this feature**.
- CI validates exact research reference coverage, one duplicate mapping, seven research dimensions, no-release invariants and all original shared cross-platform research contracts.

## Independent approval still required to go live

1. Model architecture selection: benchmark ResNet or modern multimodal baselines against non-image heuristics; exact licensed weights, permissions, dataset, preprocessing, signed model registry and verified inference hardware.
2. Invariance and adversarial validation: held-out packaging across viewpoints, countries, fonts, scripts, strengths, forms and manufacturers; adversarial patches, perturbations, typographic overlays, image inversion and out-of-distribution rejection. Synthetic string tests **do not substitute** for these experiments.
3. Language and medicine ontology: exact national medicine identifiers and terminology permissions; WordNet or distributional similarity may help research but **never** replace jurisdictional, temporal and dose-form identity.
4. Dataset governance: rights, lawful basis, sampling, annotator instructions, class and language imbalance, privacy, revocation and protected-person controls. Avoid reproducing biased class ontologies.
5. Operational proof: signed iOS/Android releases, authenticated tenant enforcement, incident drills, independent QA, regulatory intended-purpose assessment, model monitoring, rollback and public deployment verification.

**Release authority is external to this module.** The research register is not a feature flag. See [PR #821](https://github.com/NovapharmHealthacre/novapharm-website/pull/821) and [issue #825](https://github.com/NovapharmHealthacre/novapharm-website/issues/825).
