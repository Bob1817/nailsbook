import SwiftUI

// MARK: - Typography (mapped from Flutter DT text styles)

enum NBFont {
    // Display
    static let displayLarge = Font.system(size: 34, weight: .bold, design: .default)
    static let displayMedium = Font.system(size: 28, weight: .bold, design: .default)
    static let displaySmall = Font.system(size: 24, weight: .semibold, design: .default)

    // Title
    static let titleLarge = Font.system(size: 20, weight: .semibold, design: .default)
    static let titleMedium = Font.system(size: 17, weight: .semibold, design: .default)
    static let titleSmall = Font.system(size: 15, weight: .semibold, design: .default)

    // Body
    static let bodyLarge = Font.system(size: 16, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 14, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 13, weight: .regular, design: .default)

    // Caption
    static let captionLarge = Font.system(size: 12, weight: .regular, design: .default)
    static let captionMedium = Font.system(size: 11, weight: .regular, design: .default)
    static let captionSmall = Font.system(size: 10, weight: .regular, design: .default)
}
