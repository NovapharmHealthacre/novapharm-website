import SwiftUI

/// NovaPharm Intelligence Regal Ultramarine; preserve system semantic surfaces.
enum NovaTheme {
    static let accent = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 168.0 / 255, green: 184.0 / 255, blue: 255.0 / 255, alpha: 1)
            : UIColor(red: 37.0 / 255, green: 70.0 / 255, blue: 216.0 / 255, alpha: 1)
    })
    // Sovereign Black on light backgrounds; system-provided readable label in dark.
    static let primaryInk = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor.label
            : UIColor(red: 11.0 / 255, green: 11.0 / 255, blue: 14.0 / 255, alpha: 1)
    })
    // Owner-approved Pure White (#FFFFFF) and Royal Porcelain White
    // (#F8F7F3) for the light appearance. Native dark materials remain dynamic.
    static let surface = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor.secondarySystemGroupedBackground
            : UIColor(red: 248.0 / 255, green: 247.0 / 255, blue: 243.0 / 255, alpha: 1)
    })
    static let background = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor.systemGroupedBackground
            : UIColor(red: 1, green: 1, blue: 1, alpha: 1)
    })
}
