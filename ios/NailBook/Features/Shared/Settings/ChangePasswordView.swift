import SwiftUI

// MARK: - Change Password

struct ChangePasswordView: View {
    let role: UserRole
    @State private var oldPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("当前密码")
                            .font(NBFont.titleSmall)
                        NBTextField(placeholder: "输入当前密码", text: $oldPassword, isSecure: true)
                    }
                }

                NBCard {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("新密码")
                            .font(NBFont.titleSmall)
                        NBTextField(placeholder: "输入新密码（至少6位）", text: $newPassword, isSecure: true)
                        NBTextField(placeholder: "确认新密码", text: $confirmPassword, isSecure: true)
                    }
                }

                if let error = errorMessage {
                    Text(error)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbError)
                }

                if let success = successMessage {
                    Text(success)
                        .font(NBFont.captionLarge)
                        .foregroundColor(.nbSuccess)
                }

                NBButton(title: "修改密码", style: .primary, isLoading: isLoading) {
                    changePassword()
                }
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("修改密码")
        .background(Color.nbBg)
    }

    private func changePassword() {
        guard !oldPassword.isEmpty, !newPassword.isEmpty else {
            errorMessage = "请填写所有字段"
            return
        }
        guard newPassword == confirmPassword else {
            errorMessage = "两次输入的密码不一致"
            return
        }
        guard newPassword.count >= 6 else {
            errorMessage = "新密码至少6位"
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                _ = try await APIClient.shared.requestVoid(
                    .changePassword(role: role, oldPassword: oldPassword, newPassword: newPassword)
                )
                successMessage = "密码修改成功"
                try? await Task.sleep(nanoseconds: 1_500_000_000)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}
