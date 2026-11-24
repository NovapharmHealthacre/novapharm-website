"""One-time, fail-closed restoration of the already verified public artifact."""
import hashlib
import io
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile

ARCHIVE = "042e82c522cfea93f4678bbb9661d6a1744e5a77b209f4edf042bbb5221aa480"
SOURCE = "6c336db8c157d46e79e7373b27301cc5c12d3b9f"
BASE = "4c641e6c4277224014626e25bbf0bef060ba9706"
PRESERVE = {
    "assets/css/nutraxin-retail-store.css": "10f56efb33df28b82645874c7e383049bf5d8a20",
    "assets/js/nutraxin-retail-store.js": "7507458a4a76bec98318304337873a11f2034b31",
}
PINNED_CONTACT = {
    "contact/index.html": "a8da0073be35ebeb3333aade562dd3f627244232",
    "assets/js/contact-production.js": "d405d459e089c3a696bd0ed6b2fb84bf529787bc",
    "assets/css/novapharm-unified-20261107.css": "9631537b380551b5dd3f8dbee81d93c3098bab54",
}
GIFT = "products/nutraxin/gift-cards/"
CORE = ("index.html", "about/index.html", "capabilities/index.html",
        "oncology/index.html", "products/index.html", "technology/index.html",
        "news-insights/index.html", "contact/index.html",
        "products/nutraxin/index.html", "products/nutraxin/bag/index.html")

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def blob(path):
    data = path.read_bytes()
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def validate_page(path):
    text = path.read_text(encoding="utf-8")
    require(text.count(f'name="novapharm-source-sha" content="{SOURCE}"') == 1,
            f"Invalid page receipt: {path}")
    require(text.count('name="theme-color" content="#FFFFFF"') == 1,
            f"Missing Pure White theme: {path}")
    require(text.count('class="site-header npd-header"') == 1 and
            text.count('class="site-footer npd-footer"') == 1,
            f"Missing shared chrome: {path}")

def stage(archive, target):
    require(hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE, "Artifact digest mismatch")
    require(subprocess.check_output(["git", "-C", str(target), "rev-parse", "HEAD"],
                                    text=True).strip() == BASE, "Production head moved")
    require(not subprocess.check_output(["git", "-C", str(target), "status", "--porcelain"],
                                        text=True).strip(), "Candidate checkout is not clean")
    for path, sha in PRESERVE.items():
        require(blob(target / path) == sha, "Retail preservation pin differs: " + path)
    require(not (target / GIFT / "index.html").exists(), "Gift-card route state changed; re-review")
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp)
        with zipfile.ZipFile(archive) as outer:
            require(outer.namelist() == ["artifact.tar"], "Unexpected archive structure")
            with outer.open("artifact.tar") as stream, tarfile.open(fileobj=stream, mode="r|") as tar:
                count = 0
                seen = set()
                for member in tar:
                    path = PurePosixPath(member.name)
                    require(not path.is_absolute() and ".." not in path.parts and
                            ".git" not in path.parts and ".github" not in path.parts,
                            "Unsafe archive path")
                    require(member.isdir() or member.isfile(), "Non-regular artifact entry")
                    if member.isdir():
                        continue
                    require(str(path) not in seen, "Duplicate archive entry")
                    seen.add(str(path))
                    output = source / str(path)
                    output.parent.mkdir(parents=True, exist_ok=True)
                    with tar.extractfile(member) as src, output.open("wb") as dst:
                        shutil.copyfileobj(src, dst)
                    count += 1
                require(count == 1050, "Unexpected public artifact file count")
        require((source / "CNAME").read_text().strip() == "novapharmhealthcare.com", "Unexpected domain")
        for path, sha in PINNED_CONTACT.items():
            require(blob(source / path) == sha, "Reviewed Contact file changed: " + path)
        for path in CORE:
            validate_page(source / path)
        product_pages = sorted(p for p in (source / "products/nutraxin").glob("*/index.html")
                               if p.parent.name not in {"account", "bag", "gift-cards", "order-request"})
        require(len(product_pages) == 19, "Expected 19 Nutraxin product pages")
        for page in product_pages:
            validate_page(page)
        contact = (source / "contact/index.html").read_text()
        require("Managed Contact layout v2" in contact and "#FBFAEF" not in contact and
                "data-live-b2b-enquiry-form" in contact and "form-action 'none'" in contact,
                "Contact layout or security contract missing")
        require("--np-color-canvas: #FFFFFF" in (source / "assets/css/novapharm.bundle.css").read_text(),
                "Approved shared Pure White canvas missing")
        for file in sorted(source.rglob("*")):
            if not file.is_file():
                continue
            path = file.relative_to(source).as_posix()
            if path in PRESERVE or path.startswith(GIFT):
                continue
            destination = target / path
            require(not destination.is_symlink() and
                    not any(parent.is_symlink() for parent in destination.parents if parent != target.parent),
                    "Unexpected symlink in destination")
            destination.parent.mkdir(parents=True, exist_ok=True)
            if path == "sitemap-images.xml":
                # The verified artifact contains a disabled gift-card preview;
                # do not advertise the deferred route in this restoration.
                data = file.read_bytes()
                entry = re.compile(rb'<url><loc>https://novapharmhealthcare\.com/products/nutraxin/gift-cards/</loc>(?:(?!</url>).)*</url>', re.S)
                data, removed = entry.subn(b"", data)
                require(removed == 1 and b"/products/nutraxin/gift-cards/" not in data,
                        "Unexpected gift-card sitemap entry")
                destination.write_bytes(data)
            else:
                shutil.copyfile(file, destination)
    for path, sha in PRESERVE.items():
        require(blob(target / path) == sha, "Retail asset was altered")
    require(not (target / GIFT / "index.html").exists(), "Deferred route introduced")
    for path, sha in PINNED_CONTACT.items():
        require(blob(target / path) == sha, "Contact final pin mismatch")
    print("Verified archive and 29 core/product pages; staged restored public files with retail exceptions, no deletions.")

if __name__ == "__main__":
    stage(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
