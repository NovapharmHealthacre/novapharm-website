"""Offline, rights-gated CLIP index builder for approved local public images only.

Do not run for patient records, supplier documents or assets without signed rights.
Input manifest: {"assets":[{"assetId","title","sourceUrl","rightsReference",
  "rightsApproved":true,"publicAssetOnly":true,"rightsStatus":"active",\n  "rightsExpiryDate":"YYYY-MM-DD","localPath","imageSha256"}]}.
All images must be files supplied by authorised operators; never remote URLs.
"""
import argparse
import hashlib
import hmac
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


def build(manifest_path, model_path, output_path, approved_root, expected_model_sha256):
    import clip
    import torch
    from PIL import Image

    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    assets = manifest.get("assets")
    if not isinstance(assets, list) or not (1 <= len(assets) <= 20000):
        raise ValueError("Expected 1–20,000 explicitly licensed assets.")
    if not all(Path(path).is_absolute() for path in (model_path, output_path, approved_root)):
        raise ValueError("Use absolute model, output and approved asset-root paths.")
    if not isinstance(expected_model_sha256, str) or len(expected_model_sha256) != 64 or any(
        value not in "0123456789abcdef" for value in expected_model_sha256
    ):
        raise ValueError("Exact preapproved model SHA256 is required.")
    root = Path(approved_root).resolve(strict=True)
    if not root.is_dir() or root == Path("/"):
        raise ValueError("Approved image root must be a dedicated directory.")
    model_file = Path(model_path).resolve(strict=True)
    if not model_file.is_file() or model_file.stat().st_size > 2_000_000_000:
        raise ValueError("Invalid approved model checkpoint.")
    if not hmac.compare_digest(digest(model_file), expected_model_sha256):
        raise ValueError("The approved checkpoint SHA256 does not match.")
    checked = set()
    for item in assets:
        validate_public_asset(item, seen=checked)
        local_file = Path(item.get("localPath", ""))
        if not local_file.is_absolute() or not local_file.is_file() or local_file.is_symlink():
            raise ValueError("Public image must be an approved absolute regular file.")
        real_file = local_file.resolve(strict=True)
        if not real_file.is_relative_to(root) or real_file.stat().st_size > 8_000_000:
            raise ValueError("Public image is outside the approved asset root or too large.")
        if digest(real_file) != item["imageSha256"]:
            raise ValueError("Source image SHA256 is missing or incorrect.")
    # No checkpoint deserialisation until rights and model integrity are approved.
    model, preprocess = clip.load(str(model_file), device="cpu", jit=False)
    model.eval()
    indexed = []
    for item in assets:
        identifier = item["assetId"]
        source_url = item["sourceUrl"]
        image_path = Path(item["localPath"]).resolve(strict=True)
        Image.MAX_IMAGE_PIXELS = 12_000_000
        with Image.open(image_path) as image:
            if image.format not in ("PNG", "JPEG"):
                raise ValueError("Only local PNG/JPEG images are permitted.")
            if image.width < 1 or image.height < 1 or image.width * image.height > 12_000_000:
                raise ValueError("Image resolution exceeds the nonclinical catalogue limit.")
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
    output = {"contract": CONTRACT, "modelSha256": expected_model_sha256, "assets": indexed}
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
    parser.add_argument("--approved-root", required=True, help="Dedicated directory containing licensed public assets")
    parser.add_argument("--model-sha256", required=True, help="Externally approved immutable checkpoint SHA256")
    args = parser.parse_args()
    print(json.dumps(build(args.manifest, args.model, args.output, args.approved_root, args.model_sha256)))
