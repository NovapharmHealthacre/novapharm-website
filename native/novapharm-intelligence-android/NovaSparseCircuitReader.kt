package com.novapharm.intelligence.research

import org.json.JSONObject

/**
 * Android display-only contract for an authorised research service response.
 * Not an inference engine, permissions grant, or independently verified causal explanation.
 * This source candidate has not yet been compiled in a signed Android application.
 */
data class NovaSparseCircuitSummary(
    val modelId: String,
    val taskId: String,
    val nodeCount: Int,
    val edgeCount: Int,
    val sampleCount: Int,
    val lossDeltaCircuitVsBaseline: Double,
    val lossDeltaAblatedVsCircuit: Double,
    val interpretation: String = "Unverified research candidate"
)

object NovaSparseCircuitReader {
    @Throws(IllegalArgumentException::class)
    fun readResearchSummary(json: String): NovaSparseCircuitSummary {
        require(json.length <= 32_768) { "Unsupported summary size" }
        val value = JSONObject(json)
        require(value.optString("schemaVersion") == "npi.sparse-circuit.v1")
        require(value.optBoolean("valid", false))
        require(value.optString("status") == "unverified-research-candidate")
        require(!value.optBoolean("mechanisticExplanationVerified", true))
        require(!value.optBoolean("productionEligible", true))
        require(!value.optBoolean("clinicalUsePermitted", true))
        require(value.optString("ablation") == "mean")
        val nodes = value.getInt("nodeCount")
        val edges = value.getInt("edgeCount")
        val examples = value.getInt("sampleCount")
        require(nodes in 1..2000 && edges in 1..8000 && examples > 0)
        val baseline = value.getDouble("lossDeltaCircuitVsBaseline")
        val ablated = value.getDouble("lossDeltaAblatedVsCircuit")
        require(baseline.isFinite() && ablated.isFinite())
        val modelId = value.getString("modelId")
        val taskId = value.getString("taskId")
        require(modelId.matches(Regex("[A-Za-z0-9][A-Za-z0-9._:-]{0,95}")))
        require(taskId.matches(Regex("[A-Za-z0-9][A-Za-z0-9._:-]{0,95}")))
        return NovaSparseCircuitSummary(
            modelId, taskId, nodes, edges, examples, baseline, ablated
        )
    }
}
