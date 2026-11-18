"""Strict metadata gates for preapproved, non-patient, public CLIP image assets.

These machine checks are necessary, not a replacement for independent rights sign-off.
No network requests, model imports or secret processing occur in this module.
"""
from datetime import datetime, timezone, date
from ipaddress import ip_address
import re
from urllib.parse import urlsplit

ASSET_ID = re.compile(r"^[A-Za-z0-9._:-]{1,120}$")
SHA256 = re.compile(r"^[a-f0-9]{64}$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def valid_expiry(value, today=None):
    if not isinstance(value, str) or not ISO_DATE.fullmatch(value):
        return False
    try:
        cutoff = date.fromisoformat(value)
    except ValueError:
        return False
    if today is None:
        today = datetime.now(timezone.utc).date()
    return cutoff >= today


def validate_public_asset(item, *, indexed=False, seen=None, today=None):
    if not isinstance(item, dict):
        raise ValueError("Invalid public asset entry.")
    asset_id = item.get("assetId")
    if not isinstance(asset_id, str) or not ASSET_ID.fullmatch(asset_id):
        raise ValueError("Invalid asset ID.")
    if seen is not None:
        if asset_id in seen:
            raise ValueError("Duplicate asset ID.")
        seen.add(asset_id)
    if item.get("rightsApproved") is not True or item.get("publicAssetOnly") is not True:
        raise ValueError("Source rights approval or public scope missing.")
    if item.get("rightsStatus") != "active":
        raise ValueError("Rights may be revoked or pending.")
    if not valid_expiry(item.get("rightsExpiryDate"), today):
        raise ValueError("Rights are expired or have no approved expiry date.")
    rights_reference = item.get("rightsReference")
    if not isinstance(rights_reference, str) or not (1 <= len(rights_reference.strip()) <= 240):
        raise ValueError("Invalid rights record.")
    title = item.get("title")
    if not isinstance(title, str) or not (1 <= len(title.strip()) <= 200):
        raise ValueError("Missing or invalid public asset label.")
    source = item.get("sourceUrl")
    if not isinstance(source, str) or len(source) > 2048:
        raise ValueError("Invalid public source URL.")
    try:
        parsed = urlsplit(source)
        port = parsed.port
    except ValueError:
        raise ValueError("Invalid public source URL.") from None
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment or port not in (None, 443):
        raise ValueError("Public sources require a verified HTTPS URL without credentials.")
    host = parsed.hostname.lower().rstrip(".")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")) or "." not in host:
        raise ValueError("Public image attribution cannot use a private source host.")
    try:
        ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("Public image attribution cannot use an IP literal.")
    fingerprint = item.get("sourceImageSha256" if indexed else "imageSha256")
    if not isinstance(fingerprint, str) or not SHA256.fullmatch(fingerprint):
        raise ValueError("Exact source image SHA256 is required.")
    return item
