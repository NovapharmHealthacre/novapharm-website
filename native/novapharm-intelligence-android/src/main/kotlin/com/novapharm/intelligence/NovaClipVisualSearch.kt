package com.novapharm.intelligence

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import org.json.JSONObject

/** Source-only private research adapter. Not an APK, medical classifier or sign-in service. */
data class VisualCandidate(
    val rank: Int,
    val assetId: String,
    val title: String,
    val rightsReference: String,
    val sourceUrl: String
)

class NovaClipVisualSearch(private val portalOrigin: String) {
    init {
        require(portalOrigin == "https://portal.novapharmhealthcare.com") {
            "The signed app must use the canonical NovaPharm portal only."
        }
    }

    /** Read a bounded HTTP response. Never load arbitrary-sized model responses into memory. */
    private fun readBounded(input: InputStream): String {
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(4096)
        while (true) {
            val length = input.read(buffer)
            if (length < 0) break
            require(output.size() + length <= 32_768) { "Response exceeded approved limit." }
            output.write(buffer, 0, length)
        }
        return output.toString(Charsets.UTF_8.name())
    }

    /** Must be invoked off the Android UI thread by an already authenticated app.
     *  Authentication and refresh belong to the signed app. Never persist or log cookies.
     */
    fun search(query: String, csrfToken: String, cookieHeader: String): List<VisualCandidate> {
        val clean = query.trim()
        require(clean.length in 3..240 && clean.none { it.code < 32 || it.code == 127 })
        require(csrfToken.length in 16..256 && csrfToken.all { it.isLetterOrDigit() || it == '-' || it == '_' })
        // Both cookies are required by the actual API: np_session authenticates,
        // while np_csrf must exactly match the X-CSRF-Token header.
        require(cookieHeader.length in 30..4096 && cookieHeader.all { it.code in 32..126 })
        val pairs = cookieHeader.split(';').map { it.trim() }
        require(pairs.size == 2 && pairs.all { it.contains('=') })
        val cookieValues = pairs.map { it.substringBefore('=') to it.substringAfter('=') }.toMap()
        require(cookieValues.size == 2 &&
                cookieValues["np_session"]?.isNotBlank() == true &&
                cookieValues["np_csrf"] == csrfToken)
        val url = URL("$portalOrigin/gateway/v1/intelligence/visual/search")
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 5000
        connection.readTimeout = 8000
        connection.instanceFollowRedirects = false
        connection.useCaches = false
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("X-CSRF-Token", csrfToken)
        connection.setRequestProperty("Cookie", cookieHeader)
        try {
            val request = JSONObject().put("query", clean).put("limit", 5)
            connection.outputStream.use { it.write(request.toString().toByteArray(Charsets.UTF_8)) }
            if (connection.responseCode != 200 || connection.url.toString() != url.toString()) {
                throw IllegalStateException("Private visual retrieval unavailable.")
            }
            val payload = connection.inputStream.use { readBounded(it) }
            val body = JSONObject(payload)
            require(body.getString("contract") == "novapharm.intelligence.visual-search.v1")
            require(body.getBoolean("humanReviewRequired") && body.getBoolean("similarityIsNotEvidence"))
            require(!body.getBoolean("regulatoryStatusVerified") && !body.getBoolean("productIdentityVerified"))
            val rows = body.getJSONArray("results")
            require(rows.length() <= 5)
            val seen = mutableSetOf<String>()
            return (0 until rows.length()).map { index ->
                val row = rows.getJSONObject(index)
                val source = row.getString("sourceUrl")
                val parsed = URI(source)
                require(parsed.scheme == "https" && parsed.host != null &&
                        parsed.userInfo == null && parsed.fragment == null &&
                        parsed.port in setOf(-1, 443))
                val assetId = row.getString("assetId")
                val title = row.getString("title")
                val rights = row.getString("rightsReference")
                require(assetId.matches(Regex("[A-Za-z0-9._:-]{1,120}")) && seen.add(assetId))
                require(title.isNotBlank() && title.length <= 200 && rights.isNotBlank() && rights.length <= 240)
                require(row.getInt("rank") == index + 1 && row.getString("status") == "unverified_visual_match")
                VisualCandidate(index + 1, assetId, title, rights, source)
            }
        } finally {
            connection.disconnect()
        }
    }
}
