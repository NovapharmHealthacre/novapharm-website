package com.novapharm.intelligence.ml

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.ln

/** Offline contract test with no Android SDK, network, model or test dependencies. */
fun main() {
    val expected = 1.0 / (1.0 + exp(-(2.0 / 3.0) * ln(11.0)))
    check(abs(NovaL0ResearchMath.activationProbability(0.0) - expected) < 1e-12)
    check(abs(NovaL0ResearchMath.deterministicGate(0.0) - 0.5) < 1e-12)
    check(abs(NovaL0ResearchMath.sampleGate(0.0, 0.5) - 0.5) < 1e-12)
    check(NovaL0ResearchMath.deterministicGate(-1000.0) == 0.0)
    check(NovaL0ResearchMath.deterministicGate(1000.0) == 1.0)
    check(NovaL0ResearchMath.activationProbability(-1000.0) == 0.0)
    check(NovaL0ResearchMath.activationProbability(1000.0) == 1.0)
    check(runCatching { NovaL0ResearchMath.sampleGate(0.0, 0.0) }.isFailure)
    check(runCatching { NovaL0ResearchMath.activationProbability(Double.NaN) }.isFailure)
    check(runCatching { NovaL0ResearchMath.deterministicGate(0.0, gamma = 0.0) }.isFailure)
    val candidate = NovaL0ResearchCandidate(
        format = "nova-l0-sparse-linear-candidate-v1",
        releaseStatus = "research-only", productionApproved = false,
        customerVisible = false,
        featureNames = listOf("demand", "stock", "lead_time"),
        coefficients = listOf(2.0, 0.0, 2.0), bias = 3.0, nonZeroCount = 2
    )
    check(candidate.score(mapOf("lead_time" to 4.0, "stock" to 99.0, "demand" to 5.0)) == 21.0)
    check(runCatching { candidate.score(mapOf("demand" to 5.0)) }.isFailure)
    check(runCatching { candidate.copy(productionApproved = true).score(mapOf("demand" to 5.0, "stock" to 99.0, "lead_time" to 4.0)) }.isFailure)
    check(runCatching { candidate.score(mapOf("demand" to Double.NaN, "stock" to 99.0, "lead_time" to 4.0)) }.isFailure)
    println("NovaL0ResearchMath: 14 synthetic checks passed (no model validation).")
}
