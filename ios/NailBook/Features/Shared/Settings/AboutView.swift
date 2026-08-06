import SwiftUI

// MARK: - About View

struct AboutView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xxl) {
                // App icon
                VStack(spacing: Spacing.lg) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 64))
                        .foregroundColor(.nbPrimary)
                        .frame(width: 100, height: 100)
                        .background(Color.nbPrimarySoft)
                        .cornerRadius(Radius.xl)

                    VStack(spacing: Spacing.xs) {
                        Text("NailBook")
                            .font(NBFont.displaySmall)
                            .foregroundColor(.nbTextPrimary)
                        Text("美甲师预约管理平台")
                            .font(NBFont.bodyMedium)
                            .foregroundColor(.nbTextSecondary)
                    }
                }
                .padding(.top, Spacing.xxxl)

                // Version info
                NBCard {
                    VStack(spacing: Spacing.md) {
                        infoRow("版本", value: "1.0.0")
                        infoRow("开发者", value: "NailBook Team")
                    }
                }

                // Links
                NBCard {
                    VStack(spacing: 0) {
                        linkRow("用户协议") {}
                        Divider().padding(.leading, Spacing.lg)
                        linkRow("隐私政策") {}
                        Divider().padding(.leading, Spacing.lg)
                        linkRow("开源许可") {}
                    }
                }

                Text("© 2026 NailBook. All rights reserved.")
                    .font(NBFont.captionMedium)
                    .foregroundColor(.nbTextTertiary)
                    .padding(.top, Spacing.xxl)
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("关于")
        .background(Color.nbBg)
    }

    private func infoRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextSecondary)
            Spacer()
            Text(value)
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextPrimary)
        }
    }

    private func linkRow(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(NBFont.bodyMedium)
                    .foregroundColor(.nbTextPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.nbTextTertiary)
            }
            .padding(Spacing.lg)
        }
        .buttonStyle(.plain)
    }
}
