"""Synthetic, private directory access tests; no AWS calls."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import Mock

root = Path(__file__).resolve().parents[1] / "infra/aws"
spec = importlib.util.spec_from_file_location("directory_api", root / "customer-admin-directory-api.py")
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)
founder = api.load("intelligence-founder-session-api")
NOW = 1795490000
SUB = "synthetic-owner-subject"
TOKEN = "a" * 43

class DirectoryAccessTests(unittest.TestCase):
    def setUp(self):
        self.cognito, self.db, self.reader = Mock(), Mock(), Mock()
        self.event = {"version": "2.0", "cookies": [founder.COOKIE + "=" + TOKEN],
                      "requestContext": {"apiId": founder.API_ID, "domainName": founder.DOMAIN,
                                         "routeKey": "GET " + api.ROUTE,
                                         "http": {"method": "GET", "path": api.ROUTE}}}
        self.item = {"status": founder.s("active"),
                     "tokenHash": founder.s(hashlib.sha256(TOKEN.encode()).hexdigest()),
                     "scope": founder.s(founder.SCOPE), "subject": founder.s(SUB),
                     "identityProvider": founder.s("cognito-oidc"),
                     "mfaAssurance": founder.s("live-mandatory-password-totp-policy"),
                     "issuedEpoch": founder.n(NOW-10), "ttlEpoch": founder.n(NOW+1000)}
        self.db.get_item.return_value = {"Item": self.item}
        self.cognito.admin_get_user.return_value = {"Enabled": True, "UserStatus": "CONFIRMED",
            "UserAttributes": [{"Name": "sub", "Value": SUB}, {"Name": "email", "Value": founder.FOUNDER_EMAIL},
                               {"Name": "email_verified", "Value": "true"}],
            "UserMFASettingList": ["SOFTWARE_TOKEN_MFA"], "PreferredMfaSetting": "SOFTWARE_TOKEN_MFA"}
        self.cognito.describe_user_pool.return_value = {"UserPool": {"MfaConfiguration": "ON",
            "Policies": {"SignInPolicy": {"AllowedFirstAuthFactors": ["PASSWORD"]}}, "LambdaConfig": {}}}
        self.cognito.get_user_pool_mfa_config.return_value = {"MfaConfiguration": "ON", "SoftwareTokenMfaConfiguration": {"Enabled": True}}
        self.cognito.describe_user_pool_client.return_value = {"UserPoolClient": {
            "SupportedIdentityProviders": ["COGNITO"], "AllowedOAuthFlows": ["code"],
            "CallbackURLs": [founder.BASE + "/auth/callback"], "AllowedOAuthScopes": ["aws.cognito.signin.user.admin"]}}
        self.cognito.admin_list_groups_for_user.return_value = {"Groups": [{"GroupName": api.GROUP}]}
        self.reader.read_customer_identities.return_value = {"sources": [{"records": [{"email": "test@example.invalid"}]}]}
    def invoke(self, **overrides):
        options = {"now": NOW, "cognito": self.cognito, "dynamodb": self.db, "founder": founder,
                   "reader": self.reader, "enabled": True, "expected_subject": SUB}
        options.update(overrides)
        return api.handle(self.event, **options)
    def test_success_requires_audit(self):
        result = self.invoke()
        self.assertEqual(result["statusCode"], 200)
        self.assertIn("test@example.invalid", result["body"])
        self.assertIn("no-store", result["headers"]["Cache-Control"])
        self.assertEqual(self.cognito.admin_list_groups_for_user.call_count, 2)
        self.db.transact_write_items.assert_called_once()
        self.assertNotIn("test@example.invalid", repr(self.db.transact_write_items.call_args))
    def test_default_disabled(self):
        self.assertEqual(self.invoke(enabled=False)["statusCode"], 503)
        self.reader.read_customer_identities.assert_not_called()
    def test_founder_alone_denied(self):
        self.cognito.admin_list_groups_for_user.return_value = {"Groups": []}
        self.assertEqual(self.invoke()["statusCode"], 403)
        self.reader.read_customer_identities.assert_not_called()
    def test_group_revocation_before_return(self):
        self.cognito.admin_list_groups_for_user.side_effect = [{"Groups": [{"GroupName": api.GROUP}]}, {"Groups": []}]
        result = self.invoke()
        self.assertEqual(result["statusCode"], 403)
        self.assertNotIn("test@example.invalid", result["body"])
    def test_stale_session(self):
        self.item["issuedEpoch"] = founder.n(NOW-301)
        self.assertEqual(self.invoke()["statusCode"], 401)
        self.reader.read_customer_identities.assert_not_called()
    def test_missing_cookie(self):
        self.event["cookies"] = []
        self.assertEqual(self.invoke()["statusCode"], 401)
    def test_wrong_subject(self):
        self.assertEqual(self.invoke(expected_subject="different-subject")["statusCode"], 401)
    def test_audit_failure_returns_no_records(self):
        self.db.transact_write_items.side_effect = RuntimeError("failure")
        result = self.invoke()
        self.assertEqual(result["statusCode"], 503)
        self.assertNotIn("test@example.invalid", result["body"])
    def test_consumer_gateway_denied(self):
        self.event["requestContext"]["apiId"] = "wgy9p7ad0d"
        self.assertEqual(self.invoke()["statusCode"], 401)
    def test_upstream_failure_returns_unavailable(self):
        self.reader.read_customer_identities.side_effect = RuntimeError("failure")
        self.assertEqual(self.invoke()["statusCode"], 503)
        self.db.transact_write_items.assert_not_called()

if __name__ == "__main__":
    unittest.main()
