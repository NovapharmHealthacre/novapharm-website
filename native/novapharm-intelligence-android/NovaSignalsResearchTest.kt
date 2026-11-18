package com.novapharm.intelligence.ml

fun main() {
    val approved = NovaSignalsResearchRequest(
        sourceId = "signals-v3", purpose = "non-clinical-evidence-research",
        containsPersonalData = false, requestsExternalTransfer = false,
        automatedDecision = false, estimatedIncrementalCostGbp = 0.0
    )
    val review = NovaSignalsResearchPolicy.assess(approved)
    check(review.status == "review-only")
    check(!review.executionEnabled)
    check(review.reasons.isEmpty())
    val blocked = NovaSignalsResearchPolicy.assess(
        approved.copy(sourceId = "unknown", containsPersonalData = true,
            requestsExternalTransfer = true, automatedDecision = true,
            estimatedIncrementalCostGbp = 1.0)
    )
    check(blocked.status == "blocked")
    check(!blocked.executionEnabled)
    check(setOf("unregistered-source", "personal-data-not-admitted",
        "external-transfer-not-approved", "autonomous-decision-prohibited",
        "zero-budget-only").all { it in blocked.reasons })
    println("NovaPharm Signals Kotlin research admission checks passed")
}
