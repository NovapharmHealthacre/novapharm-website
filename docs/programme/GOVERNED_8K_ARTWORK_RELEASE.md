# Governed native 8K artwork: authoring and release acceptance

## Scope
The public website continues to use approved existing assets. New image masters must not be passed off as 8K through an upscale. This workflow is for actual native >=7680×4320 assets whose origin and licence are documented. A ChatGPT-generated picture may be submitted for review as an *illustrative image*, but is **not** an 8K native master unless its original output really has the required dimensions; AI-created content must not represent actual facilities, products, licenses, partners, staff, GMP evidence, medicine inventory, or approvals.

## Review-only conversion
Use a secure local directory outside published Pages and repository trees:

```sh
node scripts/build-governed-image-derivatives.mjs \
  --id home-supply-network \
  --source /secure/approved-native-master.png \
  --output-dir /secure/review/home-supply-network \
  --source-reference internal-licence-or-imagegen-source-id \
  --licence-status owner-authorised-generated
```

The script checks actual image dimensions, enforces native 8K without enlargement, builds 640/960/1600/2560/3840 AVIF, WebP and JPEG derivatives within policy byte budgets, and writes SHA-256 hashes plus intrinsic sizes to a review manifest. No derivative is auto-deployed and no approval is inferred.

## Release gates
1. Verify original asset source, owner authorisation, commercial-use entitlement and model terms; retain source metadata.
2. Have an owner check composition and factual/non-factual depiction; explicitly prohibit fictitious product labels, licensing and medicinal efficacy assertions.
3. Confirm every derivative's size, source hash, bytes, aspect ratio and desktop/mobile focal point; complete asset-register fields and evidence for every route.
4. After review, copy *only* approved derivatives into the relevant public delivery directory. Keep native masters in restricted, backed-up storage, not GitHub Pages.
5. Build and inspect production page visual crops, accessibility alt text, contrast, reduced motion and Core Web Vitals in Chromium and WebKit on all accepted viewports.
6. Log exact deployed SHA, asset provenance, copy of acceptance evidence and owner sign-off. Only then set the corresponding image register record to `released`; do not close issue #54 until every principal image passes.

## Initial safe delivery improvement
The restored corporate hero now selects the existing 1200px JPEG for narrower viewports while retaining the existing AVIF on wide screens, with a 1672px JPEG fallback and intrinsic dimensions. This is a performance improvement **not** proof of a completed native 8K art-direction programme. It preserves current messaging and regulatory disclaimer. Future native masters must remain unpublished until these gates pass.
