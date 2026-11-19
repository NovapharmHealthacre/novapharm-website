"""Nonclinical, rights-cleared CLIP benchmark diagnostics; never confers release approval.

Input JSON is a human-reviewed evaluation fixture, not a production model call.
Each case: caseId, query, riskTag (general|lookalike_strength|out_of_domain),
expectedAssetIds (ground truth), returnedAssetIds (ordered model candidates).
Negative/OOD cases must have zero expected IDs. Results are never medical claims.
"""
import argparse
import json
from pathlib import Path

CONTRACT = "novapharm.intelligence.visual-search.v1"
RISKS = {"general", "lookalike_strength", "out_of_domain"}


def evaluate(payload):
    if not isinstance(payload, dict) or payload.get("contract") != CONTRACT:
        raise ValueError("Missing governed CLIP evaluation contract.")
    cases = payload.get("cases")
    if not isinstance(cases, list) or not cases or len(cases) > 10000:
        raise ValueError("Evaluation needs 1–10,000 independently reviewed cases.")
    seen = set()
    positives = correct_at_1 = recall_at_5_sum = unsafe_near_miss = 0
    negative_cases = negative_returns = strength_cases = strength_near_miss = 0
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("Malformed evaluation case.")
        identifier = case.get("caseId")
        if not isinstance(identifier, str) or not (1 <= len(identifier) <= 120) or identifier in seen:
            raise ValueError("Invalid or duplicate evaluation case identifier.")
        seen.add(identifier)
        query = case.get("query")
        if not isinstance(query, str) or not (3 <= len(query.strip()) <= 240):
            raise ValueError("Missing or invalid human-reviewed query.")
        risk = case.get("riskTag")
        if risk not in RISKS:
            raise ValueError("Unknown risk group.")
        ground_truth, returned = case.get("expectedAssetIds"), case.get("returnedAssetIds")
        if not isinstance(ground_truth, list) or not isinstance(returned, list) or len(returned) > 5:
            raise ValueError("Invalid labelled candidates.")
        if any(not isinstance(value, str) or not value for value in ground_truth + returned):
            raise ValueError("Asset IDs must be nonempty strings.")
        if len(set(ground_truth)) != len(ground_truth) or len(set(returned)) != len(returned):
            raise ValueError("Duplicate expected or ranked candidate.")
        expected = set(ground_truth)
        if risk == "out_of_domain" and expected:
            raise ValueError("Out-of-domain cases must not have any ground-truth matches.")
        if not expected:
            negative_cases += 1
            if returned:
                negative_returns += 1
                unsafe_near_miss += 1
        else:
            positives += 1
            if returned and returned[0] in expected:
                correct_at_1 += 1
            recall_at_5_sum += len(set(returned) & expected) / len(expected)
            if risk == "lookalike_strength":
                strength_cases += 1
                if returned and returned[0] not in expected:
                    strength_near_miss += 1
                    unsafe_near_miss += 1
    return {
        "contract": CONTRACT,
        "evaluationOnly": True,
        "releaseApprovalGranted": False,
        "caseCount": len(cases),
        "positiveCases": positives,
        "negativeCases": negative_cases,
        "precisionAt1": correct_at_1 / positives if positives else None,
        "recallAt5": recall_at_5_sum / positives if positives else None,
        "negativeReturnRate": negative_returns / negative_cases if negative_cases else None,
        "lookalikeStrengthErrorRate": strength_near_miss / strength_cases if strength_cases else None,
        "riskCaseCount": strength_cases,
        "flaggedCases": unsafe_near_miss,
        "requiresIndependentRightsClinicalQualitySecurityApproval": True
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", required=True, help="Offline, independently labelled non-patient evaluation JSON.")
    parser.add_argument("--output", help="Optional private JSON diagnostics destination.")
    args = parser.parse_args()
    payload = json.loads(Path(args.cases).read_text(encoding="utf-8"))
    result = evaluate(payload)
    if args.output:
        destination = Path(args.output)
        destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        destination.chmod(0o600)
    else:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
