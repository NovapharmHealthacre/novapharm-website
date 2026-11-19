package com.novapharm.intelligence.ml

/**
 * Research-only offline receipt. No Android application, runtime permission,
 * trained model, patient data, server endpoint or Play Store build is included.
 */
data class NovaAlignmentResearchReceipt(
    val contract: String,
    val kind: String,
    val researchOnly: Boolean,
    val productionApproved: Boolean,
    val customerVisible: Boolean,
    val independentGroundTruthVerified: Boolean,
    val dataRightsVerified: Boolean,
    val humanAdjudicationRequired: Boolean
) {
    fun validateForResearchDisplay(): String {
        val studies = setOf(
            "reward_proxy_sweep",
            "critique_assistance",
            "instruction_conformance",
            "offline_multiagent_scenario_scoreboard"
        )
        require(
            contract == "novapharm.intelligence.nova-alignment-research.v1" &&
            kind in studies && researchOnly && !productionApproved &&
            !customerVisible && !independentGroundTruthVerified &&
            !dataRightsVerified && humanAdjudicationRequired
        ) { "Only nonproduction, unverified research receipt is displayable." }
        return "Unverified offline Nova ML research; human review required."
    }
}
