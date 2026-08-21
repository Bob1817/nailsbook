import SwiftUI

// MARK: - Help & Feedback

struct HelpFeedbackView: View {
    let role: UserRole
    @State private var feedbackType = "suggestion"
    @State private var content = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false

    private let types = [
        ("suggestion", "功能建议"),
        ("bug", "问题反馈"),
        ("other", "其他")
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Quick help
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("常见问题")
                            .font(NBFont.titleSmall)
                        helpRow("如何修改密码？", answer: "在设置 > 修改密码中操作")
                        helpRow("如何绑定美甲师？", answer: "通过美甲师分享的邀请链接注册即可自动绑定")
                        helpRow("如何取消预约？", answer: "在预约详情页点击取消按钮")
                    }
                }

                // Feedback form
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("意见反馈")
                            .font(NBFont.titleSmall)

                        HStack(spacing: Spacing.sm) {
                            ForEach(types, id: \.0) { type in
                                NBChip(title: type.1, isSelected: feedbackType == type.0)
                                    .onTapGesture { feedbackType = type.0 }
                            }
                        }

                        TextEditor(text: $content)
                            .font(NBFont.bodyMedium)
                            .frame(height: 120)
                            .padding(Spacing.sm)
                            .background(Color.nbSurfaceAlt)
                            .cornerRadius(Radius.sm)
                    }
                }

                NBButton(title: "提交反馈", style: .primary, isLoading: isSubmitting) {
                    submitFeedback()
                }
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("帮助与反馈")
        .background(Color.nbBg)
        .alert("感谢您的反馈！", isPresented: $showSuccess) {
            Button("确定") {}
        }
    }

    private func helpRow(_ question: String, answer: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(question)
                .font(NBFont.bodyMedium)
                .foregroundColor(.nbTextPrimary)
            Text(answer)
                .font(NBFont.captionLarge)
                .foregroundColor(.nbTextSecondary)
        }
        .padding(.vertical, Spacing.xs)
    }

    private func submitFeedback() {
        guard !content.isEmpty else { return }
        isSubmitting = true
        Task {
            // The endpoint is POST /{role}/feedback
            // For now, we'll use a generic approach
            isSubmitting = false
            showSuccess = true
            content = ""
        }
    }
}
