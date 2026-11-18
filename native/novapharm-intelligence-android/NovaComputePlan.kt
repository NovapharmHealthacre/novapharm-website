package com.novapharm.intelligence.ml

/**
 * Portable Kotlin policy candidate for a future signed Android app.
 * This never creates a job, grants permissions, calls a server or handles raw datasets.
 */
data class NovaComputeProposal(
    val mode: String,
    val accelerator: String,
    val datasetDigest: String,
    val modelDigest: String,
    val purpose: String,
    val dataClass: String,
    val containsPersonalData: Boolean,
    val cpuCores: Int,
    val gpuCount: Int,
    val memoryGiB: Int,
    val durationMinutes: Int,
    val retentionDays: Int,
    val region: String,
    val estimatedCostGbp: Double
)

data class NovaComputeAssessment(
    val status: String,
    val reasons: List<String>,
    val executionEnabled: Boolean = false
)

object NovaComputePlanner {
    private val digest = Regex("^sha256:[a-f0-9]{64}$")

    @JvmStatic
    fun assess(
        proposal: NovaComputeProposal,
        allowedRegions: Set<String> = setOf("eu-west-2"),
        maximumBudgetGbp: Double = 0.0
    ): NovaComputeAssessment {
        val reasons = mutableListOf<String>()
        if (proposal.mode !in setOf("experiment", "training", "batch-inference")) reasons += "invalid-mode"
        if (proposal.accelerator !in setOf("cpu", "gpu")) reasons += "invalid-accelerator"
        if (!digest.matches(proposal.datasetDigest)) reasons += "unversioned-dataset"
        if (!digest.matches(proposal.modelDigest)) reasons += "unversioned-model"
        if (proposal.purpose != "non-clinical-research") reasons += "unapproved-purpose"
        if (proposal.dataClass !in setOf("public-approved", "internal-nonpersonal-approved")) reasons += "data-class-not-admitted"
        if (proposal.containsPersonalData) reasons += "personal-data-not-admitted"
        for ((name, value, range) in listOf(
            Triple("cpuCores", proposal.cpuCores, 1..32),
            Triple("gpuCount", proposal.gpuCount, 0..4),
            Triple("memoryGiB", proposal.memoryGiB, 1..256),
            Triple("durationMinutes", proposal.durationMinutes, 1..1440),
            Triple("retentionDays", proposal.retentionDays, 0..30)
        )) {
            if (value !in range) reasons += "invalid-$name"
        }
        if (proposal.accelerator == "cpu" && proposal.gpuCount != 0) reasons += "cpu-gpu-mismatch"
        if (proposal.accelerator == "gpu" && proposal.gpuCount < 1) reasons += "gpu-count-required"
        if (proposal.region !in allowedRegions) reasons += "region-not-allowed"
        if (!proposal.estimatedCostGbp.isFinite() || proposal.estimatedCostGbp < 0 ||
            !maximumBudgetGbp.isFinite() || maximumBudgetGbp < 0 ||
            proposal.estimatedCostGbp > maximumBudgetGbp
        ) reasons += "budget-not-approved"
        return NovaComputeAssessment(if (reasons.isEmpty()) "review-only" else "blocked", reasons.toList())
    }
}
