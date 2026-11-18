package com.novapharm.intelligence

import kotlin.test.Test
import kotlin.test.assertFailsWith

/** No network calls or production sessions: test only fail-closed client input. */
class NovaClipVisualSearchTest {
    @Test
    fun rejectsUntrustedOrigin() {
        for (origin in listOf(
            "http://portal.novapharmhealthcare.com",
            "https://evil.example",
            "https://portal.novapharmhealthcare.com:8443",
            "https://portal.novapharmhealthcare.com/evil"
        )) {
            assertFailsWith<IllegalArgumentException> { NovaClipVisualSearch(origin) }
        }
    }

    @Test
    fun rejectsMalformedQueriesWithoutNetwork() {
        val client = NovaClipVisualSearch("https://portal.novapharmhealthcare.com")
        for (query in listOf("", "x", "bad\u0000query", "a".repeat(241))) {
            assertFailsWith<IllegalArgumentException> {
                client.search(query, "abcd".repeat(12), "np_session=fixture")
            }
        }
    }

    @Test
    fun deniesMissingOrMalformedSessionMaterialBeforeNetwork() {
        val client = NovaClipVisualSearch("https://portal.novapharmhealthcare.com")
        assertFailsWith<IllegalArgumentException> {
            client.search("public carton", "", "np_session=fixture")
        }
        assertFailsWith<IllegalArgumentException> {
            client.search("public carton", "abcd".repeat(12), "token=unknown")
        }
        assertFailsWith<IllegalArgumentException> {
            client.search("public carton", "abcd".repeat(12), "np_session=abc\r\nInjected: yes")
        }
    }
}
