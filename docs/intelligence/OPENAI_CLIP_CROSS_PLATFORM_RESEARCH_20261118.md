# OpenAI CLIP — NovaPharm Intelligence cross-platform research integration
**Date:** 18 November 2026
**State:** isolated source candidate only; zero public/customer activation; no licensed data or weights attached

## Upstream source audit

1. OpenAI, 5 January 2021, CLIP: Connecting text and images — contrastive training jointly embeds text and images, permitting zero-shot retrieval/classification and prompt engineering.
2. Paper: Learning Transferable Visual Models From Natural Language Supervision (Radford et al., ICML 2021) — data is a very large general web image-caption corpus, not pharmacovigilance, product identification or clinical benchmark material.
3. Official openai/CLIP repository — `clip.load`, tokenization, image preprocessing, ResNet and ViT options. Pinned source revision `d05afc436d78f1c48dc0dbf8e5980a9d471f35f6` is not a production dependency lock.
4. Official model card: research-oriented, non-deployed constrained image search needs domain-specific evaluation; English only, known fairness/prompt-bias, domain-shift, counting and fine-grained recognition limitations; image search does not become a safe product-identification claim.
5. Open-source repository LICENSE is MIT with preservation of notice required; separately review exact model checkpoint terms and image cataloguing rights. MIT source licence is not a permission to reuse third-party photographs, medicines packaging or patient imagery.

## Use-case prioritisation

| Priority | Research candidate | Data and user experience | Boundary |
| --- | --- | --- | --- |
| P0 | Text → approved image catalogue | Search only vetted NovaPharm-owned/licensed public product artwork, show original rights-linked source | Candidate ranking, no identity inference |
| P1 | Similarity/duplicate creative QA | Human review of near-duplicate public product images | Never authenticity or label validation |
| P1 | Semantic retrieval in approved documents | Page thumbnails with source/retention rights | OCR separate and human-checked |
| P2 | Cross-language prompts | Only after independently validated multilingual model | Original CLIP is English-only |
| Rejected | Patient images, prescriptions, pathology, radiology diagnosis | None | Clinical and personal-data risk |
| Rejected | Identifying pack strength, drug, batch, tampering or counterfeit | None | Fine-grained errors can cause harm |
| Rejected | Automatic supplier qualification, regulatory status, stock, treatment decisions | None | Authoritative APIs and human regulatory review are required |

## Architecture and operating contract

```text
Web Nova ML UI --- authenticated Portal BFF --- protected Node board API
iOS signed app --- future approved session bridge --- /gateway/v1/...  |
Android signed app --- future approved session bridge --- /gateway/v1/... |
                                                               |
                                              default-OFF private CLIP adapter
                                                               |
                              offline audited rights-cleared image vector index
                         SHA-pinned local CLIP checkpoint on loopback, no downloads
```

**Implemented in source candidate:**
- Board-only readiness and CSRF-protected POST search, per-fingerprint rate limit, request size cap, strict fixed BFF paths, no public credentials and hard fail-closed runtime flag.
- Optional Python local-only CLIP inference from pre-approved SHA-256 checkpoint and rights-approved public artwork index; no auto-download. Candidate rank only; no exposed numeric pseudo-confidence.
- Portal Nova Device Intelligence English text-search panel with explicit disabled state, human-review notice and source attribution; users cannot turn on a backend simply by checking a box.
- Swift package visual-retrieval source client and separate Kotlin Android source client; neither is a distributable app.

**Not implemented/approved:**
- No downloaded/approved CLIP weights, populated approved image catalogue, private inferencing server deployment or AWS resources; no actual image search currently running.
- No native iOS/Android app target, app-store distribution, device secure-login proof or camera ingestion.
- No authorised clinical use, packaging verification, OCR-backed strength validation, regulatory decision capability or accepted medicine/tenant evidence.
- No independent domain/abuse/rights review or exact-head production proof.

## Acceptance checklist before any pilot activation

1. Catalogue rights for **each asset** recorded with legal scope (search/embedding/display), owner, expiry, jurisdiction and revocation; remove all images whose permission is unclear.
2. Model/checkpoint lineage, source MIT notice, artifact SHA-256, supply chain SBOM, licence and distribution review; immutable built index + signer/approver.
3. Approved P0 subset only; no uploads, uploads of patient documents, external camera, or public model endpoint.
4. Representative evaluated domain samples with ambiguous/near-identical strengths, lookalike boxes, poor image quality, wording, multilingual failure, OOD and malicious instructions.
5. Evaluate precision@1/5 and false matches; define a separately approved acceptance threshold, abstention policy, incidence response, manually reviewed fallback.
6. Security: board-only session and MFA, CSRF, rate limits, internal token rotation, tenant isolation, SSRF prevention, private network, zero logs of prompts, no secrets in JS/APK/IPA, denied unauthenticated routes.
7. Mobile: compile Swift under Xcode and Kotlin in an Android Studio project; deep links, revoked sessions, offline fallback, accessibility, consent, privacy disclosures, real devices.
8. Owner release authority: complete staged protected test, accessibility and security checks, rollback rehearsal and separate proof of deployed immutable SHA. Source PR merge does not imply service launch.

Upstream:
- https://openai.com/index/clip/
- https://proceedings.mlr.press/v139/radford21a.html
- https://github.com/openai/CLIP
- https://github.com/openai/CLIP/blob/main/model-card.md
- https://github.com/openai/CLIP/blob/main/LICENSE
