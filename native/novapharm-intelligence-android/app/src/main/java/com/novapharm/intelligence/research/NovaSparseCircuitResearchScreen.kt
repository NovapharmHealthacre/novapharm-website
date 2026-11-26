package com.novapharm.intelligence.research

import android.content.Context
import android.os.Build
import android.view.WindowInsets
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
        val canvas = context.getColor(R.color.nova_research_canvas)
        val primaryInk = context.getColor(R.color.nova_research_primary)
        val secondaryInk = context.getColor(R.color.nova_research_secondary)
        val scroll = ScrollView(context).apply {
            setBackgroundColor(canvas)
            isFillViewport = true
            clipToPadding = false
            // A single named TalkBack pane gives this offline research view
            // explicit context without hiding its individual text descendants.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                accessibilityPaneTitle = "NovaPharm Intelligence research — read only"
            }
            // Android 15 edge-to-edge: respect status bars and gesture navigation.
            // Older supported APIs retain their legacy system window insets.
            setOnApplyWindowInsetsListener { view, insets ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val bars = insets.getInsets(WindowInsets.Type.systemBars())
                    view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                } else {
                    @Suppress("DEPRECATION")
                    view.setPadding(
                        insets.systemWindowInsetLeft,
                        insets.systemWindowInsetTop,
                        insets.systemWindowInsetRight,
                        insets.systemWindowInsetBottom
                    )
                }
                insets
            }
        }
        val column = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val pad = (20 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad, pad, pad)
            setBackgroundColor(canvas)
        }
        fun line(value: String, size: Float, heading: Boolean = false, secondary: Boolean = false) {
            val text = TextView(context).apply {
                this.text = value
                setTextColor(if (secondary) secondaryInk else primaryInk)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
                setPadding(0, 0, 0, (12 * resources.displayMetrics.density).toInt())
                if (heading) {
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        setAccessibilityHeading(true)
                    }
                }
            }
            column.addView(text)
        }
        line("NovaPharm Intelligence", 14f, secondary = true)
        line("Sparse-circuit research", 27f, true)
        line("Research only · Not a clinical or production AI feature", 16f, true)
        line("Internal neural circuits are not medicine source evidence or regulatory authorisations.", 15f, secondary = true)
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
        line("A trained synthetic attention experiment exists offline, but no model is downloaded, run or connected to this Android research view.", 14f, secondary = true)
        line("A qualified reviewer must confirm licences, held-out evaluation, ablations and provenance before release.", 14f)
        line("Quantum and computational science", 24f, true)
        line("Offline source-only research • no hardware or clinical activation", 15f, true)
        line("Quantum Experiment Workspace: optional two-qubit Cirq research script; no experiment is connected.", 15f)
        line("Molecular Simulation Lab: OpenFermion and independent chemistry benchmarks are planned, not validated.", 15f)
        line("Resource Estimator: Qualtran assumptions require independent review. qsim is a future local benchmark.", 15f)
        line("Verification DNA: separate scientific input, algorithm, simulator, measurement, calibration, classical baseline, source rights and human review.", 14f, secondary = true)
        line("No quantum processor, cloud job, drug prediction, customer dataset or paid computing is enabled.", 14f, secondary = true)
        scroll.addView(column)
        return scroll
    }
}
