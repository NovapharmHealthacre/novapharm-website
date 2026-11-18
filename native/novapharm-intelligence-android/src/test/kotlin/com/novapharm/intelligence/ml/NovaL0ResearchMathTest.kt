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
    println("NovaL0ResearchMath: 10 synthetic checks passed (no model validation).")
}
