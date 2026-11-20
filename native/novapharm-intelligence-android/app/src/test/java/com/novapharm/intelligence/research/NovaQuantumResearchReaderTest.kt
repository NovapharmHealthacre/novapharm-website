package com.novapharm.intelligence.research

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class NovaQuantumResearchReaderTest {
    private fun receipt(): JSONObject = JSONObject().apply {
        put("schemaVersion", "npi.quantum-research.v1")
        put("experimentId", "bell-1234567890abcdef")
        put("method", "bell-sampling")
        put("engine", "cirq-local-simulator")
        put("qubits", 2); put("shots", 64); put("seed", 42)
        put("noiseModel", "ideal")
        put("counts", JSONObject().put("00", 31).put("01", 0).put("10", 0).put("11", 33))
        put("inputSha256", "a".repeat(64))
        put("codeSha256", "b".repeat(64))
        put("calibrationId", JSONObject.NULL)
        put("simulatedOnly", true)
        put("hardwareMeasured", false)
        put("independentlyVerified", false)
        put("dataRightsApproved", false)
        put("productionApproved", false)
        put("customerVisible", false)
        put("clinicalUsePermitted", false)
    }
    @Test fun boundedSampleStaysResearchOnly() {
        val r = NovaQuantumResearchReader.decodeForResearchDisplay(receipt().toString())
        assertEquals(64, r.shots)
        assertEquals(31, r.count00)
    }
    @Test fun claimedReleaseHardwareOrPatientFieldsFailClosed() {
        for (field in listOf("productionApproved","customerVisible","clinicalUsePermitted","hardwareMeasured","independentlyVerified")) {
            assertThrows(IllegalArgumentException::class.java) {
                NovaQuantumResearchReader.decodeForResearchDisplay(receipt().put(field, true).toString())
            }
        }
        assertThrows(IllegalArgumentException::class.java) {
            NovaQuantumResearchReader.decodeForResearchDisplay(receipt().put("patientName", "secret").toString())
        }
        assertThrows(IllegalArgumentException::class.java) {
            NovaQuantumResearchReader.decodeForResearchDisplay(receipt().put("shots", 10001).toString())
        }
    }
}
