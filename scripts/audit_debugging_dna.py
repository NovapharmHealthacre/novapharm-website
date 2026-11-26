"""Exact-commit NovaPharm source/debug inventory. No working-tree path reads.

The report includes only Git-tracked paths, sizes, categories and rule identifiers.
It never writes source bytes, credentials or user data to the report.
"""
from __future__ import annotations

import json
import re
import subprocess
from collections import Counter
from pathlib import Path

TEXT_EXTS = {
    ".bicep", ".bicepparam", ".cjs", ".css", ".html", ".htm",
    ".js", ".json", ".jsx", ".md", ".mjs", ".mts", ".py", ".sh",
    ".sql", ".svg", ".swift", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml"
}
JS_EXTS = {".js", ".jsx", ".cjs", ".mjs", ".mts", ".ts", ".tsx"}
MAX_TEXT_BYTES = 4 * 1024 * 1024
OUTPUT_PATH = Path("artifacts/debugging/site-audit.json")
MODULE_CATALOGUE = "packages/portal-contracts/src/module-catalog.json"
DEBUGGER_RE = re.compile(r"(?m)^\s*debugger\s*;?\s*(?://[^\n]*)?$")
ID_RE = re.compile(r"\sid\s*=\s*(?:\"([^\"]+)\"|'([^']+)')", re.IGNORECASE)


def git_bytes(root: Path, *args: str) -> bytes:
    # No shell invocation. Caller-supplied Git object IDs are hex-validated.
    return subprocess.run(
        ["git", *args], cwd=root, check=True, capture_output=True
    ).stdout


def tracked_blobs(root: Path) -> list[dict]:
    entries = []
    for record in git_bytes(root, "ls-tree", "-r", "-l", "-z", "HEAD").split(b"\0"):
        if not record or b"\t" not in record:
            continue
        metadata, name = record.split(b"\t", 1)
        parts = metadata.split()
        if len(parts) != 4 or parts[1] != b"blob":
            continue
        mode, _, oid, size = (part.decode("ascii") for part in parts)
        if not re.fullmatch(r"[a-f0-9]{40}|[a-f0-9]{64}", oid):
            raise ValueError("Invalid Git object ID")
        entries.append({"path": name.decode("utf-8", "replace"),
                        "oid": oid, "mode": mode, "bytes": int(size)})
    return sorted(entries, key=lambda entry: entry["path"])


def blob_text(root: Path, oid: str) -> str:
    if not re.fullmatch(r"[a-f0-9]{40}|[a-f0-9]{64}", oid):
        raise ValueError("Invalid Git object ID")
    return git_bytes(root, "cat-file", "blob", oid).decode("utf-8", "replace")


def estate_for(path: str) -> str:
    for prefix, name in (
        ("apps/corporate/", "corporate"), ("apps/founder/", "founder"),
        ("apps/technology/", "technology"), ("apps/status/", "status"),
        ("apps/portal/", "portal"), ("portal/", "portal")
    ):
        if path.startswith(prefix):
            return name
    if re.search(r"(^|/)(intelligence|nova-ml|medicines)(/|-)", path, re.I):
        return "intelligence"
    if re.search(r"(^|/)(wms|distribution)(/|-)", path, re.I):
        return "distribution"
    if path.startswith(("apps/", "packages/")):
        return "shared-platform"
    if path.startswith(".github/"):
        return "ci"
    if path.startswith(("scripts/", "tooling/")):
        return "quality-tooling"
    if path.startswith(("docs/", "audit/")):
        return "documentation"
    if path.startswith(("assets/", "legal/", "src/")) or path.endswith(".html"):
        return "public-website"
    return "other"


def kind_for(path: str) -> str:
    ext = Path(path).suffix.lower()
    if path.endswith(".html") or re.search(r"/app/(?:.*?/)?(?:page|route)\.(tsx?|jsx?)$", path):
        return "page-or-route"
    if path.startswith(".github/workflows/"):
        return "workflow"
    if ext in JS_EXTS | {".py", ".swift"}:
        return "source"
    if ext == ".css":
        return "stylesheet"
    if ext in {".json", ".yaml", ".yml"}:
        return "configuration"
    if ext == ".md":
        return "documentation"
    if ext in TEXT_EXTS:
        return "other-text"
    return "binary-or-other"


def html_findings(path: str, source: str) -> list[dict]:
    result = []
    html = re.sub(r"<!--[\s\S]*?-->", "", source)
    standalone = bool(re.search(r"(^|/)index\.html$", path, re.I) or
                      re.fullmatch(r"[^/]+\.html", path, re.I))
    if standalone and not re.search(r"<!doctype\s+html\b", html, re.I):
        result.append({"path": path, "severity": "warning", "rule": "html-doctype",
                       "detail": "Standalone HTML has no explicit doctype."})
    no_scripts = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", html, flags=re.I)
    ids = []
    for tag in re.findall(r"<[a-z][^>]*>", no_scripts, flags=re.I):
        match = ID_RE.search(tag)
        if match:
            ids.append(match.group(1) or match.group(2))
    duplicates = len(ids) - len(set(ids))
    if duplicates:
        result.append({"path": path, "severity": "warning", "rule": "html-duplicate-id",
                       "detail": f"{duplicates} repeated literal HTML id attribute(s)."})
    return result


def scan_repository(root: Path | str = ".") -> dict:
    root = Path(root).resolve()
    entries = tracked_blobs(root)
    files: list[dict] = []
    findings: list[dict] = []
    by_estate: Counter = Counter()
    by_kind: Counter = Counter()
    inspected_text = 0
    metadata_only = 0
    routes = 0
    total_bytes = 0
    by_path = {entry["path"]: entry for entry in entries}

    for entry in entries:
        path = entry["path"]
        ext = Path(path).suffix.lower()
        estate = estate_for(path)
        kind = kind_for(path)
        by_estate[estate] += 1
        by_kind[kind] += 1
        routes += int(kind == "page-or-route")
        total_bytes += entry["bytes"]
        inspection = "metadata-only"

        if entry["mode"] == "120000":
            inspection = "symlink-metadata"
            metadata_only += 1
        elif ext in TEXT_EXTS and entry["bytes"] <= MAX_TEXT_BYTES:
            inspected_text += 1
            inspection = "text"
            source = blob_text(root, entry["oid"])
            if ext == ".json":
                try:
                    json.loads(source)
                except (ValueError, TypeError):
                    findings.append({"path": path, "severity": "error", "rule": "json-invalid",
                                     "detail": "Committed JSON cannot be parsed."})
            if ext in JS_EXTS and DEBUGGER_RE.search(source):
                findings.append({"path": path, "severity": "error", "rule": "production-debugger",
                                 "detail": "Unconditional debugger statement present."})
            if ext in {".html", ".htm"}:
                findings.extend(html_findings(path, source))
        else:
            metadata_only += 1
            if ext in TEXT_EXTS:
                inspection = "oversize-text-metadata"

        publicly_exposed = (
            path.startswith(("assets/", "public/")) or
            re.match(r"^apps/[^/]+/public/", path) is not None
        )
        if publicly_exposed and path.endswith(".map"):
            findings.append({"path": path, "severity": "error", "rule": "public-sourcemap",
                             "detail": "Public source map requires publication review."})
        files.append({"path": path, "estate": estate, "kind": kind,
                      "bytes": entry["bytes"], "inspection": inspection})

    module_count = None
    catalogue = by_path.get(MODULE_CATALOGUE)
    if catalogue is None:
        findings.append({"path": MODULE_CATALOGUE, "severity": "error",
                         "rule": "module-catalog-missing", "detail": "Portal catalogue missing."})
    else:
        try:
            modules = json.loads(blob_text(root, catalogue["oid"]))
            if isinstance(modules, list):
                module_count = len(modules)
            if not isinstance(modules, list) or len(modules) != 54 or \
                    len({item["code"] for item in modules}) != 54:
                findings.append({"path": MODULE_CATALOGUE, "severity": "error",
                                 "rule": "module-catalog-integrity",
                                 "detail": "Portal needs 54 distinct module codes."})
        except (ValueError, TypeError, KeyError):
            findings.append({"path": MODULE_CATALOGUE, "severity": "error",
                             "rule": "module-catalog-unreadable",
                             "detail": "Portal catalogue could not be parsed."})

    summary = {
        "trackedFiles": len(entries), "inspectedText": inspected_text,
        "metadataOnly": metadata_only, "routeFiles": routes,
        "portalModules": module_count, "totalBytes": total_bytes,
        "byEstate": dict(by_estate), "byKind": dict(by_kind),
        "errors": sum(f["severity"] == "error" for f in findings),
        "warnings": sum(f["severity"] == "warning" for f in findings),
    }
    return {"schemaVersion": 3,
            "scope": "exact-commit-git-object-inventory-not-runtime-certification",
            "summary": summary, "files": files, "findings": findings}


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    report = scan_repository()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("NovaPharm debugging inventory:", json.dumps(report["summary"]))
    for finding in report["findings"][:50]:
        print(f"{finding['severity'].upper()} {finding['rule']} {finding['path']}")
    if len(report["findings"]) > 50:
        print("Additional findings are in the JSON audit artifact.")
    return 1 if args.strict and report["summary"]["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
