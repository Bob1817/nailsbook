import SwiftUI

// MARK: - Typography (mapped from Flutter DT text styles with Dynamic Type support)

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

// MARK: - Dynamic Type Support

struct DynamicFont: ViewModifier {
    let style: Font.TextStyle
    let design: Font.Design
    let weight: Font.Weight

    func body(content: Content) -> some View {
        content
            .font(.system(size: scaledSize, weight: weight, design: design))
    }

    private var baseSize: CGFloat {
        switch style {
        case .largeTitle: return 34
        case .title: return 28
        case .title2: return 22
        case .title3: return 20
        case .headline: return 17
        case .body: return 17
        case .callout: return 16
        case .subheadline: return 15
        case .footnote: return 13
        case .caption: return 12
        case .caption2: return 11
        @unknown default: return 17
        }
    }

    private var scaledSize: CGFloat {
        // Use UIFont for Dynamic Type scaling
        let uiFont: UIFont
        switch style {
        case .largeTitle: uiFont = UIFont.preferredFont(forTextStyle: .largeTitle)
        case .title: uiFont = UIFont.preferredFont(forTextStyle: .title1)
        case .title2: uiFont = UIFont.preferredFont(forTextStyle: .title2)
        case .title3: uiFont = UIFont.preferredFont(forTextStyle: .title3)
        case .headline: uiFont = UIFont.preferredFont(forTextStyle: .headline)
        case .body: uiFont = UIFont.preferredFont(forTextStyle: .body)
        case .callout: uiFont = UIFont.preferredFont(forTextStyle: .callout)
        case .subheadline: uiFont = UIFont.preferredFont(forTextStyle: .subheadline)
        case .footnote: uiFont = UIFont.preferredFont(forTextStyle: .footnote)
        case .caption: uiFont = UIFont.preferredFont(forTextStyle: .caption1)
        case .caption2: uiFont = UIFont.preferredFont(forTextStyle: .caption2)
        @unknown default: uiFont = UIFont.preferredFont(forTextStyle: .body)
        }
        let scaleFactor = uiFont.pointSize / baseSize
        return baseSize * min(scaleFactor, 1.5) // Cap at 1.5x to prevent excessive scaling
    }
}

extension View {
    func dynamicFont(_ style: Font.TextStyle, design: Font.Design = .default, weight: Font.Weight = .regular) -> some View {
        modifier(DynamicFont(style: style, design: design, weight: weight))
    }
}

// MARK: - Accessibility Extensions

extension View {
    func accessibleButton(label: String, hint: String? = nil) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(.isButton)
    }

    func accessibleHeader() -> some View {
        self
            .accessibilityAddTraits(.isHeader)
    }

    func accessibleImage(label: String) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityAddTraits(.isImage)
    }

    func accessibleLink(label: String) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityAddTraits(.isLink)
    }
}
