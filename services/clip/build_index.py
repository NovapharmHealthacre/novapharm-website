"""Offline, rights-gated CLIP index builder for approved local public images only.

Do not run for patient records, supplier documents or assets without signed rights.
Input manifest: {"assets":[{"assetId","title","sourceUrl","rightsReference",
  "rightsApproved":true,"publicAssetOnly":true,"localPath","imageSha256"}]}.
All images must be files supplied by authorised operators; never remote URLs.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

CONTRACT = "novapharm.intelligence.visual-search.v1"


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


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
        if item.get("rightsApproved") is not True or item.get("publicAssetOnly") is not True:
            raise ValueError("An asset lacks an independent source-rights approval.")
        identifier = item.get("assetId", "")
        source_url = item.get("sourceUrl", "")
        parsed = urlparse(source_url)
        if not isinstance(identifier, str) or not identifier or identifier in used or len(identifier) > 120 or not all(c.isalnum() or c in "._:-" for c in identifier):
            raise ValueError("Duplicate or invalid asset identifier.")
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError("Sources must have a rights-verified HTTPS URL.")
        if not item.get("rightsReference") or not item.get("title") or len(item["title"]) > 200:
            raise ValueError("Missing rights reference or asset label.")
        image_path = Path(item.get("localPath", ""))
        if not image_path.is_absolute() or not image_path.is_file() or image_path.stat().st_size > 8_000_000:
            raise ValueError("Image must be an approved local file under 8MB.")
        expected_hash = item.get("imageSha256", "")
        if not isinstance(expected_hash, str) or digest(image_path) != expected_hash.lower():
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
            "vector": vector.tolist()
        })
        used.add(identifier)
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
