"""Contract tests for founder-only AWS IAM and DynamoDB-backed sessions."""
import hashlib
import hmac
import importlib.util
import json
import unittest
from pathlib import Path

source = Path(__file__).resolve().parents[1] / "infra" / "aws" / "intelligence-founder-session-api.py"
spec = importlib.util.spec_from_file_location("intelligence_founder_session_api", source)
assert spec is not None and spec.loader is not None
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

NOW = 1800000000
SUB = "19e16767-04f1-455b-b06b-4b84f1daa35e"
ID_TOKEN = "i" * 280
ACCESS_TOKEN = "a" * 250
SECRET = "a" * 64


class Cognito:
    def __init__(self):
        self.mfa = True
        self.registered = True
        self.enabled = True
        self.provider = ["COGNITO"]

    def describe_user_pool(self, **kwargs):
        return {"UserPool": {
            "MfaConfiguration": "ON" if self.mfa else "OFF",
            "Policies": {"SignInPolicy": {"AllowedFirstAuthFactors": ["PASSWORD"]}},
            "LambdaConfig": {},
        }}

    def get_user_pool_mfa_config(self, **kwargs):
        return {"MfaConfiguration": "ON" if self.mfa else "OFF",
                "SoftwareTokenMfaConfiguration": {"Enabled": self.mfa}}

    def describe_user_pool_client(self, **kwargs):
        return {"UserPoolClient": {
            "SupportedIdentityProviders": self.provider,
            "AllowedOAuthFlows": ["code"],
            "CallbackURLs": [api.BASE + "/auth/callback"],
            "AllowedOAuthScopes": ["openid", "aws.cognito.signin.user.admin"],
        }}

    def user(self):
        return {"UserAttributes": [
            {"Name": "sub", "Value": SUB},
            {"Name": "email", "Value": api.FOUNDER_EMAIL},
            {"Name": "email_verified", "Value": "true"},
        ], "UserMFASettingList": ["SOFTWARE_TOKEN_MFA"] if self.registered else [],
            "PreferredMfaSetting": "SOFTWARE_TOKEN_MFA" if self.registered else None,
            "Enabled": self.enabled, "UserStatus": "CONFIRMED"}

    def get_user(self, *, AccessToken):
        assert AccessToken == ACCESS_TOKEN
        return self.user()

    def admin_get_user(self, **kwargs):
        return self.user()


class Dynamo:
    def __init__(self):
        self.rows = {}
        self.fail = False

    def get_item(self, *, TableName, Key, ConsistentRead):
        assert TableName == api.TABLE and ConsistentRead
        if self.fail:
            raise RuntimeError("unavailable")
        record = self.rows.get((Key["PK"]["S"], Key["SK"]["S"]))
        return {"Item": record} if record else {}

    def transact_write_items(self, *, TransactItems, **kwargs):
        if self.fail:
            raise RuntimeError("unavailable")
        staged = dict(self.rows)
        for action in TransactItems:
            if "Put" in action:
                p = action["Put"]
                row = p["Item"]
                k = (row["PK"]["S"], row["SK"]["S"])
                if k in staged:
                    raise RuntimeError("conditional replay")
                staged[k] = row
            elif "Update" in action:
                p = action["Update"]
                k = (p["Key"]["PK"]["S"], p["Key"]["SK"]["S"])
                old = staged.get(k)
                if not old or old["status"]["S"] != "active":
                    raise RuntimeError("no active session")
                staged[k] = {**old, "status": api.s("revoked"),
                             "revokedEpoch": p["ExpressionAttributeValues"][":now"]}
        self.rows = staged


def start_event():
    nonce = "1" * 22
    msg = ".".join([
        str(NOW), nonce,
        hashlib.sha256(ID_TOKEN.encode()).hexdigest(),
        hashlib.sha256(ACCESS_TOKEN.encode()).hexdigest(),
    ]).encode()
    signed = hmac.new(SECRET.encode(), msg, hashlib.sha256).hexdigest()
    return {"version": "2.0", "requestContext": {
        "apiId": api.API_ID, "domainName": api.DOMAIN,
        "routeKey": "POST /founder/session",
        "http": {"method": "POST", "path": "/founder/session"},
        "authorizer": {"jwt": {"claims": {
            "iss": api.ISSUER, "aud": api.CLIENT, "token_use": "id",
            "email": api.FOUNDER_EMAIL, "email_verified": "true",
            "auth_time": str(NOW - 20), "iat": str(NOW - 15),
            "exp": str(NOW + 600), "sub": SUB,
        }}},
    }, "headers": {
        "authorization": "Bearer " + ID_TOKEN,
        "x-npi-founder-time": str(NOW),
        "x-npi-founder-nonce": nonce,
        "x-npi-founder-proof": signed,
    }, "body": json.dumps({"accessToken": ACCESS_TOKEN})}


def event(method, route, token=None):
    return {"version": "2.0", "requestContext": {
        "apiId": api.API_ID, "domainName": api.DOMAIN,
        "routeKey": method + " " + route,
        "http": {"method": method, "path": route}},
        "headers": {"origin": api.BASE},
        "cookies": [api.COOKIE + "=" + token] if token else []}


class FounderTests(unittest.TestCase):
    def setUp(self):
        self.cognito, self.db = Cognito(), Dynamo()

    def call(self, request):
        return api.handle(request, now=NOW, cognito=self.cognito,
                          dynamodb=self.db, bridge_secret=SECRET)

    def login(self):
        return self.call(start_event())

    def get_secret(self, result):
        return result["headers"].get("Set-Cookie", "").split("=")[1].split(";")[0]

    def test_issue_limited_cookie_and_authorise_revocable_private_shell(self):
        r = self.login()
        self.assertEqual(r["statusCode"], 200)
        self.assertTrue(json.loads(r["body"])["ok"])
        cookie = r["headers"]["Set-Cookie"]
        for mark in ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=1800"]:
            self.assertIn(mark, cookie)
        self.assertNotIn("Domain=", cookie)
        self.assertEqual(json.loads(r["body"])["customerAccess"], False)
        self.assertEqual(json.loads(r["body"])["medicinesDataAccess"], False)
        self.assertEqual(len([k for k in self.db.rows if k[0].startswith("TENANT#")]), 0)
        self.assertEqual(len([k for k in self.db.rows if k[0].startswith("SESSION#")]), 0)
        secret = self.get_secret(r)
        self.assertEqual(len(secret), 43)
        self.assertNotIn(secret, json.dumps(list(self.db.rows.values())))
        live = self.call(event("GET", "/founder/session", secret))
        self.assertEqual(live["statusCode"], 200)
        self.assertEqual(json.loads(live["body"])["scope"], api.SCOPE)
        signout = self.call(event("POST", "/founder/logout", secret))
        self.assertEqual(signout["statusCode"], 200)
        self.assertIn("Max-Age=0", signout["headers"]["Set-Cookie"])
        self.assertEqual(self.call(event("GET", "/founder/session", secret))["statusCode"], 401)

    def test_bridge_replay_rejected(self):
        self.assertEqual(self.login()["statusCode"], 200)
        self.assertEqual(self.login()["statusCode"], 503)

    def test_wrong_or_missing_signatures_rejected(self):
        for mutation in (
            lambda x: x["headers"].pop("x-npi-founder-proof"),
            lambda x: x["headers"].update({"x-npi-founder-proof": "0"*64}),
            lambda x: x["headers"].update({"x-npi-founder-time": str(NOW-61)}),
            lambda x: x["headers"].update({"origin": "https://evil.example"}),
            lambda x: x["requestContext"]["authorizer"].pop("jwt"),
            lambda x: x["requestContext"].update({"domainName": "evil.example"}),
        ):
            request = start_event()
            mutation(request)
            self.assertNotEqual(self.call(request)["statusCode"], 200)

    def test_no_mfa_or_provider_drift_denies_all(self):
        for drift in ("mfa", "registered", "enabled", "provider"):
            cg = Cognito()
            if drift == "provider":
                cg.provider = ["COGNITO", "Google"]
            elif drift == "enabled":
                cg.enabled = False
            else:
                setattr(cg, drift, False)
            self.cognito = cg
            # Registered factor can only be validated on an enabled Cognito account.
            self.assertNotEqual(self.login()["statusCode"], 200)
            self.cognito = Cognito()

    def test_expires_without_database_ttl_deletion(self):
        token = self.get_secret(self.login())
        self.db.rows[("FOUNDER_SESSION#" + hashlib.sha256(token.encode()).hexdigest(), "META")]["ttlEpoch"] = api.n(NOW-1)
        self.assertEqual(self.call(event("GET", "/founder/session", token))["statusCode"], 401)

    def test_missing_backend_and_spoofed_cookie_fail_closed(self):
        self.assertEqual(self.call(event("GET", "/founder/session"))["statusCode"], 401)
        self.db.fail = True
        self.assertNotEqual(self.login()["statusCode"], 200)
        self.db.fail = False
        result = self.login()
        token = self.get_secret(result)
        self.db.fail = True
        self.assertEqual(self.call(event("GET", "/founder/session", token))["statusCode"], 503)

    def test_logout_requires_same_origin_and_durable_revocation(self):
        token = self.get_secret(self.login())
        bad = event("POST", "/founder/logout", token)
        bad["headers"]["origin"] = "https://evil.example"
        self.assertEqual(self.call(bad)["statusCode"], 403)
        self.db.fail = True
        self.assertEqual(self.call(event("POST", "/founder/logout", token))["statusCode"], 503)

    def test_founder_denial_telemetry_is_redacted_and_does_not_grant_access(self):
        from contextlib import redirect_stdout
        from io import StringIO
        for variant, expected in (
            ("invalid_claims", "signed_founder_identity_required"),
            ("invalid_bridge", "server_bridge_required"),
        ):
            request = start_event()
            if variant == "invalid_claims":
                request["requestContext"]["authorizer"]["jwt"]["claims"]["email"] = "untrusted@example.invalid"
            else:
                request["headers"]["x-npi-founder-proof"] = "0" * 64
            log = StringIO()
            with redirect_stdout(log):
                response = self.call(request)
            self.assertEqual(response["statusCode"], 401)
            self.assertEqual(json.loads(response["body"])["code"], expected)
            line = log.getvalue()
            entry = json.loads(line)
            self.assertEqual(entry, {
                "event": "npi_founder_session_denied",
                "classification": expected,
                "http_status": 401,
            })
            self.assertNotIn(api.FOUNDER_EMAIL, line)
            self.assertNotIn(ID_TOKEN, line)
            self.assertNotIn(ACCESS_TOKEN, line)
            self.assertNotIn(SECRET, line)
            self.assertNotIn("untrusted@example.invalid", line)

    def test_only_required_routes_exist(self):
        self.assertEqual(self.call(event("GET", "/customer/session"))["statusCode"], 404)
        self.assertEqual(self.call(event("POST", "/founder/grant"))["statusCode"], 404)


    def test_internal_503_stages_are_redacted_and_never_grant_sessions(self):
        from contextlib import redirect_stdout
        from io import StringIO

        def explode(**_kwargs):
            raise RuntimeError("SECRET_TOKEN_PASSWORD_NEVER_LOG_THIS")

        for stage, method in (
            ("cognito_pool_policy", "describe_user_pool"),
            ("cognito_access_user", "get_user"),
            ("cognito_admin_user", "admin_get_user"),
            ("ddb_atomic_session_write", None),
        ):
            self.cognito, self.db = Cognito(), Dynamo()
            if method is None:
                self.db.fail = True
            else:
                setattr(self.cognito, method, explode)
            output = StringIO()
            with redirect_stdout(output):
                response = self.login()
            self.assertEqual(response["statusCode"], 503)
            self.assertNotIn("Set-Cookie", response["headers"])
            lines = [json.loads(line) for line in output.getvalue().splitlines() if line]
            self.assertEqual(lines, [
                {"event": "npi_founder_internal_failure", "stage": stage, "http_status": 503},
                {"event": "npi_founder_session_denied",
                 "classification": "founder_session_unavailable", "http_status": 503},
            ])
            self.assertNotIn("SECRET_TOKEN_PASSWORD_NEVER_LOG_THIS", output.getvalue())
            self.assertNotIn(api.FOUNDER_EMAIL, output.getvalue())
            self.assertNotIn(SECRET, output.getvalue())

    def test_founder_session_read_and_logout_failures_have_fixed_private_stages(self):
        from contextlib import redirect_stdout
        from io import StringIO

        for route, method, stage in (
            ("/founder/session", "GET", "ddb_session_read"),
            ("/founder/logout", "POST", "ddb_logout_write"),
        ):
            self.cognito, self.db = Cognito(), Dynamo()
            cookie = self.get_secret(self.login())
            self.db.fail = True
            captured = StringIO()
            with redirect_stdout(captured):
                result = self.call(event(method, route, cookie))
            self.assertEqual(result["statusCode"], 503)
            rows = [json.loads(line) for line in captured.getvalue().splitlines() if line]
            self.assertEqual(rows[0], {
                "event": "npi_founder_internal_failure", "stage": stage, "http_status": 503,
            })
            self.assertNotIn(api.FOUNDER_EMAIL, captured.getvalue())
            self.assertNotIn(SECRET, captured.getvalue())

    def test_internal_failure_stage_is_allowlisted_not_user_controlled(self):
        from contextlib import redirect_stdout
        from io import StringIO
        captured = StringIO()
        with redirect_stdout(captured):
            api.internal_failure("untrusted_token_with_secret")
        self.assertEqual(json.loads(captured.getvalue()), {
            "event": "npi_founder_internal_failure",
            "stage": "unclassified",
            "http_status": 503,
        })
        self.assertNotIn("untrusted_token_with_secret", captured.getvalue())


if __name__ == "__main__":
    unittest.main()
