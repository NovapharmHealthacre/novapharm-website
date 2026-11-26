"""Private Stripe sandbox transport. No credentials or deployment configured.

Never use a live key. All provider objects are retrieved from the fixed Stripe
API origin. The caller must supply a dedicated sandbox account and restricted
test credential from a trusted secret store.
"""
import json
import re
import urllib.parse
import urllib.request
import urllib.error

from gift_card_purchase import CONFIG_ID, PAYMENT_ID, validate_session_id

ORIGIN = "https://api.stripe.com"
KEY = re.compile(r"^(?:sk|rk)_test_[A-Za-z0-9_]+$")
CHARGE = re.compile(r"^ch_[A-Za-z0-9]+$")
ACCOUNT = re.compile(r"^acct_[A-Za-z0-9]+$")
MAX_BODY = 2 * 1024 * 1024


class ProviderUnavailable(RuntimeError):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def encode_form(value, prefix=""):
    """Stripe form-encoded bracket paths, including nested lists and maps."""
    if isinstance(value,dict):
        for k,v in value.items():
            yield from encode_form(v, f"{prefix}[{k}]" if prefix else k)
    elif isinstance(value,list):
        for i,v in enumerate(value):
            yield from encode_form(v, f"{prefix}[{i}]")
    elif isinstance(value,bool):
        yield prefix, "true" if value else "false"
    elif isinstance(value,(str,int)):
        yield prefix, str(value)
    else:
        raise ValueError("unsupported Stripe form field")


class StripeSandbox:
    def __init__(self, secret, account, *, opener=None):
        if not isinstance(secret,str) or not KEY.fullmatch(secret):
            raise ValueError("Stripe sandbox credential required")
        if not isinstance(account,str) or not ACCOUNT.fullmatch(account):
            raise ValueError("approved sandbox account required")
        self._secret=secret
        self.account=account
        self._opener=opener or urllib.request.build_opener(NoRedirect())

    def _request(self, path, *, params=None, idempotency_key=None):
        if not re.fullmatch(r"/v1/(?:account|payment_method_configurations/pmc_[A-Za-z0-9]+|checkout/sessions(?:/cs_test_[A-Za-z0-9]+)?|payment_intents/pi_[A-Za-z0-9]+|charges/ch_[A-Za-z0-9]+)",path):
            raise ValueError("unsupported provider path")
        headers={"Authorization":"Bearer "+self._secret,"Accept":"application/json"}
        data=None
        if params is not None:
            if path!="/v1/checkout/sessions" or not isinstance(idempotency_key,str) or not re.fullmatch(r"gift-checkout-GIFT-[A-Za-z0-9_-]{3,128}",idempotency_key):
                raise ValueError("bounded gift checkout idempotency key required")
            headers["Idempotency-Key"]=idempotency_key
            headers["Content-Type"]="application/x-www-form-urlencoded"
            data=urllib.parse.urlencode(list(encode_form(params))).encode()
        request=urllib.request.Request(ORIGIN+path,data=data,headers=headers,
                                       method="POST" if data is not None else "GET")
        try:
            with self._opener.open(request,timeout=12) as response:
                body=response.read(MAX_BODY+1)
                if len(body)>MAX_BODY:
                    raise ProviderUnavailable("Stripe response exceeds limit")
                result=json.loads(body)
        except (urllib.error.URLError, OSError, ValueError):
            # Never emit Stripe error bodies, credentials or payment details.
            raise ProviderUnavailable("Stripe sandbox request could not be confirmed") from None
        if not isinstance(result,dict) or "error" in result:
            raise ProviderUnavailable("Stripe sandbox response invalid")
        return result

    def _account_check(self):
        if self._request("/v1/account").get("id")!=self.account:
            raise ProviderUnavailable("Stripe sandbox account mismatch")

    def get_configuration(self, config_id):
        if not isinstance(config_id,str) or not CONFIG_ID.fullmatch(config_id):
            raise ValueError("invalid configuration ID")
        self._account_check()
        result=self._request("/v1/payment_method_configurations/"+config_id)
        if result.get("livemode") is not False:
            raise ProviderUnavailable("non-sandbox configuration")
        return result

    def create_or_reconcile(self, params, idempotency_key):
        self._account_check()
        if (params.get("mode")!="payment" or params.get("metadata",{}).get("purchase_type")!="novapharm_gift_card" or
            params.get("allow_promotion_codes") is not False or
            "klarna" not in params.get("excluded_payment_method_types",[])):
            raise ValueError("gift checkout parameters required")
        result=self._request("/v1/checkout/sessions",params=params,idempotency_key=idempotency_key)
        if result.get("livemode") is not False:
            raise ProviderUnavailable("non-sandbox checkout")
        validate_session_id(result.get("id"),False)
        return result

    def get_payment_objects(self, session_id):
        validate_session_id(session_id,False)
        self._account_check()
        session=self._request("/v1/checkout/sessions/"+session_id)
        pid=session.get("payment_intent")
        if not isinstance(pid,str) or not PAYMENT_ID.fullmatch(pid):
            raise ProviderUnavailable("payment intent unavailable")
        intent=self._request("/v1/payment_intents/"+pid)
        charge_id=intent.get("latest_charge")
        if not isinstance(charge_id,str) or not CHARGE.fullmatch(charge_id):
            raise ProviderUnavailable("charge unavailable")
        charge=self._request("/v1/charges/"+charge_id)
        if any(obj.get("livemode") is not False for obj in (session,intent,charge)):
            raise ProviderUnavailable("non-sandbox payment object")
        return session,intent,charge
