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
    fun enforcesPublicAttributionSourceLinks() {
        for (source in listOf(
            "http://novapharmhealthcare.com/public",
            "https://127.0.0.1/private",
            "https://[::1]/private",
            "https://gateway.internal/private",
            "https://docs.local/private",
            "https://user@novapharmhealthcare.com/public",
            "https://novapharmhealthcare.com:8443/public",
            "https://novapharmhealthcare.com/public#fragment"
        )) {
            kotlin.test.assertFalse(NovaClipVisualSearch.sourceAllowed(source), source)
        }
        kotlin.test.assertTrue(NovaClipVisualSearch.sourceAllowed("https://novapharmhealthcare.com/products/"))
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
        assertFailsWith<IllegalArgumentException> {
            client.search("public carton", "abcd".repeat(12), "np_session=fixture")
        }
        assertFailsWith<IllegalArgumentException> {
            client.search("public carton", "abcd".repeat(12), "np_session=fixture; np_csrf=wrong")
        }
        assertFailsWith<IllegalArgumentException> {
            client.search("public carton", "abcd".repeat(12), "np_session=fixture; np_session=duplicate")
        }
    }
}
