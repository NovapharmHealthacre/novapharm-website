import unittest
from gift_card_email import GiftEmailSender, content


class FakeSES:
    def __init__(self):
        self.calls=[]
        self.account={"ProductionAccessEnabled":True,"SendingEnabled":True}
        self.identity={"VerifiedForSendingStatus":True,
                       "DkimAttributes":{"SigningEnabled":True,"Status":"SUCCESS"}}

    def get_account(self): return self.account

    def get_email_identity(self,EmailIdentity):
        assert EmailIdentity=="novapharmhealthcare.com"
        return self.identity

    def send_email(self,**kwargs):
        self.calls.append(kwargs)
        return {"MessageId":"synthetic-message-id"}


class GiftEmailTests(unittest.TestCase):
    def setUp(self):
        self.ses=FakeSES()
        self.code="NP-"+"A"*32
        self.recipient="recipient@example.com"
        self.sender="support@novapharmhealthcare.com"

    def call(self,**flags):
        return GiftEmailSender(self.ses,self.sender,**flags)(self.recipient,self.code,5000)

    def test_default_off_and_both_approvals_required(self):
        for flags in ({},{"enabled":True},{"release_approved":True}):
            with self.assertRaises(ValueError): self.call(**flags)
        self.assertEqual(self.ses.calls,[])

    def test_message_contains_only_validated_gift_details(self):
        self.assertEqual(self.call(enabled=True,release_approved=True),"synthetic-message-id")
        message=self.ses.calls[0]
        self.assertEqual(message["Destination"],{"ToAddresses":[self.recipient]})
        self.assertEqual(message["ReplyToAddresses"],[self.sender])
        simple=message["Content"]["Simple"]
        self.assertNotIn(self.code,simple["Subject"]["Data"])
        for kind in ("Text","Html"):
            self.assertIn(self.code,simple["Body"][kind]["Data"])
            self.assertIn("£50.00",simple["Body"][kind]["Data"])
        self.assertIn("novapharm-healthcare-logo.png",simple["Body"]["Html"]["Data"])
        self.assertNotIn("https://checkout.stripe.com",simple["Body"]["Html"]["Data"])

    def test_invalid_gift_and_unverified_sender_blocked(self):
        for code,value in (("<script>",5000),(self.code,5001),(self.code,True)):
            with self.assertRaises(ValueError): content(code,value)
        self.ses.identity["DkimAttributes"]["Status"]="FAILED"
        with self.assertRaises(ValueError): self.call(enabled=True,release_approved=True)
        self.assertEqual(self.ses.calls,[])


if __name__=="__main__":
    unittest.main()
