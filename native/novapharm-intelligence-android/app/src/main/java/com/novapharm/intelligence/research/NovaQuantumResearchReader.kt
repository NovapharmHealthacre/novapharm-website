package com.novapharm.intelligence.research

import org.json.JSONObject

/** Bounded offline receipt parser only; not authentication or a scientific certificate. */
data class NovaQuantumResearchReceipt(
    val experimentId: String,
    val shots: Int,
    val count00: Int,
    val count11: Int
)
object NovaQuantumResearchReader {
    fun decodeForResearchDisplay(json: String): NovaQuantumResearchReceipt {
        require(json.isNotEmpty() && json.length <= 16384)
        val obj = try { JSONObject(json) } catch (error: Exception) {
            throw IllegalArgumentException("Malformed quantum research receipt", error)
        }
        val exact = setOf("schemaVersion","experimentId","method","engine","qubits","shots","seed",
            "noiseModel","counts","inputSha256","codeSha256","calibrationId","simulatedOnly",
            "hardwareMeasured","independentlyVerified","dataRightsApproved","productionApproved",
            "customerVisible","clinicalUsePermitted")
        val provided = mutableSetOf<String>()
        val iter = obj.keys()
        while (iter.hasNext()) provided.add(iter.next())
        require(provided == exact)
        require(obj.getString("schemaVersion") == "npi.quantum-research.v1")
        require(obj.getString("method") == "bell-sampling")
        require(obj.getString("engine") == "cirq-local-simulator")
        require(obj.get("qubits") is Int && obj.getInt("qubits") == 2)
        require(obj.get("shots") is Int && obj.getInt("shots") in 1..10000)
        require(obj.get("seed") is Int && obj.getInt("seed") in 0..2147483647)
        require(obj.getString("noiseModel") == "ideal")
        require(obj.isNull("calibrationId"))
        require(obj.get("simulatedOnly") == true)
        for (field in listOf("hardwareMeasured", "independentlyVerified", "dataRightsApproved",
            "productionApproved", "customerVisible", "clinicalUsePermitted")) {
            require(obj.get(field) == false) { "Unsupported release claim" }
        }
        val id = obj.getString("experimentId")
        require(id.matches(Regex("bell-[a-f0-9]{16}")))
        for (field in listOf("inputSha256", "codeSha256")) {
            require(obj.getString(field).matches(Regex("[a-f0-9]{64}")))
        }
        val counts = obj.getJSONObject("counts")
        val keys = mutableSetOf<String>()
        val names = counts.keys()
        while (names.hasNext()) keys.add(names.next())
        require(keys == setOf("00","01","10","11"))
        val shots = obj.getInt("shots")
        for (key in keys) require(counts.get(key) is Int && counts.getInt(key) in 0..shots)
        require(keys.sumOf { counts.getInt(it) } == shots)
        require(counts.getInt("01") == 0 && counts.getInt("10") == 0)
        return NovaQuantumResearchReceipt(id, shots, counts.getInt("00"), counts.getInt("11"))
    }
}
