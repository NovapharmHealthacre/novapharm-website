# NovaPharm CLIP private research candidate

**Status: disabled by default; not deployed; not a medical device or production feature.**

The CLIP model card says deployments are outside its recommended research use. This repository therefore includes source-only, isolated, owner-reviewable scaffolding, not a production launch, remote model API, embedded mobile weights, or catalogue claims.

## Architecture

- Offline `build_index.py` constructs a text/image shared-embedding public-image index from operator-supplied local PNG/JPEG files with checked SHA-256 and per-image rights records. It never crawls or downloads.
- `serve.py` loads pre-provisioned local CLIP weights and a checksum-pinned image index, runs the text encoder on loopback and returns only candidate metadata, not images or medical predictions.
- `src/core/intelligence-visual-search.mjs` is the trusted API-side private adapter. Routes `GET /api/v1/intelligence/visual/readiness` and `POST /api/v1/intelligence/visual/search` are board-only; POST requires CSRF and rate limiting.
- Next.js Portal `/gateway/v1/intelligence/visual/search` accepts only POST and forwards authenticated sessions. The Nova Device Intelligence workspace contains the consent-aware text-search candidate UI.
- Swift and Kotlin source clients can use the existing trusted portal session architecture; no iOS/Android app binaries, credentials, remote model URLs or model weights are shipped.

The default-off runtime cannot be enabled by an end-user checkbox. No spend or cloud resource is created from this PR.

## Required configuration for *private test only*

The Python runtime must run on the **same loopback host** as the API, or be reviewed/redesigned for separately secured production networking:

```text
NPI_CLIP_ENABLED=true
NPI_CLIP_SERVICE_HOST=127.0.0.1
NPI_CLIP_SERVICE_PORT=8767
NPI_CLIP_SERVICE_ORIGIN=http://127.0.0.1:8767
NPI_CLIP_SERVICE_TOKEN=<random secret at least 32 characters, injected by secret manager>
NPI_CLIP_MODEL_PATH=<absolute approved local checkpoint path>
NPI_CLIP_MODEL_SHA256=<exact 64-char local checkpoint sha256>
NPI_CLIP_INDEX_PATH=<absolute approved public-only index JSON path>
NPI_CLIP_INDEX_SHA256=<exact 64-char index sha256>
```

Never commit actual values, tokens, model weights, customer data or catalogue images. Install audited dependencies in an isolated environment; `requirements.txt` points at an immutable upstream CLIP source revision, but Torch's platform-specific wheel plus transitive packages must also be locked and audited before execution. Model weights must be separately acquired and their licence, provenance and redistribution rights reviewed. `clip.load(path)` must receive a LOCAL file, never a model name that triggers a download.

Create a signed-off local manifest (source URL, authoritative owner, licence scope, expiry/revocation, checksum, asset rights ID), then run:

```sh
python3 services/clip/build_index.py --manifest /private/approved-manifest.json --model /private/clip-model.pt --output /private/clip-index.json
sha256sum /private/clip-model.pt /private/clip-index.json
python3 services/clip/serve.py
node --test scripts/test-intelligence-visual-search.mjs
```

Only a nonclinical research pilot may be considered after independent image-rights acceptance and a named Quality/Privacy/Security approval. Run domain-shift evaluation against a rights-cleared pharmaceutical corpus; measure precision@k, false-near-miss retrieval for different strengths, doses, dosage forms, contraindications, lookalike/soundalike risk, English-prompt sensitivity, multilingual abstention, out-of-distribution rejection, abuse, CSRF, tenancy and rollback. Never interpret cosine ranking as certainty or identity verification.

## Limitations and release blockers

CLIP does not read medicine label dosage/expiry reliably, does not authenticate packaging, does not verify MHRA/FDA approvals, does not interpret radiology scans safely, and does not prove stock or manufacture. OCR for regulatory artwork needs a separate verified extraction pipeline. Do not use for clinical diagnosis, medicine substitution, batch release, safety or supply decisions. No patient data, health imagery, face recognition, surveillance, automatic camera feeds or private supplier records are permitted.

The planned Android adapter is not an Android Studio app. The Swift package is not a signed iOS app. CI/model benchmark tests, app signing, secure mobile sessions, device tests, protected tenant smoke checks and production verification have **not** been satisfied by adding code to GitHub.

Sources: https://openai.com/index/clip/ · https://github.com/openai/CLIP · https://github.com/openai/CLIP/blob/main/model-card.md · https://github.com/openai/CLIP/blob/main/LICENSE
