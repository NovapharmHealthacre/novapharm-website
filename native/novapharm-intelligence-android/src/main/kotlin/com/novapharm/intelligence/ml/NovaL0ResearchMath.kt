package com.novapharm.intelligence.ml

import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.ln1p
import kotlin.math.max
import kotlin.math.min

/**
 * Numerically stable reference math for the hard-concrete L0 gate.
 *
 * Research-only candidate. No Android Activity, LiteRT model, permissions,
 * network service, patient inputs or customer predictions are registered.
 * Source: Louizos, Welling & Kingma, ICLR 2018 (arXiv:1712.01312).
 */
object NovaL0ResearchMath {
    private fun sigmoid(value: Double): Double {
        if (value >= 0.0) return 1.0 / (1.0 + exp(-value))
        val scaled = exp(value)
        return scaled / (1.0 + scaled)
    }

    private fun checkParameters(temperature: Double, gamma: Double, zeta: Double) {
        require(temperature.isFinite() && gamma.isFinite() && zeta.isFinite() &&
            temperature > 0 && gamma < 0 && zeta > 1) {
            "Invalid hard-concrete parameters."
        }
    }

    fun activationProbability(
        logAlpha: Double, temperature: Double = 2.0 / 3.0,
        gamma: Double = -0.1, zeta: Double = 1.1
    ): Double {
        checkParameters(temperature, gamma, zeta)
        require(logAlpha.isFinite()) { "Gate log-alpha must be finite." }
        return sigmoid(logAlpha - temperature * ln(-gamma / zeta))
    }

    fun deterministicGate(
        logAlpha: Double, temperature: Double = 2.0 / 3.0,
        gamma: Double = -0.1, zeta: Double = 1.1
    ): Double {
        checkParameters(temperature, gamma, zeta)
        require(logAlpha.isFinite()) { "Gate log-alpha must be finite." }
        return min(1.0, max(0.0, sigmoid(logAlpha) * (zeta - gamma) + gamma))
    }

    fun sampleGate(
        logAlpha: Double, uniform: Double, temperature: Double = 2.0 / 3.0,
        gamma: Double = -0.1, zeta: Double = 1.1
    ): Double {
        checkParameters(temperature, gamma, zeta)
        require(logAlpha.isFinite() && uniform.isFinite() && uniform > 0 && uniform < 1) {
            "Gate sample must be finite, with uniform in (0, 1)."
        }
        val noise = ln(uniform) - ln1p(-uniform)
        return min(1.0, max(0.0, sigmoid((noise + logAlpha) / temperature) * (zeta - gamma) + gamma))
    }
}
