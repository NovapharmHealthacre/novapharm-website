# AI Model and Software Licence Review

**Status:** completed for the implemented release candidate
**Reviewed:** 22 July 2026
**Owner:** Technology and Information Security
**Re-review trigger:** any new model, model revision, AI runtime dependency or provider

## Decision

The public semantic layer uses **NovaPharm Evidence Vector v1**, a repository-controlled deterministic sparse retrieval algorithm. It contains no third-party neural model weights, does not call a model hub or CDN and does not depend on Transformers.js, ONNX Runtime or WebLLM. NovaPharm therefore avoids an unnecessary model-licence, redistribution, remote-code and multi-megabyte download dependency for the initial evidence-search use case.

The implementation is commercially usable by NovaPharm because its source and generated vocabulary asset are owned within this repository. It is a retrieval model only. It cannot independently generate prose, make a clinical inference or establish whether a claim is true beyond the cited source.

## External candidates considered

| Candidate | Official source | Decision |
|---|---|---|
| Transformers.js | [Hugging Face documentation](https://huggingface.co/docs/transformers.js/main/en/custom_usage) | Not required for the initial release. A future model would need a pinned library version, pinned model revision, locally hosted assets, disabled remote loading, licence review, checksums and browser testing. |
| ONNX Runtime Web | [Microsoft documentation](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) | Not required because no ONNX model is used. This avoids a WASM asset and cross-browser execution dependency. |
| WebLLM | Project-specific licence and model review required | Roadmap only. It is not the primary search experience and no model is bundled or downloaded. |
| Ollama | Local adapter only | The adapter accepts loopback endpoints only and is disabled in production. No Ollama model has been selected, approved, bundled or redistributed. |

## Required review before any future model activation

Record the model name, immutable revision, source, model card, software licence, model licence, commercial-use permission, attribution, redistribution and modification rights, restrictions, quantisation, download size, checksums, supported languages, Safari and Chromium behaviour, CPU and memory measurements, security review, evaluation results and update policy. Non-commercial, unclear, unpinned or anonymously mirrored models are prohibited.

This is a technical licence assessment, not a legal opinion. A future third-party model with material contractual restrictions should receive legal review.
