package com.novapharm.intelligence.research

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NovaExternalMapLinkTest {
    @Test fun onlyValidCoordinatesCanOpen() {
        assertNull(NovaExternalMapLink.forReference(Double.NaN, 0.0, "Unknown"))
        assertNull(NovaExternalMapLink.forReference(91.0, 0.0, "Out of bounds"))
        assertNull(NovaExternalMapLink.forReference(51.0, -181.0, "Out of bounds"))
    }

    @Test fun externalLinkEscapesReferenceText() {
        val uri = NovaExternalMapLink.forReference(51.501, -0.123, "Test site & pharmacy")
        assertTrue(uri!!.startsWith("https://maps.apple.com/?ll=51.501000,-0.123000&q="))
        assertTrue(uri.contains("Test+site+%26+pharmacy"))
    }

    @Test fun emptyLabelDoesNotBecomeAnEmptyQuery() {
        val uri = NovaExternalMapLink.forReference(0.0, 0.0, "")
        assertTrue(uri!!.endsWith("Reference+location"))
    }
}
