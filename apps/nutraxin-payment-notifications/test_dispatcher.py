"""Synthetic, no-network acceptance of the gated Nutraxin paid receipt worker."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[2]
os.environ.update({
    "AWS_REGION": "eu-north-1",
    "NOTIFICATIONS_ENABLED": "false",
    "PAYMENT_LEDGER_TABLE": "synthetic-ledger",
    "PAYMENT_OUTBOX_TABLE": "synthetic-outbox",
    "STRIPE_API_KEY_SECRET_ID": "synthetic-secret",
    "EMAIL_SENDER": "vishal@novapharmhealthcare.com"
})

class FakeClientError(Exception):
    def __init__(self, code="ConditionalCheckFailedException"):
        self.response = {"Error": {"Code": code}}
        super().__init__(code)

ORDER_ID = "NUT-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
EVENT_ID = "evt_" + "a" * 18
SESSION_ID = "cs_live_" + "b" * 18
ATTEMPT = "attempt_" + "c" * 10

def s(value):
    return {"S": value}

def outbox():
    return {"pk": s("ORDER#" + ORDER_ID),
            "sk": s("PAYMENT_EVENT#" + EVENT_ID),
            "status": s("PENDING_REVIEW"),
            "eventType": s("NUTRAXIN_PAYMENT_PAID"),
            "paymentAttemptId": s(ATTEMPT)}

def ledger():
    return {"pk": s("ORDER#" + ORDER_ID), "sk": s("SUMMARY"),
            "orderId": s(ORDER_ID), "status": s("PAID"),
            "stripeSessionId": s(SESSION_ID), "lastStripeEventId": s(EVENT_ID),
            "totalGrossMinor": {"N": "1547"}, "currency": s("GBP"),
            "quoteVersion": s("quote_123"), "customerId": s("cust_123")}

def session():
    return {"id": SESSION_ID, "livemode": True, "mode": "payment",
            "status": "complete", "payment_status": "paid", "currency": "gbp",
            "amount_total": 1547, "client_reference_id": ORDER_ID,
            "metadata": {"payment_attempt_id": ATTEMPT,
                         "quote_version": "quote_123", "customer_id": "cust_123"},
            "customer_details": {"email": "customer@example.invalid"}}

class FakeDDB:
    def __init__(self):
        self.rows={}
        self.scans=0
        self.page_first=False
        self.updates=[]
    def scan(self, **kw):
        self.scans+=1
        if self.page_first and self.scans==1:
            return {"Items":[], "LastEvaluatedKey": {"pk":s("other"),"sk":s("other")}}
        records = [item for key,item in self.rows.items() if key[0].startswith("ORDER#")
                   and key[1].startswith("PAYMENT_EVENT#") and
                   item["status"]["S"]=="PENDING_REVIEW" and
                   item["eventType"]["S"]=="NUTRAXIN_PAYMENT_PAID"]
        return {"Items":records}
    def get_item(self, **kw):
        key=(kw["Key"]["pk"]["S"],kw["Key"]["sk"]["S"])
        return {"Item":self.rows.get(key)}
    def update_item(self, **kw):
        key=(kw["Key"]["pk"]["S"],kw["Key"]["sk"]["S"])
        row=self.rows.get(key)
        if row is None or row["status"]["S"]!=kw["ExpressionAttributeValues"].get(
                ":prev",kw["ExpressionAttributeValues"].get(":pending"))["S"]:
            raise FakeClientError()
        row["status"]=kw["ExpressionAttributeValues"].get(
            ":status",kw["ExpressionAttributeValues"].get(":claim"))
        self.updates.append(kw)
        return {}

class FakeSES:
    def __init__(self):self.approved=False;self.sent=[]
    def get_account(self):
        return {"ProductionAccessEnabled":self.approved,"SendingEnabled":True}
    def send_email(self,**kw):
        self.sent.append(kw)
        return {"MessageId":"synthetic-ses-message-1"}

class FakeSecrets:
    def get_secret_value(self, **kw):
        return {"SecretString":"rk_live_synthetic_only_never_real"}

DB=FakeDDB()
SES=FakeSES()
SM=FakeSecrets()
boto=types.ModuleType("boto3")
boto.client=lambda service, **kw: DB if service=="dynamodb" else SES if service=="sesv2" else SM
sys.modules["boto3"]=boto
sys.modules["botocore"]=types.ModuleType("botocore")
ce=types.ModuleType("botocore.exceptions")
ce.ClientError=FakeClientError
sys.modules["botocore.exceptions"]=ce
spec=importlib.util.spec_from_file_location("nutraxin_paid_notifications",
    ROOT/"apps/nutraxin-payment-notifications/dispatcher.py")
APP=importlib.util.module_from_spec(spec)
spec.loader.exec_module(APP)

class NotificationContracts(unittest.TestCase):
    def setUp(self):
        DB.rows={("ORDER#"+ORDER_ID,"SUMMARY"):ledger(),
                 ("ORDER#"+ORDER_ID,"PAYMENT_EVENT#"+EVENT_ID):outbox()}
        DB.scans=0;DB.page_first=False;DB.updates=[]
        SES.approved=False;SES.sent=[]
        APP.ENABLED=False
        APP.stripe_session=lambda sid:session()
    def scheduler(self):
        return {"source":"aws.events","detail-type":"Scheduled Event"}
    def result(self,event):
        return json.loads(APP.handler(event,None)["body"])
    def test_default_off_and_non_scheduler_denied(self):
        self.assertEqual(self.result(self.scheduler()),{"enabled":False,"processed":0})
        self.assertEqual(SES.sent,[])
        APP.ENABLED=True;SES.approved=True
        self.assertEqual(APP.handler({"source":"web"},None)["statusCode"],403)
        self.assertEqual(SES.sent,[])
    def test_ses_denial_gates_before_any_payments_or_email(self):
        APP.ENABLED=True
        res=APP.handler(self.scheduler(),None)
        self.assertEqual(res["statusCode"],503)
        self.assertEqual(self.result(self.scheduler())["error"],"ses_production_access_not_approved")
        self.assertEqual(DB.scans,0)
        self.assertEqual(SES.sent,[])
    def test_verified_paid_receipt_sent_once_and_no_email_in_outbox(self):
        APP.ENABLED=True;SES.approved=True
        result=self.result(self.scheduler())
        self.assertEqual(result["sent"],1)
        self.assertEqual(len(SES.sent),1)
        self.assertEqual(SES.sent[0]["Destination"]["ToAddresses"],["customer@example.invalid"])
        row=DB.rows[("ORDER#"+ORDER_ID,"PAYMENT_EVENT#"+EVENT_ID)]
        self.assertEqual(row["status"]["S"],"SENT")
        self.assertNotIn("email",row)
        self.assertEqual(self.result(self.scheduler())["sent"],0)
        self.assertEqual(len(SES.sent),1)
    def test_reject_mismatched_paid_session_and_preserve_outbox(self):
        APP.ENABLED=True;SES.approved=True
        bad=session();bad["amount_total"]=1548
        APP.stripe_session=lambda sid:bad
        result=self.result(self.scheduler())
        self.assertEqual(result["sent"],0)
        self.assertEqual(result["needs_review"],1)
        self.assertEqual(SES.sent,[])
        self.assertEqual(DB.rows[("ORDER#"+ORDER_ID,"PAYMENT_EVENT#"+EVENT_ID)]["status"]["S"],"PENDING_REVIEW")
    def test_scan_paginates_nonmatching_entries(self):
        APP.ENABLED=True;SES.approved=True
        DB.page_first=True
        res=self.result(self.scheduler())
        self.assertEqual(res["sent"],1)
        self.assertEqual(DB.scans,2)
    def test_template_defaults_off_no_public_endpoint_and_exact_inline_code(self):
        raw=(ROOT/"apps/nutraxin-payment-notifications/dispatcher.py").read_text()
        tpl=json.loads((ROOT/"infra/aws/nutraxin-payment-notifications-production.json").read_text())
        props=tpl["Resources"]["NotificationLambda"]["Properties"]
        self.assertEqual(props["Code"]["ZipFile"],raw)
        self.assertEqual(tpl["Parameters"]["NotificationsEnabled"]["Default"],"false")
        self.assertEqual(tpl["Resources"]["NotificationSchedule"]["Condition"],"SendingApproved")
        self.assertEqual(tpl["Resources"]["NotificationPermission"]["Condition"],"SendingApproved")
        self.assertFalse(any("ApiGateway" in v["Type"] for v in tpl["Resources"].values()))
        self.assertNotIn("ses:SendBulkEmail",json.dumps(tpl))
        self.assertNotIn("secretsmanager:PutSecretValue",json.dumps(tpl))
        self.assertIn("dynamodb:Scan",json.dumps(tpl))
        self.assertIn("dynamodb:GetItem",json.dumps(tpl))
        self.assertIn("ses:GetAccount",json.dumps(tpl))

if __name__=="__main__":
    unittest.main()
