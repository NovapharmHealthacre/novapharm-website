"""Build a deterministic CloudFormation inline Python package from reviewed sources.

No dynamic execution, binary uploads, credentials, or customer data are needed.
The original security and directory functions are retained verbatim.
"""
import ast
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
AWS = ROOT / "infra/aws"

FOUNDER_NAMES = (
    "REGION", "API_ID", "DOMAIN", "POOL", "CLIENT", "ISSUER",
    "FOUNDER_EMAIL", "TABLE", "COOKIE", "TTL", "SUBJECT", "OPAQUE",
    "BASE", "SCOPE", "s", "n", "key", "gateway", "cookie_token",
    "cognito_policy", "user_matches",
)

def selected(source, names):
    tree = ast.parse(source)
    parts = {}
    for node in tree.body:
        name = None
        if isinstance(node, ast.FunctionDef):
            name = node.name
        elif isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
        if name in names:
            if name in parts:
                raise ValueError("Duplicate definition " + name)
            parts[name] = ast.get_source_segment(source, node)
    if set(parts) != set(names):
        raise ValueError("Missing selected definitions")
    return "\n\n".join(parts[n] for n in names)

def bundle(founder, reader, api):
    # Retain original bodies, with an explicit namespace for the reviewed
    # founder helper subset and reader. No founder issuance/logout handlers.
    code = "import hashlib\nimport json\nimport os\nimport re\nimport time\nimport uuid\nfrom datetime import datetime, timezone\nfrom types import SimpleNamespace\n\n"
    code += selected(founder, FOUNDER_NAMES) + "\n\n"
    code += "founder = SimpleNamespace(" + ", ".join(n + "=" + n for n in FOUNDER_NAMES) + ")\n\n"
    code += selected(reader, ("SOURCES", "MAX_PAGES", "read_customer_identities")) + "\n\n"
    code += "reader = SimpleNamespace(read_customer_identities=read_customer_identities)\n\n"
    code += selected(api, ("ROUTE", "GROUP", "MAX_AUTH_AGE", "response", "group_allowed", "get_s", "get_n", "handle", "handler"))
    old = '        founder = load("intelligence-founder-session-api")\n        reader = load("customer-admin-directory-reader")\n'
    if code.count(old) != 1:
        raise ValueError("Handler packaging anchor changed")
    code = code.replace(old, "") + "\n"
    ast.parse(code)
    return code

def build(root=AWS):
    code = bundle(*[(root / name).read_text() for name in (
        "intelligence-founder-session-api.py", "customer-admin-directory-reader.py", "customer-admin-directory-api.py")])
    template = json.loads((root / "customer-admin-directory-candidate.json").read_text())
    for name in ("ArtifactBucket", "ArtifactKey", "ArtifactVersion"):
        del template["Parameters"][name]
    template["Description"] = "Private customer-directory candidate, native inline packaging; disabled by default."
    function = template["Resources"]["DirectoryFunction"]["Properties"]
    function["Handler"] = "index.handler"
    function["Code"] = {"ZipFile": code}
    template["Metadata"] = {"CustomerDirectorySourceSHA256": hashlib.sha256(code.encode()).hexdigest()}
    result = json.dumps(template, ensure_ascii=True, separators=(",", ":"))
    if len(result.encode()) > 51200:
        raise ValueError("CloudFormation TemplateBody size limit")
    return result

if __name__ == "__main__":
    sys.stdout.write(build() + "\n")
