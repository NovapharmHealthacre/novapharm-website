package com.novapharm.intelligence.research

import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.util.TypedValue

/**
 * Gated research presentation candidate, not a launchable Android app.
 * Receives only a server-authorised, display-only summary from host app code.
 * Never retrieves a model, submits records, or authorises access.
 */
object NovaSparseCircuitResearchScreen {
    fun create(context: Context, summary: NovaSparseCircuitSummary? = null): View {
        val scroll = ScrollView(context)
        val column = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val pad = (20 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad, pad, pad)
            setBackgroundColor(Color.WHITE)
        }
        fun line(value: String, size: Float, heading: Boolean = false) {
            val text = TextView(context).apply {
                this.text = value
                setTextColor(Color.rgb(29, 29, 31))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
                setPadding(0, 0, 0, (12 * resources.displayMetrics.density).toInt())
                if (heading) {
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                    accessibilityHeading = true
                }
            }
            column.addView(text)
        }
        line("NovaPharm Intelligence", 14f)
        line("Sparse-circuit research", 27f, true)
        line("Research only · Not a clinical or production AI feature", 16f, true)
        line("Internal neural circuits are not medicine source evidence or regulatory authorisations.", 15f)
        if (summary == null) {
            line("No independently verified circuit experiment is connected.", 15f)
        } else {
            line("Unverified research candidate", 20f, true)
            line("Model: ${summary.modelId}", 15f)
            line("Task: ${summary.taskId}", 15f)
            line("Circuit nodes: ${summary.nodeCount}", 15f)
            line("Circuit edges: ${summary.edgeCount}", 15f)
            line("Evaluation samples: ${summary.sampleCount}", 15f)
            line("Evaluation deltas are descriptive and do not prove a causal explanation.", 15f)
        }
        line("A qualified reviewer must confirm licences, held-out evaluation, ablations and provenance before release.", 14f)
        scroll.addView(column)
        return scroll
    }
}
