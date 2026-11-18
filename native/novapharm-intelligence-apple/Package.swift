// swift-tools-version: 6.0
// NovaPharm Apple SDK candidate package. Requires Xcode and Apple platform SDKs.
// Package compilation is NOT an app signature, entitlement, deployment or permission grant.
import PackageDescription

let package = Package(
    name: "NovaMLApple",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(name: "NovaMLApple", targets: ["NovaMLApple"])
    ],
    targets: [
        .target(
            name: "NovaMLApple",
            path: ".",
            exclude: ["README.md", "APP_PRIVACY_CHECKLIST.md", "Tests"],
            sources: [
                "NovaCreateMLTrainer.swift",
                "NovaCoreMLRuntime.swift",
                "NovaL0ResearchMath.swift",
                "NovaAlignmentResearchReceipt.swift",
                "NovaFoundationModelsAssist.swift",
                "NovaDocumentIntelligence.swift",
                "NovaLanguageIntelligence.swift",
                "NovaSpeechIntelligence.swift",
                "NovaResearchAppIntent.swift",
                "NovaComputePlan.swift"
            ]
        ),
        .testTarget(
            name: "NovaMLAppleTests",
            dependencies: ["NovaMLApple"],
            path: "Tests"
        )
    ]
)
