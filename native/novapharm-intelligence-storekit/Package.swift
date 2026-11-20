// swift-tools-version: 6.0
// Read-only StoreKit 2 engineering candidate, not linked into the Expo app.
import PackageDescription

let package = Package(
    name: "NovaStoreKitReadOnly",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "NovaStoreKitReadOnly", targets: ["NovaStoreKitReadOnly"])
    ],
    targets: [
        .target(name: "NovaStoreKitReadOnly", path: "Sources"),
        .testTarget(
            name: "NovaStoreKitReadOnlyTests",
            dependencies: ["NovaStoreKitReadOnly"],
            path: "Tests"
        )
    ]
)
