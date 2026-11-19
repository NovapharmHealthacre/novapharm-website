package com.novapharm.intelligence.ml

fun main() {
    val digest = "sha256:" + "a".repeat(64)
    val valid = NovaComputeProposal(
        mode = "experiment", accelerator = "cpu", datasetDigest = digest, modelDigest = digest,
        purpose = "non-clinical-research", dataClass = "public-approved",
        containsPersonalData = false, cpuCores = 2, gpuCount = 0, memoryGiB = 4,
        durationMinutes = 20, retentionDays = 0, region = "eu-west-2", estimatedCostGbp = 0.0
    )
    val candidate = NovaComputePlanner.assess(valid)
    check(candidate.status == "review-only")
    check(candidate.reasons.isEmpty())
    check(!candidate.executionEnabled)
    val denied = NovaComputePlanner.assess(valid.copy(
        accelerator = "gpu", gpuCount = 1, containsPersonalData = true,
        region = "us-east-1", estimatedCostGbp = 12.0
    ))
    check(denied.status == "blocked")
    check(!denied.executionEnabled)
    check("personal-data-not-admitted" in denied.reasons)
    check("region-not-allowed" in denied.reasons)
    check("budget-not-approved" in denied.reasons)
    check("unversioned-model" in NovaComputePlanner.assess(valid.copy(modelDigest = "bad")).reasons)
    println("NovaPharm Android compute planning denial tests passed")
}
