package com.novapharm.intelligence.ml

/**
 * Pure Kotlin governance contract for a future signed Android application.
 * No audio capture, patient records, AI invocation, API calls or training.
 */
data class NovaSignalsResearchRequest(
    val sourceId: String,
    val purpose: String,
    val containsPersonalData: Boolean,
    val requestsExternalTransfer: Boolean,
    val automatedDecision: Boolean,
    val estimatedIncrementalCostGbp: Double
)

data class NovaSignalsResearchAssessment(
    val status: String,
    val reasons: List<String>,
    val executionEnabled: Boolean = false
)

object NovaSignalsResearchPolicy {
    private val sources = setOf(
        "science-frontier", "freelance-frontier", "workers-frontier", "novices-rct",
        "enterprise-usage", "task-crossover", "eu-jobs", "adoption-global",
        "codex-agentic", "adoption-q1", "signals-v3", "enterprise-signals",
        "whisper-2022", "large-network-training-2022", "triton-2021"
    )

    fun assess(request: NovaSignalsResearchRequest): NovaSignalsResearchAssessment {
        val reasons = mutableListOf<String>()
        if (request.sourceId !in sources) reasons += "unregistered-source"
        if (request.purpose != "non-clinical-evidence-research") reasons += "unapproved-purpose"
        if (request.containsPersonalData) reasons += "personal-data-not-admitted"
        if (request.requestsExternalTransfer) reasons += "external-transfer-not-approved"
        if (request.automatedDecision) reasons += "autonomous-decision-prohibited"
        if (!request.estimatedIncrementalCostGbp.isFinite() || request.estimatedIncrementalCostGbp != 0.0) reasons += "zero-budget-only"
        return NovaSignalsResearchAssessment(if (reasons.isEmpty()) "review-only" else "blocked", reasons.toList())
    }
}
