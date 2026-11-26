package com.novapharm.intelligence.research

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Source-level Android guard; a passing JVM test is not a TalkBack device test. */
class NovaResearchAccessibilityContractTest {
    private fun source(path: String): String {
        // Gradle's test working directory may be app/ or the root project.
        val candidates = listOf(File("src/main/$path"), File("app/src/main/$path"))
        val file = candidates.firstOrNull { it.isFile }
        requireNotNull(file) { "Required Android source not found: $path" }
        return file.readText()
    }

    @Test
    fun paneAndHeadingsRemainDiscoverableToAndroidAccessibilityServices() {
        val view = source("java/com/novapharm/intelligence/research/NovaSparseCircuitResearchScreen.kt")
        assertTrue("TalkBack needs a named research pane", view.contains(
            "accessibilityPaneTitle = \"NovaPharm Intelligence research — read only\""
        ))
        assertTrue("Pane title API 28 must be guarded for Android 8 devices", view.contains(
            "if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)"
        ))
        assertTrue("Visible titles must retain native accessibility headings", view.contains(
            "setAccessibilityHeading(true)"
        ))
        assertTrue("Native text sizes must continue to respect font scaling", view.contains(
            "setTextSize(TypedValue.COMPLEX_UNIT_SP, size)"
        ))
        assertTrue("No evidence screen must remain explicit", view.contains(
            "No independently verified circuit experiment is connected."
        ))
    }

    @Test
    fun accessibilityDoesNotRelaxOfflineOrResearchOnlyBoundaries() {
        val manifest = source("AndroidManifest.xml")
        val activity = source("java/com/novapharm/intelligence/research/NovaResearchActivity.kt")
        assertFalse("Private research shell must not gain Android permissions", manifest.contains(
            "<uses-permission"
        ))
        assertTrue(manifest.contains("android:allowBackup=\"false\""))
        assertTrue(manifest.contains("android:usesCleartextTraffic=\"false\""))
        assertTrue("Launch must keep the fail-closed empty research state", activity.contains(
            "summary = null"
        ))
    }
}
