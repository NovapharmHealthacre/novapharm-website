# NovaPharm Intelligence — upstream circuit-sparsity source and rights review

Status: **reviewed as external research; not incorporated into the production dependency graph or customer service**.
Reviewed: 18 November 2026. Scope: only https://github.com/openai/circuit_sparsity and https://openai.com/index/understanding-neural-networks-through-sparse-circuits/.

## Pinned evidence (upstream is not a production dependency)

- Public upstream GitHub repository: `openai/circuit_sparsity`; reviewed `main` at commit `dbf1fe0d27b76c19e10d2a715f28c2e5da535e08`. Record an immutable commit and re-review before any vendor-code incorporation.
- GitHub repository-level licence and the top-level `LICENSE` file identify **Apache License 2.0**. The `pyproject.toml` classifier nevertheless says **MIT License**. The displayed metadata contradicts the LICENSE file; do not infer that any model weights, datasets, visualization pickles, dependencies or external hosted assets share the same grant. Any redistribution must preserve applicable license and notice obligations after review.
- Research release includes inference-model definitions, checkpoints under a separate public blobstore and Streamlit/Plotly visualization code. The README describes large models (including ~118M and ~475M total parameters), and downloadable `viz_data.pkl` assets. Availability does **not** imply enterprise security, model/source approval, or permission to deploy checkpoints commercially.
- OpenAI's original sparse-circuit work trains language models with mostly zero weights and tests whether extracted circuits are **necessary and sufficient** on curated tasks. NovaPharm's synthetic two-head magnitude-pruned classifier is **not a reproduction** of that training method, circuit minimality, or mechanistic explanation.

## Binding architectural controls

1. **No untrusted pickle execution:** Never load remote `.pkl`, `pickle.load[s]`, `joblib.load`, `torch.load`, or other executable object formats from the upstream blobstore into customer, CI or research runtimes without a separate secured, isolated, independently reviewed import workflow. Inference checkpoints and visualizer assets must not be treated as benign JSON. Prefer safe tensor formats and signed digests from an approved source, but a safe format is not proof of rights.
2. **No implicit external transfer:** Web and native sparse-circuit readers operate only on the minimized `npi.sparse-circuit.v1` JSON summary. They never fetch checkpoints, prompt content, research pickle assets or pharmaceutical/customer source records. The local toy training script generates data and must remain offline.
3. **Rights split:** Separately determine rights for (a) repository code and its transitive dependencies, (b) downloadable model weights, (c) tokenizer and datasets, (d) cached third-party visualizations and all derived datasets, and (e) NovaPharm's own pharma data. A public code license or an internally generated checksum does not constitute approval for any other class.
4. **Reproducible science:** Pin exact upstream source revision and digests of approved model, tokenizer and dataset; isolate calibration from final holdout; include negative controls, necessity and sufficiency studies, uncertainty, independent review and experiment provenance. Existing synthetic checks only verify the local evaluation pipeline.
5. **Controlled import process:** Use a separate, isolated offline research environment to verify origin, file-size limits, content type, signatures and checksums; run software-composition and license scans. Require Quality, Security, Regulatory and legal approval before putting any derived research artifacts behind enterprise authentication.
6. **Release boundary:** No GitHub PR, synthetic model experiment, upstream Apache-2.0 label, locally validated graph or successful app build can itself grant `mechanisticExplanationVerified`, `productionEligible` or `clinicalUsePermitted`. Only authorized, independently evaluated sources and an audited service release can change production functionality.

## Actual implementation at this revision

NovaPharm does not vendor or import `openai/circuit_sparsity`. Its standalone synthetic PyTorch runner, fail-closed Node validator, protected web research section, Swift decoder and Kotlin decoder do not load upstream models or pickle assets. A source regression gate enforces this no-external-model/no-untrusted-deserialization boundary for the sparse-circuit candidate code. This is a research security-control record, **not** a third-party licence legal opinion or final enterprise certification.
