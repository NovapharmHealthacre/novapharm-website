"""Private production customer identity reader; no HTTP or authentication route.

Call only after a separately established, server-side administrator entitlement.
The caller must audit access and enforce no-store responses. This module does
not confer any authority on existing retail or founder-shell sessions.
"""
from datetime import datetime, timezone
import uuid

REGION = "eu-north-1"
SOURCES = (
    ("healthcare-retail", "eu-north-1_SLNUKZypt"),
    ("intelligence", "eu-north-1_jBL6hCUE2"),
)
MAX_PAGES = 100


def read_customer_identities(client, *, now=None):
    """Return source-separated identity records; never assert unique people.

    Any incomplete or invalid upstream response fails the entire read. An
    exception must become an unavailable state, never an empty success.
    No order, tenant membership, consent or payment inference is made.
    """
    observed = now or datetime.now(timezone.utc)
    if observed.tzinfo is None:
        raise ValueError("Timezone required")
    results = []
    for source, pool in SOURCES:
        records = []
        seen_tokens = set()
        seen_subjects = set()
        token = None
        for _ in range(MAX_PAGES):
            params = {"UserPoolId": pool, "Limit": 60}
            if token:
                params["PaginationToken"] = token
            response = client.list_users(**params)
            if not isinstance(response.get("Users"), list):
                raise ValueError("Invalid directory response")
            for user in response["Users"]:
                attrs = {a["Name"]: a["Value"] for a in user["Attributes"]}
                subject = attrs.get("sub")
                if not subject or subject in seen_subjects:
                    raise ValueError("Missing or repeated identity")
                seen_subjects.add(subject)
                created = user["UserCreateDate"]
                if not isinstance(created, datetime) or created.tzinfo is None:
                    raise ValueError("Invalid creation date")
                if type(user.get("Enabled")) is not bool:
                    raise ValueError("Invalid identity status")
                records.append({
                    "rowKey": uuid.uuid4().hex,
                    "email": attrs.get("email"),
                    "name": attrs.get("name") or " ".join(
                        attrs[k] for k in ("given_name", "family_name") if attrs.get(k)
                    ) or None,
                    "emailVerified": {"true": True, "false": False}.get(attrs.get("email_verified")),
                    "registeredAt": created.astimezone(timezone.utc).isoformat(),
                    "status": user["UserStatus"],
                    "enabled": user["Enabled"],
                })
            token = response.get("PaginationToken")
            if not token:
                break
            if not isinstance(token, str) or token in seen_tokens:
                raise ValueError("Invalid pagination")
            seen_tokens.add(token)
        else:
            raise ValueError("Directory pagination exceeded bound")
        records.sort(key=lambda row: row["registeredAt"], reverse=True)
        results.append({
            "source": source,
            "identityCount": len(records),
            "verifiedCount": sum(r["emailVerified"] is True for r in records),
            "enabledCount": sum(r["enabled"] is True for r in records),
            "records": records,
        })
    return {
        "observedAt": observed.astimezone(timezone.utc).isoformat(),
        "coverage": "production_cognito_identity_records_only",
        "uniquePeopleCount": None,
        "sources": results,
    }
