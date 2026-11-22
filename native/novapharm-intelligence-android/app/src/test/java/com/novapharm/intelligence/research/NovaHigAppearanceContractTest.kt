package com.novapharm.intelligence.research

import java.io.File
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM-only source/resource checks; no emulator, customer API, Apple font or
 * signed Android distribution is assumed by these tests.
 */
class NovaHigAppearanceContractTest {
    private fun source(path: String) = File("src/main/$path").readText()

    private fun colors(qualifier: String): Map<String, String> {
        val xml = source("res/$qualifier/colors.xml")
        val values = Regex("""<color name="([^"]+)">#([0-9A-Fa-f]{6})</color>""")
            .findAll(xml).associate { it.groupValues[1] to it.groupValues[2] }
        assertEquals("four semantic color roles", 4, values.size)
        return values
    }

    private fun luminance(hex: String): Double {
        val rgb = (0..2).map { index ->
            val channel = hex.substring(index * 2, index * 2 + 2).toInt(16) / 255.0
            if (channel <= 0.04045) channel / 12.92 else ((channel + 0.055) / 1.055).pow(2.4)
        }
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    private fun contrast(a: String, b: String): Double {
        val first = luminance(a)
        val second = luminance(b)
        return (max(first, second) + 0.05) / (min(first, second) + 0.05)
    }

    @Test fun systemThemesUseOriginalNovaPharmLightAndDarkTokens() {
        val light = colors("values")
        val dark = colors("values-night")
        assertEquals(light.keys, dark.keys)
        assertEquals("2546D8", light.getValue("nova_research_accent").uppercase())
        assertEquals("A8B8FF", dark.getValue("nova_research_accent").uppercase())
        for (palette in listOf(light, dark)) {
            val canvas = palette.getValue("nova_research_canvas")
            for (role in listOf("nova_research_primary", "nova_research_secondary", "nova_research_accent")) {
                assertTrue("$role needs >=4.5:1 contrast", contrast(canvas, palette.getValue(role)) >= 4.5)
            }
        }
        val lightTheme = source("res/values/styles.xml")
        val darkTheme = source("res/values-night/styles.xml")
        assertTrue(lightTheme.contains("Theme.Material.Light.NoActionBar"))
        assertTrue(darkTheme.contains("Theme.Material.NoActionBar"))
        assertTrue(lightTheme.contains("windowLightStatusBar\">true"))
        assertTrue(darkTheme.contains("windowLightStatusBar\">false"))
    }

    @Test fun researchShellUsesInsetAwareResourcesAndRemainsOffline() {
        val manifest = source("AndroidManifest.xml")
        val screen = source("java/com/novapharm/intelligence/research/NovaSparseCircuitResearchScreen.kt")
        assertTrue(manifest.contains("android:theme=\"@style/NovaResearchTheme\""))
        assertFalse(manifest.contains("android.permission.INTERNET"))
        assertFalse(manifest.contains("android:configChanges="))
        assertTrue(screen.contains("context.getColor(R.color.nova_research_canvas)"))
        assertTrue(screen.contains("context.getColor(R.color.nova_research_primary)"))
        assertTrue(screen.contains("context.getColor(R.color.nova_research_secondary)"))
        assertTrue(screen.contains("setOnApplyWindowInsetsListener"))
        assertTrue(screen.contains("WindowInsets.Type.systemBars()"))
        assertTrue(screen.contains("insets.systemWindowInsetTop"))
        assertTrue(screen.contains("TypedValue.COMPLEX_UNIT_SP"))
        assertTrue(screen.contains("setAccessibilityHeading(true)"))
        assertFalse(screen.contains("Color.WHITE"))
        assertFalse(screen.contains("Color.rgb"))
    }
}
