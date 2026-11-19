package com.novapharm.intelligence.research

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.Locale

/**
 * Permission-free external geographic reference for the independent Android research candidate.
 * No Google SDK key, Apple MapKit native framework, live location or pharmacy data is used.
 */
object NovaExternalMapLink {
    fun forReference(latitude: Double, longitude: Double, label: String): String? {
        if (!latitude.isFinite() || !longitude.isFinite() ||
            latitude !in -90.0..90.0 || longitude !in -180.0..180.0) return null
        val safeLabel = label.trim().take(80).ifBlank { "Reference location" }
        val query = URLEncoder.encode(safeLabel, StandardCharsets.UTF_8.toString())
        return String.format(
            Locale.ROOT, "https://maps.apple.com/?ll=%.6f,%.6f&q=%s",
            latitude, longitude, query
        )
    }
}
