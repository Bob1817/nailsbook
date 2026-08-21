import SwiftUI

// MARK: - Login View (synced with wxapp client/login)

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var phone = ""
    @State private var password = ""
    @State private var selectedRole: UserRole = .client
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showRegister = false
    @State private var showForgotPassword = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Gradient background (wxapp: #fff8fb -> #ffffff -> #f8f9fc)
                NBGradient.pageBg
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Spacing.xxl) {
                        // Logo (wxapp: 120rpx, border-radius 36rpx, gradient #FF6B8A -> #A78BFA)
                        VStack(spacing: Spacing.lg) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 18)
                                    .fill(NBGradient.primary)
                                    .frame(width: 60, height: 60)
                                Text("N")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .shadow(color: Color.nbPrimary.opacity(0.3), radius: 12, y: 4)

                            Text("客户登录")
                                .font(NBFont.displaySmall)
                                .foregroundColor(.nbTextPrimary)
                        }
                        .padding(.top, 50)

                        // Role selector tabs (wxapp: bg #eef0f4, border-radius 18rpx)
                        HStack(spacing: 0) {
                            roleTab(.client, title: "我是顾客")
                            roleTab(.technician, title: "我是美甲师")
                        }
                        .background(Color(hex: "EEF0F4"))
                        .cornerRadius(9)
                        .padding(.horizontal, Spacing.xxl)

                        // Form
                        VStack(spacing: Spacing.lg) {
                            // Phone input (wxapp: 96rpx height, border #ddd8dc, border-radius 14rpx)
                            NBTextField(placeholder: "手机号", text: $phone, keyboardType: .phonePad)
                                .frame(height: 48)

                            // Password input
                            NBTextField(placeholder: "密码", text: $password, isSecure: true)
                                .frame(height: 48)

                            if let error = errorMessage {
                                Text(error)
                                    .font(NBFont.captionLarge)
                                    .foregroundColor(.nbError)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            // Login button (wxapp: 96rpx, gradient, border-radius 24rpx)
                            NBButton(title: "登录", style: .primary, isLoading: isLoading) {
                                login()
                            }
                            .frame(height: 48)

                            // Links
                            HStack {
                                Button("忘记密码?") { showForgotPassword = true }
                                    .font(NBFont.bodyMedium)
                                    .foregroundColor(.nbTextSecondary)
                                Spacer()
                                if selectedRole == .client {
                                    Button("注册账号") { showRegister = true }
                                        .font(NBFont.bodyMedium)
                                        .foregroundColor(.nbPrimary)
                                }
                            }
                            .frame(minHeight: 44)
                        }
                        .padding(.horizontal, Spacing.xxl)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showRegister) {
                RegisterView()
            }
            .sheet(isPresented: $showForgotPassword) {
                ForgotPasswordView()
            }
        }
    }

    private func roleTab(_ role: UserRole, title: String) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { selectedRole = role }
        } label: {
            Text(title)
                .font(NBFont.bodyMedium)
                .fontWeight(selectedRole == role ? .semibold : .regular)
                .foregroundColor(selectedRole == role ? .white : .nbTextSecondary)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(
                    Group {
                        if selectedRole == role {
                            RoundedRectangle(cornerRadius: 9)
                                .fill(NBGradient.button)
                        } else {
                            Color.clear
                        }
                    }
                )
                .cornerRadius(9)
                .shadow(color: selectedRole == role ? Color.nbPrimary.opacity(0.2) : .clear, radius: 4, y: 2)
        }
    }

    private func login() {
        guard !phone.isEmpty, !password.isEmpty else {
            errorMessage = "请输入手机号和密码"
            return
        }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                switch selectedRole {
                case .client:
                    try await appState.loginAsClient(phone: phone, password: password)
                case .technician:
                    try await appState.loginAsTechnician(phone: phone, password: password)
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
