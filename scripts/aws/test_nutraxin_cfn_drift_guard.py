"""Offline, no-credential tests for the read-only Nutraxin CloudFormation drift guard."""
import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "nutraxin_cfn_drift_guard.py"
spec = importlib.util.spec_from_file_location("nutraxin_cfn_drift_guard", SCRIPT)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


def template(code):
    return {
        "Resources": {
            "AppFunction": {
                "Type": "AWS::Lambda::Function",
                "Properties": {"Code": {"ZipFile": code}},
            },
            "AppIntegration": {
                "Type": "AWS::ApiGatewayV2::Integration",
                "Properties": {
                    "IntegrationUri": {"Fn::GetAtt": ["AppFunction", "Arn"]},
                },
            },
            "InvokePermission": {
                "Type": "AWS::Lambda::Permission",
                "Properties": {
                    "FunctionName": {"Fn::GetAtt": ["AppFunction", "Arn"]},
                },
            },
            "UnrelatedResource": {
                "Type": "AWS::Logs::LogGroup",
                "Properties": {"RetentionInDays": 14},
            },
        },
    }


class DriftGuardTests(unittest.TestCase):
    def setUp(self):
        self.source = 'print("new visual — test")\n'
        self.repo = template(self.source)
        self.live = template(guard.ascii_cloudformation_source(self.source))
        self.config = {
            "CodeSha256": "synthetic-digest",
            "LastUpdateStatus": "Successful",
            "LastModified": "2026-11-15T14:13:13Z",
        }
        self.mapping = [{"ApiId": guard.EXPECTED_API, "Stage": "$default"}]
        self.integrations = [
            {"IntegrationUri": "arn:aws:lambda:eu-north-1:123:function:" + guard.FUNCTION}
        ]

    def test_repository_mode_cannot_certify_runtime(self):
        result = guard.examine(self.repo, self.source)
        self.assertTrue(result["repository_inline_matches_source"])
        self.assertIsNone(result["live_template_matches_source"])
        self.assertEqual(result["release_gate"], "REPO_CONSISTENT_LIVE_UNVERIFIED")
        self.assertFalse(result["safe_to_claim_managed_portal_live"])
        self.assertFalse(result["mutations_performed"])

    def test_clean_live_template_still_requires_runtime_acceptance(self):
        result = guard.examine(
            self.repo, self.source, self.live, self.config,
            self.mapping, self.integrations, "UPDATE_COMPLETE"
        )
        self.assertTrue(result["live_template_matches_source"])
        self.assertTrue(result["domain_mapping_matches_expected_api"])
        self.assertEqual(result["release_gate"],
                         "TEMPLATE_PARITY_CHECKED_RUNTIME_REQUIRES_INDEPENDENT_ACCEPTANCE")
        self.assertEqual(result["live_lambda_runtime_digest"], "synthetic-digest")
        self.assertFalse(result["safe_to_claim_managed_portal_live"])

    def test_stored_template_drift_is_blocking_even_when_live_lambda_is_healthy(self):
        self.live["Resources"]["AppFunction"]["Properties"]["Code"]["ZipFile"] = "prior visual"
        result = guard.examine(
            self.repo, self.source, self.live, self.config,
            self.mapping, self.integrations, "UPDATE_COMPLETE"
        )
        self.assertFalse(result["live_template_matches_source"])
        self.assertEqual(result["release_gate"], "STORED_STACK_TEMPLATE_DRIFT")
        self.assertTrue(result["stack_update_requires_dependency_review"])
        self.assertEqual(result["symbolic_dependents"],
                         ["AppIntegration", "InvokePermission"])

    def test_repository_inline_divergence_blocks_release(self):
        self.repo["Resources"]["AppFunction"]["Properties"]["Code"]["ZipFile"] = "other"
        report = guard.examine(self.repo, self.source)
        self.assertFalse(report["repository_inline_matches_source"])
        self.assertEqual(report["release_gate"], "REPOSITORY_INLINE_MISMATCH")

    def test_wrong_domain_and_stale_stack_detected(self):
        wrong = [{"ApiId": "wrong", "Stage": "$default"}]
        report = guard.examine(
            self.repo, self.source, self.live, self.config,
            wrong, self.integrations, "UPDATE_COMPLETE"
        )
        self.assertFalse(report["domain_mapping_matches_expected_api"])
        self.assertEqual(report["release_gate"], "UNEXPECTED_PORTAL_MAPPING")
        report = guard.examine(
            self.repo, self.source, self.live, self.config,
            self.mapping, self.integrations, "UPDATE_ROLLBACK_FAILED"
        )
        self.assertEqual(report["release_gate"], "STACK_NOT_STABLE")

    def test_ascii_replacement_is_exact_not_escaping(self):
        self.assertEqual(guard.ascii_cloudformation_source("✓ and £ and —"), "? and ? and ?")


if __name__ == "__main__":
    unittest.main()
