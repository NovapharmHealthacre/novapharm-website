#!/usr/bin/env python3
"""Read-only preflight for NovaPharm's existing Nutraxin customer BFF stack.

IMPORTANT: This tool never deploys, mutates CloudFormation, modifies IAM or
calls payment/customer APIs. A green GitHub source check is not evidence that
the stored CloudFormation template or Lambda runtime has been reconciled.

Usage:
    python3 scripts/aws/nutraxin_cfn_drift_guard.py
    python3 scripts/aws/nutraxin_cfn_drift_guard.py --live

The live mode needs read-only cloudformation:GetTemplate,
cloudformation:DescribeStacks, lambda:GetFunctionConfiguration,
apigatewayv2:GetApiMappings, and apigatewayv2:GetIntegrations permissions.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_PATH = ROOT / "infra/aws/nutraxin-customer-staging-stack.json"
SOURCE_PATH = ROOT / "apps/nutraxin-customer-api/index.py"

REGION = "eu-north-1"
STACK = "novapharm-staging-nutraxin-customer-order-bff"
FUNCTION = "novapharm-staging-nutraxin-customer-bff"
DOMAIN = "portal.novapharmhealthcare.com"
EXPECTED_API = "wgy9p7ad0d"


def ascii_cloudformation_source(source):
    """Mirror the ASCII replacement observed in this legacy inline template."""
    return source.encode("ascii", errors="replace").decode("ascii")


def fingerprint(source):
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def _function_references(obj, target="AppFunction"):
    """Locate direct symbolic references whose values could be re-evaluated."""
    found = []

    def visit(value, path):
        if isinstance(value, dict):
            if value.get("Ref") == target:
                found.append(path + ".Ref")
            if isinstance(value.get("Fn::GetAtt"), list) and value["Fn::GetAtt"][0] == target:
                found.append(path + ".Fn::GetAtt")
            for key, child in value.items():
                visit(child, path + "." + key)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, path + "[" + str(index) + "]")

    visit(obj, "Resource")
    return found


def examine(repo_template, repo_source, deployed_template=None,
            function_config=None, mappings=None, integrations=None,
            stack_status=None):
    """Return a no-secrets parity report with explicit release gates."""
    resource = repo_template["Resources"]["AppFunction"]
    inline = resource["Properties"]["Code"]["ZipFile"]
    local_consistent = inline == repo_source
    refs = {}
    for name, other in repo_template["Resources"].items():
        if name == "AppFunction":
            continue
        paths = _function_references(other.get("Properties", {}))
        if paths:
            refs[name] = paths

    result = {
        "mode": "live" if deployed_template is not None else "repository",
        "stack": STACK,
        "function": FUNCTION,
        "repository_inline_matches_source": local_consistent,
        "repository_source_sha256": fingerprint(repo_source),
        "symbolic_dependents": sorted(refs),
        "stack_update_requires_dependency_review": bool(refs),
        "live_template_matches_source": None,
        "live_lambda_runtime_digest": None,
        "domain_mapping_matches_expected_api": None,
        "safe_to_claim_managed_portal_live": False,
        "mutations_performed": False,
    }

    if deployed_template is not None:
        deployed_src = deployed_template["Resources"]["AppFunction"]["Properties"]["Code"]["ZipFile"]
        # CloudFormation's legacy inline ZipFile path has replaced non-ASCII
        # characters with question marks; this is *not* a general build step.
        result["live_template_matches_source"] = (
            deployed_src == ascii_cloudformation_source(repo_source)
        )
        result["stored_stack_source_sha256"] = fingerprint(deployed_src)
        result["stored_stack_source_length"] = len(deployed_src)
        result["stack_status"] = stack_status
        if function_config is not None:
            result["live_lambda_runtime_digest"] = function_config.get("CodeSha256")
            result["lambda_update_status"] = function_config.get("LastUpdateStatus")
            result["lambda_runtime_last_modified"] = function_config.get("LastModified")
        if mappings is not None and integrations is not None:
            right_mapping = any(
                x.get("ApiId") == EXPECTED_API and x.get("Stage") == "$default"
                for x in mappings
            )
            target_function = any(
                ":function:" + FUNCTION in str(x.get("IntegrationUri", ""))
                for x in integrations
            )
            result["domain_mapping_matches_expected_api"] = right_mapping and target_function

    result["release_gate"] = (
        "REPOSITORY_INLINE_MISMATCH" if not local_consistent
        else "STORED_STACK_TEMPLATE_DRIFT" if result["live_template_matches_source"] is False
        else "STACK_NOT_STABLE" if stack_status is not None and stack_status != "UPDATE_COMPLETE"
        else "UNEXPECTED_PORTAL_MAPPING" if result["domain_mapping_matches_expected_api"] is False
        else "REPO_CONSISTENT_LIVE_UNVERIFIED" if deployed_template is None
        else "TEMPLATE_PARITY_CHECKED_RUNTIME_REQUIRES_INDEPENDENT_ACCEPTANCE"
    )
    return result


def collect_live():
    # Import only in --live mode, so offline CI needs no AWS SDK/credentials.
    import boto3

    cf = boto3.client("cloudformation", region_name=REGION)
    lam = boto3.client("lambda", region_name=REGION)
    api = boto3.client("apigatewayv2", region_name=REGION)

    stack = cf.describe_stacks(StackName=STACK)["Stacks"][0]
    deployed = cf.get_template(StackName=STACK, TemplateStage="Original")["TemplateBody"]
    if isinstance(deployed, str):
        deployed = json.loads(deployed)
    config = lam.get_function_configuration(FunctionName=FUNCTION)

    mappings = api.get_api_mappings(DomainName=DOMAIN).get("Items", [])
    integrations = api.get_integrations(ApiId=EXPECTED_API).get("Items", [])
    return deployed, config, mappings, integrations, stack["StackStatus"]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true",
                        help="Read AWS configuration and compare it with the repository; no mutations")
    args = parser.parse_args(argv)

    try:
        source = SOURCE_PATH.read_text(encoding="utf-8")
        template = json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))
        if args.live:
            deployed, config, mappings, integrations, status = collect_live()
            report = examine(template, source, deployed, config, mappings, integrations, status)
        else:
            report = examine(template, source)
    except Exception as exc:
        print(json.dumps({"release_gate": "PREFLIGHT_ERROR",
                          "error_type": type(exc).__name__,
                          "mutations_performed": False}, sort_keys=True))
        return 3

    print(json.dumps(report, indent=2, sort_keys=True))
    if not report["repository_inline_matches_source"]:
        return 2
    if args.live and report["release_gate"] != "TEMPLATE_PARITY_CHECKED_RUNTIME_REQUIRES_INDEPENDENT_ACCEPTANCE":
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
