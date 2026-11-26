"""Private gift email adapter. Not deployed or scheduled.

Only the verified gift-card delivery worker may invoke this adapter.
Do not attach it to the existing paid-order receipt scheduler.
"""
import re
from html import escape
from gift_card_contract import CODE, DENOMINATIONS

DOMAIN = "novapharmhealthcare.com"
SUPPORT = "support@" + DOMAIN
LOGO = "https://novapharmhealthcare.com/assets/brand/novapharm-healthcare-logo.png"
STORE = "https://novapharmhealthcare.com/products/nutraxin/"
EMAIL = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,178}[A-Za-z0-9])?$")


def content(code, denomination):
    if not isinstance(code,str) or not CODE.fullmatch(code):
        raise ValueError("invalid verified gift code")
    if type(denomination) is not int or denomination not in DENOMINATIONS:
        raise ValueError("invalid verified denomination")
    value = "£" + str(denomination // 100) + ".00"
    subject = "Your NovaPharm digital gift card"
    body = ("NovaPharm Healthcare\n\nA gift for you.\n\n"
            + "Gift card value: " + value + "\nGift card code: " + code +
            "\n\nKeep this code private. Use it only on our official website. "
            "For help with your gift card, contact " + SUPPORT + ".\n" + STORE)
    html = ('<!doctype html><html lang="en-GB"><body style="margin:0;background:#FFFFFF;color:#0B0B0E;font-family:Arial,sans-serif">'
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">'
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">'
            '<tr><td style="padding:0 0 36px"><img src="'+LOGO+'" alt="NovaPharm Healthcare" width="220" style="display:block;width:220px;max-width:100%;height:auto"></td></tr>'
            '<tr><td><h1 style="font-size:32px;line-height:1.2;font-weight:500;margin:0 0 18px">A gift for you.</h1>'
            '<p style="font-size:16px;line-height:1.6">Your NovaPharm digital gift card.</p></td></tr>'
            '<tr><td style="background:#F8F7F3;border:1px solid #DEDCD5;padding:28px">'
            '<p style="margin:0;font-size:14px">Gift card value</p>'
            '<p style="font-size:36px;font-weight:500;margin:12px 0 24px">'+escape(value)+'</p>'
            '<p style="font-size:14px;margin:0 0 8px">Gift card code</p>'
            '<p style="font-size:16px;line-height:1.6;overflow-wrap:anywhere;margin:0"><strong>'+escape(code)+'</strong></p></td></tr>'
            '<tr><td style="padding:24px 0;font-size:15px;line-height:1.6">Keep this code private. Use it only on our official website. '
            '<a href="'+STORE+'" style="color:#0B0B0E">Explore Nutraxin</a>.</td></tr>'
            '<tr><td style="border-top:1px solid #DEDCD5;padding-top:20px;font-size:14px;line-height:1.6">'
            'Need assistance? <a href="mailto:'+SUPPORT+'" style="color:#0B0B0E">'+SUPPORT+'</a><br>NovaPharm Healthcare Ltd</td></tr>'
            '</table></td></tr></table></body></html>')
    return subject,body,html


class GiftEmailSender:
    def __init__(self, ses, sender, *, enabled=False, release_approved=False):
        self.ses=ses
        self.sender=sender
        self.enabled=enabled is True and release_approved is True

    def __call__(self, recipient, code, denomination):
        if not self.enabled:
            raise ValueError("gift email delivery not released")
        if (not isinstance(self.sender,str) or not EMAIL.fullmatch(self.sender)
            or self.sender.rsplit("@",1)[-1].lower()!=DOMAIN):
            raise ValueError("unapproved gift sender")
        if (not isinstance(recipient,str) or len(recipient)>254
            or not EMAIL.fullmatch(recipient) or "." not in recipient.rsplit("@",1)[-1]):
            raise ValueError("invalid verified recipient")
        subject,body,html=content(code,denomination)
        account=self.ses.get_account()
        identity=self.ses.get_email_identity(EmailIdentity=DOMAIN)
        dkim=identity.get("DkimAttributes",{})
        if (account.get("ProductionAccessEnabled") is not True or account.get("SendingEnabled") is not True
            or identity.get("VerifiedForSendingStatus") is not True
            or dkim.get("SigningEnabled") is not True or dkim.get("Status")!="SUCCESS"):
            raise ValueError("gift sender identity or service is unavailable")
        try:
            result=self.ses.send_email(FromEmailAddress="NovaPharm Healthcare <"+self.sender+">",
                ReplyToAddresses=[SUPPORT], Destination={"ToAddresses":[recipient]},
                Content={"Simple":{"Subject":{"Data":subject,"Charset":"UTF-8"},
                    "Body":{"Text":{"Data":body,"Charset":"UTF-8"},"Html":{"Data":html,"Charset":"UTF-8"}}}})
        except Exception:
            # Never expose the message body, recipient, or bearer code in errors.
            raise RuntimeError("gift delivery result requires reconciliation") from None
        message=result.get("MessageId")
        if not isinstance(message,str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,200}",message):
            raise RuntimeError("gift delivery result requires reconciliation")
        return message
