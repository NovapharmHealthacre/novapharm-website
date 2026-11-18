package com.novapharm.intelligence.research

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class NovaSparseCircuitReaderTest {
    private fun candidate() = JSONObject().apply {
        put("schemaVersion", "npi.sparse-circuit.v1")
        put("valid", true)
        put("status", "unverified-research-candidate")
        put("modelId", "model-1")
        put("taskId", "test-1")
        put("nodeCount", 2)
        put("edgeCount", 1)
        put("sampleCount", 128)
        put("lossDeltaCircuitVsBaseline", 0.01)
        put("lossDeltaAblatedVsCircuit", 0.12)
        put("ablation", "mean")
        put("mechanisticExplanationVerified", false)
        put("productionEligible", false)
        put("clinicalUsePermitted", false)
    }

    @Test fun validSummaryRemainsUnverified() {
        val result = NovaSparseCircuitReader.readResearchSummary(candidate().toString())
        assertEquals("Unverified research candidate", result.interpretation)
        assertEquals(2, result.nodeCount)
        assertEquals(128, result.sampleCount)
    }

    @Test fun forgedPermissionAlwaysRejected() {
        for (field in listOf(
            "mechanisticExplanationVerified",
            "productionEligible",
            "clinicalUsePermitted"
        )) {
            val item = candidate().put(field, true)
            assertThrows(IllegalArgumentException::class.java) {
                NovaSparseCircuitReader.readResearchSummary(item.toString())
            }
        }
    }

    @Test fun hiddenPrivateFieldsRejected() {
        val item = candidate().put("patientName", "SECRET")
        assertThrows(IllegalArgumentException::class.java) {
            NovaSparseCircuitReader.readResearchSummary(item.toString())
        }
    }

    @Test fun numericStringAndMalformedObjectRejected() {
        for (field in listOf("nodeCount", "edgeCount", "sampleCount")) {
            val item = candidate().put(field, "12")
            assertThrows(IllegalArgumentException::class.java) {
                NovaSparseCircuitReader.readResearchSummary(item.toString())
            }
        }
        for (payload in listOf("", "{invalid-json", "[]")) {
            assertThrows(IllegalArgumentException::class.java) {
                NovaSparseCircuitReader.readResearchSummary(payload)
            }
        }
    }

    @Test fun invalidIdsCountsOrMetricsRejected() {
        val bads = listOf(
            candidate().put("modelId", "path/to/private"),
            candidate().put("nodeCount", -5),
            candidate().put("edgeCount", 999999),
            candidate().put("sampleCount", 0),
            candidate().put("sampleCount", 1_000_001),
            candidate().put("ablation", "uncontrolled")
        )
        for (item in bads) {
            assertThrows(IllegalArgumentException::class.java) {
                NovaSparseCircuitReader.readResearchSummary(item.toString())
            }
        }
    }
}
