"""Offline, rights-gated CLIP index builder for approved local public images only.

Do not run for patient records, supplier documents or assets without signed rights.
Input manifest: {"assets":[{"assetId","title","sourceUrl","rightsReference",
  "rightsApproved":true,"publicAssetOnly":true,"rightsStatus":"active",\n  "rightsExpiryDate":"YYYY-MM-DD","localPath","imageSha256"}]}.
All images must be files supplied by authorised operators; never remote URLs.
"""
import argparse
import hashlib
import json
from pathlib import Path
from rights import validate_public_asset

CONTRACT = "novapharm.intelligence.visual-search.v1"


def digest(path):
    hash_state = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hash_state.update(chunk)
    return hash_state.hexdigest()


def build(manifest_path, model_path, output_path):
    import clip
    import torch
    from PIL import Image

    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    assets = manifest.get("assets")
    if not isinstance(assets, list) or not (1 <= len(assets) <= 20000):
        raise ValueError("Expected 1–20,000 explicitly licensed assets.")
    if not Path(model_path).is_absolute() or not Path(output_path).is_absolute():
        raise ValueError("Use absolute model and output paths.")
    model, preprocess = clip.load(str(model_path), device="cpu", jit=False)
    model.eval()
    indexed = []
    used = set()
    for item in assets:
        validate_public_asset(item, seen=used)
        identifier = item["assetId"]
        source_url = item["sourceUrl"]
        image_path = Path(item.get("localPath", ""))
        if not image_path.is_absolute() or not image_path.is_file() or image_path.stat().st_size > 8_000_000:
            raise ValueError("Image must be an approved local file under 8MB.")
        expected_hash = item["imageSha256"]
        if digest(image_path) != expected_hash:
            raise ValueError("Source image digest is missing or incorrect.")
        Image.MAX_IMAGE_PIXELS = 12_000_000
        with Image.open(image_path) as image:
            if image.format not in ("PNG", "JPEG"):
                raise ValueError("Only local PNG/JPEG images are permitted.")
            pixels = preprocess(image.convert("RGB")).unsqueeze(0)
        with torch.inference_mode():
            vector = model.encode_image(pixels).float()[0]
            vector /= vector.norm().clamp_min(1e-12)
        indexed.append({
            "assetId": identifier, "title": item["title"],
            "sourceUrl": source_url, "rightsReference": item["rightsReference"],
            "rightsApproved": True, "publicAssetOnly": True,
            "rightsStatus": "active", "rightsExpiryDate": item["rightsExpiryDate"],
            "sourceImageSha256": item["imageSha256"], "vector": vector.tolist()
        })
    output = {"contract": CONTRACT, "modelSha256": digest(model_path), "assets": indexed}
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, separators=(",", ":")), encoding="utf-8")
    target.chmod(0o600)
    return {"modelSha256": output["modelSha256"], "indexSha256": digest(target), "assets": len(indexed)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.manifest, args.model, args.output)))
