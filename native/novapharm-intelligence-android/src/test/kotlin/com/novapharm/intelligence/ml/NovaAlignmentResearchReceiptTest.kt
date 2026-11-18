package com.novapharm.intelligence.ml

/** Standalone Kotlin smoke check. Not an Android test runner or signed APK. */
fun main() {
    val sample = NovaAlignmentResearchReceipt(
        contract = "novapharm.intelligence.nova-alignment-research.v1",
        kind = "instruction_conformance",
        researchOnly = true,
        productionApproved = false,
        customerVisible = false,
        independentGroundTruthVerified = false,
        dataRightsVerified = false,
        humanAdjudicationRequired = true
    )
    check(sample.validateForResearchDisplay().contains("Unverified"))
    check(runCatching { sample.copy(productionApproved = true).validateForResearchDisplay() }.isFailure)
    check(runCatching { sample.copy(customerVisible = true).validateForResearchDisplay() }.isFailure)
    check(runCatching { sample.copy(independentGroundTruthVerified = true).validateForResearchDisplay() }.isFailure)
    check(runCatching { sample.copy(dataRightsVerified = true).validateForResearchDisplay() }.isFailure)
    check(runCatching { sample.copy(kind = "live_ml").validateForResearchDisplay() }.isFailure)
    println("NovaAlignmentResearchReceipt: 6 source-only checks passed.")
}
