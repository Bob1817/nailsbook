import SwiftUI

// MARK: - Reusable UI Components (synced with wxapp design)

struct NBButton: View {
    enum Style {
        case primary, secondary, outline, ghost, destructive
    }

    let title: String
    let style: Style
    var isLoading = false
    var isDisabled = false
    var icon: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(foregroundColor)
                }
                if let icon {
                    Image(systemName: icon)
                }
                Text(title)
                    .font(NBFont.bodyLarge)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .foregroundColor(foregroundColor)
            .background(backgroundView)
            .cornerRadius(Radius.lg)
            .overlay(
                RoundedRectangle(cornerRadius: Radius.lg)
                    .stroke(borderColor, lineWidth: style == .outline ? 1.5 : 0)
            )
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.6 : 1)
    }

    @ViewBuilder
    private var backgroundView: some View {
        switch style {
        case .primary:
            NBGradient.button
        case .secondary:
            Color.nbSecondarySoft
        case .outline:
            Color.clear
        case .ghost:
            Color.clear
        case .destructive:
            Color.nbError
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary: return .white
        case .secondary: return .nbTextPrimary
        case .outline: return .nbPrimary
        case .ghost: return .nbPrimary
        case .destructive: return .white
        }
    }

    private var borderColor: Color {
        style == .outline ? .nbPrimary : .clear
    }
}

struct NBTextField: View {
    let placeholder: String
    @Binding var text: String
    var isSecure = false
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
            }
        }
        .font(NBFont.bodyLarge)
        .padding(.horizontal, Spacing.lg)
        .frame(height: 48)
        .background(Color.nbSurfaceAlt)
        .cornerRadius(Radius.sm)
        .overlay(
            RoundedRectangle(cornerRadius: Radius.sm)
                .stroke(Color.nbBorderInput, lineWidth: 1)
        )
    }
}

struct NBChip: View {
    let title: String
    var isSelected = false
    var color: Color = .nbPrimary

    var body: some View {
        Text(title)
            .font(NBFont.captionLarge)
            .fontWeight(.medium)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.xs)
            .foregroundColor(isSelected ? .white : color)
            .background(
                Group {
                    if isSelected { NBGradient.button } else { color.opacity(0.1) }
                }
            )
            .cornerRadius(Radius.pill)
    }
}

struct NBCard<Content: View>: View {
    let content: Content
    var padding: CGFloat = Spacing.cardPadding

    init(padding: CGFloat = Spacing.cardPadding, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(Color.nbSurfaceGlass)
            .cornerRadius(Radius.card)
            .shadow(color: NBColors.ink.opacity(0.06), radius: 12, y: 2)
            .shadow(color: NBColors.ink.opacity(0.03), radius: 2, y: 1)
    }
}

struct NBEmptyState: View {
    let icon: String
    let title: String
    var message: String = ""

    var body: some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .fill(NBGradient.emptyIcon)
                    .frame(width: 80, height: 80)
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(.nbPrimary)
            }
            Text(title)
                .font(NBFont.titleMedium)
                .foregroundColor(.nbTextPrimary)
            if !message.isEmpty {
                Text(message)
                    .font(NBFont.bodyMedium)
                    .foregroundColor(.nbTextSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(Spacing.xxxl)
    }
}

struct NBLoadingView: View {
    var body: some View {
        ProgressView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Status Badge

struct NBStatusBadge: View {
    let text: String
    let bgColor: Color
    let textColor: Color

    var body: some View {
        Text(text)
            .font(NBFont.captionSmall)
            .fontWeight(.semibold)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 2)
            .background(bgColor)
            .foregroundColor(textColor)
            .cornerRadius(Radius.xs)
    }
}

// MARK: - View Extensions

extension View {
    func nbCard() -> some View {
        NBCard { self }
    }

    func nbPagePadding() -> some View {
        padding(.horizontal, Spacing.page)
    }
}
