package com.novapharm.intelligence.research

import android.app.Activity
import android.os.Bundle

/**
 * Offline, read-only Android demonstration shell.
 * Not a signed production NovaPharm Intelligence application or a model service.
 * No network permission, medicine evidence, customer data or local persistent storage.
 */
class NovaResearchActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(NovaSparseCircuitResearchScreen.create(this, summary = null))
    }
}
