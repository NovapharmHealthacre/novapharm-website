"""Offline benchmark regression tests — no weights, images or network required."""
import unittest
from evaluate import evaluate

CONTRACT = "novapharm.intelligence.visual-search.v1"


class EvalTests(unittest.TestCase):
    def cases(self):
        return {"contract": CONTRACT, "cases": [
            {
                "caseId": "general-1", "query": "approved public blue carton",
                "riskTag": "general", "expectedAssetIds": ["packA"],
                "returnedAssetIds": ["packA", "packB"]
            },
            {
                "caseId": "lookalike-1", "query": "approved public lower strength carton",
                "riskTag": "lookalike_strength", "expectedAssetIds": ["low-strength"],
                "returnedAssetIds": ["high-strength", "low-strength"]
            },
            {
                "caseId": "ood-1", "query": "non-catalogue subject",
                "riskTag": "out_of_domain", "expectedAssetIds": [],
                "returnedAssetIds": ["packA"]
            }
        ]}

    def test_computes_risky_retrieval_without_fabricating_acceptance(self):
        report = evaluate(self.cases())
        self.assertEqual(report["caseCount"], 3)
        self.assertEqual(report["positiveCases"], 2)
        self.assertEqual(report["negativeCases"], 1)
        self.assertEqual(report["precisionAt1"], 0.5)
        self.assertEqual(report["recallAt5"], 1.0)
        self.assertEqual(report["negativeReturnRate"], 1.0)
        self.assertEqual(report["lookalikeStrengthErrorRate"], 1.0)
        self.assertEqual(report["flaggedCases"], 2)
        self.assertFalse(report["releaseApprovalGranted"])

    def test_rejects_bogus_metrics_and_unreviewed_case_schemas(self):
        cases = self.cases()
        for broken in (
            {"contract": "wrong", "cases": cases["cases"]},
            {"contract": CONTRACT, "cases": []},
            {"contract": CONTRACT, "cases": [cases["cases"][0], cases["cases"][0]]},
            {"contract": CONTRACT, "cases": [{**cases["cases"][2], "expectedAssetIds": ["impossible"]}]},
            {"contract": CONTRACT, "cases": [{**cases["cases"][0], "riskTag": "clinical"}]},
            {"contract": CONTRACT, "cases": [{**cases["cases"][0], "returnedAssetIds": ["packA"] * 2}]}
        ):
            with self.subTest(broken=broken):
                with self.assertRaises(ValueError):
                    evaluate(broken)


if __name__ == "__main__":
    unittest.main()
