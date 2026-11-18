package com.novapharm.intelligence

import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/** SDK candidate only. No APK, Android Studio project or production sign-in is included. */
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
            "Only the signed-app NovaPharm portal origin is allowed"
        }
    }

    /** Run on an IO dispatcher; never on the Android main thread.
     *  The caller provides its pre-existing authenticated, CSRF-bound cookie session.
     *  Do not persist raw queries or copy cookies into logs, analytics or URLs.
     */
    fun search(query: String, csrfToken: String, sessionCookie: String): List<VisualCandidate> {
        val clean = query.trim()
        require(clean.length in 3..240 && clean.none { it.code < 32 || it.code == 127 })
        require(csrfToken.isNotBlank() && sessionCookie.isNotBlank())
        val url = URL("$portalOrigin/gateway/v1/intelligence/visual/search")
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 5000
        connection.readTimeout = 8000
        connection.instanceFollowRedirects = false
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("X-CSRF-Token", csrfToken)
        connection.setRequestProperty("Cookie", sessionCookie)
        try {
            val request = JSONObject().put("query", clean).put("limit", 5)
            connection.outputStream.use { it.write(request.toString().toByteArray(Charsets.UTF_8)) }
            if (connection.responseCode != 200) throw IllegalStateException("Visual retrieval is unavailable")
            val payload = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            require(payload.length <= 32768)
            val body = JSONObject(payload)
            require(body.getString("contract") == "novapharm.intelligence.visual-search.v1")
            require(body.getBoolean("humanReviewRequired") && body.getBoolean("similarityIsNotEvidence"))
            require(!body.getBoolean("regulatoryStatusVerified") && !body.getBoolean("productIdentityVerified"))
            val results = body.getJSONArray("results")
            require(results.length() <= 5)
            return (0 until results.length()).map { i ->
                val row = results.getJSONObject(i)
                val source = row.getString("sourceUrl")
                require(URL(source).protocol == "https" && row.getString("status") == "unverified_visual_match")
                VisualCandidate(row.getInt("rank"), row.getString("assetId"), row.getString("title"),
                    row.getString("rightsReference"), source)
            }
        } finally {
            connection.disconnect()
        }
    }
}
