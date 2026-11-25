# Official product photography release

The image collection and brand discovery workflows are review-only. A supplier-hosted photograph is not automatically licensed for republication.

## Approved asset promotion

1. Match exact supplier GTIN, pack size and current UK packaging; reconcile any barcode or pack discrepancy. Select the clean front photograph and optional rear/side views. Exclude promotional claim graphics unless separately approved.
2. Preserve originals and record their source URLs and SHA-256 hashes. Create proportional AVIF and WebP derivatives at maximum dimensions 480, 800 and 1600 px, without enlarging a smaller original, cropping packaging, recolouring, or reconstructing labels.
3. Obtain commercial usage authorisation from the rights holder and record its evidence reference internally. Confirm the actual image variant against the current pack; obtain public listing approval and check product regulatory status.
4. The private staging bundle uses paths `assets/media/products/connective/<GTIN>/front-800.webp` and equivalent view/size variants. Only approved files should enter this public repository. No original supplier archive, private trade prices or approval evidence containing confidential information should be committed.
5. Add the verified approved entry to `src/content/approved-consumer-catalogue.json`, using the primary local image and approved gallery views. Each entry must pass the existing generator's rights, identity and listing gates. Use truthful alternative text.
6. Build the catalogue, confirm image aspect ratios and gallery rendering in Chromium and WebKit, verify mobile layouts, and test the shared checkout separately. Image publication approval is not payment approval.

Batch 01: review workflow 45533367019 downloaded 100 original candidates across 22 distinct GTINs (27 requested). 22 front and 4 rear views have been screened for staging; no new supplier photograph has been approved for publication. The remaining five initial references require supplier barcode/pack reconciliation. Expanded discovery workflow 45533786866 is ongoing at the time of this note. Do not infer approval from workflow success.

Rollback: remove the affected approved entry and associated assets from the next release; keep the private provenance and review record.
