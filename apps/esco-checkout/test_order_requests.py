"""Order requests are not charges: durable 373-SKU receipt contracts."""
import json
import unittest
from unittest.mock import patch
from botocore.exceptions import ClientError

import index as mod

UUID="11111111-1111-4111-8111-111111111111"
ORDER_ID="ESCO-REQ-"+UUID


def event(method="POST", body=None, path="/order-requests"):
    return {
        "rawPath":path, "requestContext":{"http":{"method":method}},
        "headers":{"origin":"https://novapharmhealthcare.com"},
        "body":json.dumps(body) if body is not None else None,
    }


def payload():
    return {
        "request_id":UUID,
        "lines":[{"id":"ESCO-CAT-0001","quantity":2},{"id":"ESCO-CAT-0373","quantity":1}],
        "customer":{"name":"Procurement Manager","email":"buyer@example.org",
                    "organisation":"Example Hospital","postcode":"SW1A 1AA"},
        "accept_order_terms":True, "website":"",
    }


def parse(response):
    return response["statusCode"], json.loads(response["body"])


class FakeDb:
    def __init__(self):
        self.rows={}
    def put_item(self, *, TableName, Item, ConditionExpression):
        assert ConditionExpression=="attribute_not_exists(pk)"
        key=Item["pk"]["S"]
        if key in self.rows:
            raise ClientError({"Error":{"Code":"ConditionalCheckFailedException","Message":"Duplicate"}},
                              "PutItem")
        self.rows[key]=Item
    def get_item(self, *, TableName, Key, ConsistentRead):
        return {"Item":self.rows.get(Key["pk"]["S"])}


class OrderRequests(unittest.TestCase):
    def setUp(self):
        self.db=FakeDb()
        self.patches=[
            patch.object(mod,"ORDERS_TABLE","test-escopayment-ledger"),
            patch.object(mod,"ORDER_NOTIFY_FROM",""),
            patch.object(mod,"ORDER_NOTIFY_TO",""),
            patch.object(mod,"aws",side_effect=lambda service:self.db),
        ]
        for p in self.patches: p.start()
    def tearDown(self):
        for p in reversed(self.patches): p.stop()

    def test_order_for_first_and_last_reference_is_recorded_without_payment(self):
        code, body=parse(mod.handler(event(body=payload())))
        self.assertEqual(code,202)
        self.assertEqual(body["orderId"],ORDER_ID)
        self.assertFalse(body["paymentCollected"])
        record=self.db.rows["REQUEST#"+ORDER_ID]
        self.assertEqual(record["state"]["S"],"RECEIVED_AWAITING_CONFIRMATION")
        self.assertEqual(json.loads(record["linesJson"]["S"]),payload()["lines"])
        self.assertEqual(record["customerEmail"]["S"],"buyer@example.org")
        self.assertFalse(record["moneyTaken"]["BOOL"])
        self.assertGreater(int(record["expiresAt"]["N"]),int(record["createdAtUnix"]["N"]))

    def test_retry_is_idempotent_and_returns_only_same_order_id(self):
        first=mod.handler(event(body=payload()))
        second=mod.handler(event(body=payload()))
        self.assertEqual(parse(first),parse(second) if "message" not in json.loads(first["body"]) else
                         (202, {**json.loads(second["body"]),"message":json.loads(first["body"])["message"]}))
        self.assertEqual(len(self.db.rows),1)
        changed=payload()
        changed["lines"][0]["quantity"]=3
        self.assertEqual(parse(mod.handler(event(body=changed)))[0],409)

    def test_all_reference_numbers_are_valid_but_no_unlisted_374th(self):
        for id_ in ("ESCO-CAT-0001","ESCO-CAT-0373"):
            p=payload()
            p["lines"]=[{"id":id_,"quantity":1}]
            self.assertEqual(parse(mod.handler(event(body=p)))[0],202)
            self.db.rows.clear()
        for id_ in ("ESCO-CAT-0000","ESCO-CAT-0374","ESCO-CAT-9999","ESCO-CAT-x","NPH-ESCO-0001"):
            p=payload()
            p["lines"]=[{"id":id_,"quantity":1}]
            self.assertEqual(parse(mod.handler(event(body=p)))[0],400, id_)

    def test_unrecognised_price_and_fake_approvals_rejected(self):
        for key,val in [("unit_price_pence",1),("payment_approved",True),("stripe_price","price_fake")]:
            p=payload()
            p[key]=val
            self.assertEqual(parse(mod.handler(event(body=p)))[0],400,key)
        self.assertEqual(len(self.db.rows),0)

    def test_invalid_customer_honeypot_quantities_and_terms_rejected(self):
        examples=[
            {"customer":{**payload()["customer"],"email":"bad-email"}},
            {"website":"spam-domain.example"},
            {"accept_order_terms":False},
            {"lines":[{"id":"ESCO-CAT-0001","quantity":1001}]},
            {"lines":[{"id":"ESCO-CAT-0001","quantity":1},{"id":"ESCO-CAT-0001","quantity":1}]},
        ]
        for change in examples:
            p=payload()
            p.update(change)
            self.assertEqual(parse(mod.handler(event(body=p)))[0],400,change)

    def test_request_status_does_not_leak_contact_details(self):
        mod.handler(event(body=payload()))
        status=mod.handler(event(method="GET",path="/order-request-status/"+ORDER_ID))
        code, body=parse(status)
        self.assertEqual(code,200)
        self.assertEqual(body["status"],"RECEIVED_AWAITING_CONFIRMATION")
        self.assertFalse(body["paymentCollected"])
        self.assertNotIn("email",status["body"].lower())
        self.assertNotIn("Procurement Manager",status["body"])
        self.assertEqual(parse(mod.handler(event(method="GET",path="/order-request-status/not-a-real-id")))[0],400)


if __name__=="__main__":
    unittest.main()
