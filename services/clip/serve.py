"""Private, local-only CLIP text-to-public-image retrieval. Not a medical classifier.

Startup requires preprovisioned SHA256-pinned model weights and public-only index.
No model downloads, telemetry, patient uploads, network asset fetching or ingestion.
Access is through the existing NovaPharm authenticated API, never direct internet.
"""
import hashlib
import hmac
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from rights import validate_public_asset, valid_expiry

CONTRACT = "novapharm.intelligence.visual-search.v1"


def approved_file(path_key, sha_key):
    filename = os.environ.get(path_key, "")
    expected = os.environ.get(sha_key, "").lower()
    if not filename or not Path(filename).is_absolute() or len(expected) != 64 or any(c not in "0123456789abcdef" for c in expected):
        raise RuntimeError("Required preapproved asset configuration is missing.")
    path = Path(filename).resolve(strict=True)
    if not path.is_file() or path.stat().st_size > 2_000_000_000:
        raise RuntimeError("Invalid model or index file.")
    hash_state = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hash_state.update(chunk)
    digest = hash_state.hexdigest()
    if not hmac.compare_digest(digest, expected):
        raise RuntimeError("Model or index integrity failure.")
    return path


def prepare():
    if os.environ.get("NPI_CLIP_ENABLED") != "true":
        raise RuntimeError("CLIP remains disabled until independently approved.")
    token = os.environ.get("NPI_CLIP_SERVICE_TOKEN", "")
    if len(token) < 32 or any(ch.isspace() for ch in token):
        raise RuntimeError("Private service token is not configured.")
    model_path = approved_file("NPI_CLIP_MODEL_PATH", "NPI_CLIP_MODEL_SHA256")
    index_path = approved_file("NPI_CLIP_INDEX_PATH", "NPI_CLIP_INDEX_SHA256")

    # Import after fail-closed configuration checks. clip.load(path) is local only.
    import clip
    import torch
    model, _ = clip.load(str(model_path), device="cpu", jit=False)
    model.eval()
    manifest = json.loads(index_path.read_text(encoding="utf-8"))
    if manifest.get("contract") != CONTRACT or manifest.get("modelSha256") != os.environ["NPI_CLIP_MODEL_SHA256"].lower():
        raise RuntimeError("The index is not bound to the approved model.")
    rows = manifest.get("assets")
    if not isinstance(rows, list) or len(rows) == 0 or len(rows) > 20000:
        raise RuntimeError("Index size or approval is invalid.")
    dimension = int(model.text_projection.shape[1])
    features = []
    seen = set()
    for item in rows:
        try:
            validate_public_asset(item, indexed=True, seen=seen)
        except ValueError as exc:
            raise RuntimeError("Index contains an invalid, expired or revoked source record.") from exc
        vector = item.get("vector")
        if not isinstance(vector, list) or len(vector) != dimension or not all(isinstance(value, (int, float)) for value in vector):
            raise RuntimeError("Index vector dimensions are invalid.")
        tensor = torch.tensor(vector, dtype=torch.float32)
        if not torch.isfinite(tensor).all() or abs(float(torch.linalg.vector_norm(tensor)) - 1.0) > 0.02:
            raise RuntimeError("Invalid normalised embedding.")
        features.append(tensor)
    matrix = torch.stack(features)
    return token, model, torch, clip, rows, matrix


def make_handler(runtime):
    token, model, torch, clip, assets, embeddings = runtime

    class Handler(BaseHTTPRequestHandler):
        server_version = "NovaVisualPrivate"
        sys_version = ""

        def log_message(self, *_args):
            # Do not log the private token, query, model paths or search results.
            pass

        def send_json(self, status, payload):
            raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def do_GET(self):
            if self.path != "/healthz":
                return self.send_json(404, {"error": "Not found"})
            if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + token):
                return self.send_json(401, {"error": "Unauthorised"})
            return self.send_json(200, {"status": "ready"})

        def do_POST(self):
            if self.path != "/v1/search":
                return self.send_json(404, {"error": "Not found"})
            if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + token):
                return self.send_json(401, {"error": "Unauthorised"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 4096 or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    return self.send_json(413, {"error": "Invalid request size or type"})
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict) or set(payload) != {"query", "limit"}:
                    raise ValueError("Invalid request")
                query, limit = payload["query"], payload["limit"]
                if not isinstance(query, str) or len(query.strip()) < 3 or len(query) > 240 or any(ord(c) < 32 or ord(c) == 127 for c in query):
                    raise ValueError("Invalid query")
                if type(limit) is not int or limit < 1 or limit > 10:
                    raise ValueError("Invalid limit")
            except (ValueError, TypeError, json.JSONDecodeError):
                return self.send_json(400, {"error": "Invalid query"})
            with torch.inference_mode():
                encoded = model.encode_text(clip.tokenize([query.strip()], truncate=True)).float()[0]
                encoded /= encoded.norm().clamp_min(1e-12)
                similarities = embeddings @ encoded
                ranks = [
                    index for index in torch.argsort(similarities, descending=True).tolist()
                    if assets[index]["rightsStatus"] == "active"
                    and valid_expiry(assets[index]["rightsExpiryDate"])
                ][:limit]
            results = [{"assetId": assets[i]["assetId"], "title": assets[i]["title"],
                        "rightsReference": assets[i]["rightsReference"], "sourceUrl": assets[i]["sourceUrl"]}
                       for i in ranks]
            return self.send_json(200, {"contract": CONTRACT, "results": results})

    return Handler


def main():
    if os.environ.get("NPI_CLIP_SERVICE_HOST", "127.0.0.1") != "127.0.0.1":
        raise RuntimeError("This prototype may bind only to IPv4 loopback.")
    port = int(os.environ.get("NPI_CLIP_SERVICE_PORT", "8767"))
    if not 1024 <= port <= 65535:
        raise RuntimeError("Invalid port.")
    runtime = prepare()
    ThreadingHTTPServer(("127.0.0.1", port), make_handler(runtime)).serve_forever()


if __name__ == "__main__":
    main()
