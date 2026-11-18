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

Create a **separately approved** local manifest with each `assetId`, `title`, `sourceUrl`, `localPath`, `imageSha256`, `rightsReference`, `rightsApproved: true`, `publicAssetOnly: true`, `rightsStatus: "active"`, and `rightsExpiryDate: "YYYY-MM-DD"`. Rights must be authorised by Legal/Quality independent of the input manifest: a Boolean asserted by the image supplier is **not evidence of consent or a licence**. The index stores the source image hash and expiry to deny unapproved or expired entries. The offline builder requires a dedicated approved image root and a preapproved checkpoint SHA256 and checks all image paths, SHA256 values and rights records before loading the model. The service rechecks expiry at each search, but an **external revocation still requires immediate service disablement and a newly audited index**, because this offline candidate has no live revocation feed.

Create a signed-off local manifest (source URL, authoritative owner, licence scope, expiry/revocation, checksum, asset rights ID), then run:

```sh
python3 services/clip/build_index.py --manifest /private/approved-manifest.json --model /private/clip-model.pt --model-sha256 <preapproved-64-character-checkpoint-sha256> --approved-root /private/licensed-public-artwork --output /private/clip-index.json
sha256sum /private/clip-model.pt /private/clip-index.json
python3 services/clip/serve.py
node --test scripts/test-intelligence-visual-search.mjs
python3 -m unittest discover -s services/clip -p 'test_*.py' -v
```

Only a nonclinical research pilot may be considered after independent image-rights acceptance and a named Quality/Privacy/Security approval. Run domain-shift evaluation against a rights-cleared pharmaceutical corpus; measure precision@k, false-near-miss retrieval for different strengths, doses, dosage forms, contraindications, lookalike/soundalike risk, English-prompt sensitivity, multilingual abstention, out-of-distribution rejection, abuse, CSRF, tenancy and rollback. Never interpret cosine ranking as certainty or identity verification.

## Independent retrieval benchmark (mandatory before any pilot)

`evaluate.py` accepts a human-reviewed JSON fixture with this structure; it makes **no model calls** and uses no patient or protected data:

```json
{
  "contract": "novapharm.intelligence.visual-search.v1",
  "cases": [
    {
      "caseId": "approved-presentation-1",
      "query": "approved public carton artwork",
      "riskTag": "general",
      "expectedAssetIds": ["licenced-public-artwork-1"],
      "returnedAssetIds": ["licenced-public-artwork-1"]
    },
    {
      "caseId": "non-catalogue-1",
      "query": "subject absent from approved catalogue",
      "riskTag": "out_of_domain",
      "expectedAssetIds": [],
      "returnedAssetIds": []
    }
  ]
}
```

Run `python3 services/clip/evaluate.py --cases /private/approved-nonclinical-evaluation.json --output /private/benchmark.json`. It computes precision@1, recall@5, negative/out-of-domain return rate and lookalike-strength first-result errors. A high recall score can coexist with dangerously wrong first results; any unapproved images and cases without ground truth are excluded. These are **descriptive diagnostics, not proof of safety**. The report always sets `releaseApprovalGranted: false`. Quality, Privacy, Security and the business owner must independently review the labelled cases, define minimum acceptance metrics, document all failures and formally approve any specific, strictly nonclinical pilot.

The model service permits only two concurrent CPU inference requests and a bounded index file to avoid unbounded local resource consumption. Expiry checks run at search time; external rights revocation still requires disabling the service and rebuilding the index.

## Limitations and release blockers

CLIP does not read medicine label dosage/expiry reliably, does not authenticate packaging, does not verify MHRA/FDA approvals, does not interpret radiology scans safely, and does not prove stock or manufacture. OCR for regulatory artwork needs a separate verified extraction pipeline. Do not use for clinical diagnosis, medicine substitution, batch release, safety or supply decisions. No patient data, health imagery, face recognition, surveillance, automatic camera feeds or private supplier records are permitted.

The planned Android adapter is not an Android Studio app. The Swift package is not a signed iOS app. CI/model benchmark tests, app signing, secure mobile sessions, device tests, protected tenant smoke checks and production verification have **not** been satisfied by adding code to GitHub.

Sources: https://openai.com/index/clip/ · https://github.com/openai/CLIP · https://github.com/openai/CLIP/blob/main/model-card.md · https://github.com/openai/CLIP/blob/main/LICENSE
