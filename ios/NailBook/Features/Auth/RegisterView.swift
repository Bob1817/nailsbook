import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    @State private var phone = ""
    @State private var password = ""
    @State private var inviteCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.xxl) {
                    VStack(spacing: Spacing.md) {
                        Text("注册账号")
                            .font(NBFont.displaySmall)
                            .foregroundColor(.nbTextPrimary)
                        Text("请使用美甲师邀请码注册")
                            .font(NBFont.bodyMedium)
                            .foregroundColor(.nbTextSecondary)
                    }
                    .padding(.top, 40)

                    VStack(spacing: Spacing.lg) {
                        NBTextField(placeholder: "美甲师邀请码", text: $inviteCode)
                        NBTextField(placeholder: "手机号", text: $phone, keyboardType: .phonePad)
                        NBTextField(placeholder: "密码（至少6位）", text: $password, isSecure: true)

                        if let error = errorMessage {
                            Text(error)
                                .font(NBFont.captionLarge)
                                .foregroundColor(.nbError)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        NBButton(title: "注册", style: .primary, isLoading: isLoading) {
                            register()
                        }
                    }
                    .padding(.horizontal, Spacing.xxl)
                }
            }
            .background(Color.nbBg)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                }
            }
        }
    }

    private func register() {
        guard !phone.isEmpty, !password.isEmpty, !inviteCode.isEmpty else {
            errorMessage = "请填写所有字段"
            return
        }
        guard password.count >= 6 else {
            errorMessage = "密码至少6位"
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.registerClient(phone: phone, password: password, inviteCode: inviteCode)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
