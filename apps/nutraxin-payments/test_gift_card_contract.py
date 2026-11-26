import unittest
from gift_card_contract import (issue, reserve, settle, refund, void_unused,
                                split_tender, generate_code, code_digest)


class GiftCardContractTests(unittest.TestCase):
    def test_code_digest(self):
        code = generate_code()
        self.assertEqual(len(code), 35)
        self.assertNotEqual(code, generate_code())
        self.assertEqual(code_digest(code, b"a"*32), code_digest(code, b"a"*32))
        self.assertNotEqual(code_digest(code, b"a"*32), code_digest(code, b"b"*32))
        with self.assertRaises(ValueError):
            code_digest(code, b"short")

    def test_issue_exact_amount(self):
        self.assertEqual(issue(5000,5000,"payment_123").available,5000)
        for denomination, paid in ((5000,4999),(1200,1200),(2500,False)):
            with self.assertRaises(ValueError):
                issue(denomination,paid,"payment_123")

    def test_split_tender(self):
        self.assertEqual(split_tender(1838,5000),(1838,0))
        self.assertEqual(split_tender(6000,5000),(5000,1000))
        self.assertEqual(split_tender(5010,5000),(4980,30))
        self.assertEqual(split_tender(100,0),(0,100))

    def test_reservation_capture_and_refund(self):
        card=issue(5000,5000,"payment_123")
        reserved=reserve(card,"order_123",1838,0)
        self.assertEqual(reserved.available,3162)
        with self.assertRaises(ValueError):
            reserve(reserved,"order_456",4000,1)
        with self.assertRaises(ValueError):
            reserve(reserved,"order_456",100,0)
        with self.assertRaises(ValueError):
            reserve(reserved,"order_123",100,1)
        captured=settle(reserved,"order_123","captured",1)
        self.assertEqual(captured.available,3162)
        with self.assertRaises(ValueError):
            settle(captured,"order_123","captured",2)
        restored=refund(captured,"order_123",1000,2)
        self.assertEqual(restored.available,4162)
        with self.assertRaises(ValueError):
            refund(restored,"order_123",839,3)
        self.assertEqual(refund(restored,"order_123",838,3).available,5000)

    def test_release_and_void(self):
        card=issue(2500,2500,"payment_123")
        held=reserve(card,"order_123",2500,0)
        with self.assertRaises(ValueError):
            void_unused(held,1)
        released=settle(held,"order_123","released",1)
        self.assertEqual(released.available,2500)
        voided=void_unused(released,2)
        self.assertEqual(voided.available,0)
        with self.assertRaises(ValueError):
            reserve(voided,"order_456",100,3)


if __name__ == "__main__":
    unittest.main()
