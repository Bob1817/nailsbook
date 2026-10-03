import SwiftUI

// MARK: - Reusable UI Components (aligned with wxapp design)

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
                    .font(NBFont.bodyMedium)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 44)  // wxapp: --btn-height: 44px
            .foregroundColor(foregroundColor)
            .background(backgroundView)
            .cornerRadius(Radius.button)  // wxapp: 8px
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.6 : 1)
    }

    @ViewBuilder
    private var backgroundView: some View {
        switch style {
        case .primary:
            // wxapp: background: var(--nb-action) which is #1D1D1F
            NBColors.action
        case .secondary:
            NBColors.softSurface
        case .outline:
            Color.clear
        case .ghost:
            Color.clear
        case .destructive:
            Color.red
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary: return .white
        case .secondary: return NBColors.ink
        case .outline: return NBColors.action
        case .ghost: return NBColors.action
        case .destructive: return .white
        }
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
        .frame(height: 56)  // wxapp: 56px
        .background(NBColors.softSurface)  // wxapp: var(--nb-soft-surface)
        .cornerRadius(Radius.input)  // wxapp: 14px
    }
}

struct NBChip: View {
    let title: String
    var isSelected = false
    var color: Color = NBColors.action

    var body: some View {
        Text(title)
            .font(NBFont.captionLarge)
            .fontWeight(.medium)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.xs)
            .foregroundColor(isSelected ? .white : color)
            .background(
                Group {
                    if isSelected { color } else { color.opacity(0.1) }
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
            .background(NBColors.surface)
            .cornerRadius(Radius.card)
            .shadow(color: Color.black.opacity(0.05), radius: 10, y: 2)
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
                    .fill(NBColors.softSurface)
                    .frame(width: 80, height: 80)
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundColor(NBColors.muted)
            }
            Text(title)
                .font(NBFont.titleMedium)
                .foregroundColor(NBColors.ink)
            if !message.isEmpty {
                Text(message)
                    .font(NBFont.bodyMedium)
                    .foregroundColor(NBColors.secondary)
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

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, origin) in result.origins.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var origins: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            origins.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (CGSize(width: maxX - spacing, height: y + rowHeight), origins)
    }
}

// MARK: - Client Page Header

struct NBClientPageHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(NBColors.ink)
                .accessibilityAddTraits(.isHeader)
            Text(subtitle)
                .font(.system(size: 14))
                .foregroundColor(NBColors.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }
}
