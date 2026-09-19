import SwiftUI

// MARK: - Login View (aligned with wxapp design)

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var phone = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showRegister = false
    @State private var showForgotPassword = false
    @State private var privacyAgreed = false
    @State private var showPassword = false

    // Focus state for input animations
    @FocusState private var phoneFocused: Bool
    @FocusState private var passwordFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                // Background: wxapp uses var(--bg-card) which is white
                Color.white
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer()
                        .frame(minHeight: 40)

                    // Hero section
                    VStack(spacing: Spacing.md) {
                        // Logo: wxapp: 160rpx (80px), border-radius: var(--radius-xl) = 22px
                        ZStack {
                            RoundedRectangle(cornerRadius: 22)
                                .fill(NBColors.action)
                                .frame(width: 80, height: 80)
                            Text("N")
                                .font(.system(size: 44, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .shadow(color: Color.black.opacity(0.28), radius: 24, y: 8)

                        // App name: wxapp: var(--font-xl) = 20px, weight: var(--weight-black) = 700
                        Text("NailBook")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(NBColors.ink)
                            .tracking(2)

                        // Tagline: wxapp: 14px, color: var(--text-muted)
                        Text("让美丽更简单")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                    }

                    Spacer()
                        .frame(minHeight: 40)

                    // Form section: wxapp: padding: 0 8rpx
                    VStack(spacing: Spacing.md) {
                        // Phone input: wxapp style with +86 prefix
                        HStack(spacing: 0) {
                            Text("+86")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(NBColors.ink)

                            Rectangle()
                                .fill(NBColors.line)
                                .frame(width: 0.75, height: 14)
                                .padding(.horizontal, 12)

                            TextField("请输入手机号码", text: $phone)
                                .font(.system(size: 15))
                                .foregroundColor(NBColors.ink)
                                .keyboardType(.numberPad)
                                .focused($phoneFocused)
                        }
                        .frame(height: 56)
                        .padding(.horizontal, 14)
                        .background(NBColors.softSurface)
                        .cornerRadius(Radius.input)

                        // Password input: wxapp style with lock icon
                        HStack(spacing: 12) {
                            Image(systemName: "lock")
                                .font(.system(size: 18))
                                .foregroundColor(NBColors.control.opacity(0.45))

                            if showPassword {
                                TextField("请输入密码", text: $password)
                                    .font(.system(size: 15))
                                    .foregroundColor(NBColors.ink)
                            } else {
                                SecureField("请输入密码", text: $password)
                                    .font(.system(size: 15))
                                    .foregroundColor(NBColors.ink)
                            }

                            Button {
                                showPassword.toggle()
                            } label: {
                                Image(systemName: showPassword ? "eye" : "eye.slash")
                                    .font(.system(size: 20))
                                    .foregroundColor(NBColors.control.opacity(0.35))
                            }
                        }
                        .frame(height: 56)
                        .padding(.horizontal, 14)
                        .background(NBColors.softSurface)
                        .cornerRadius(Radius.input)
                        .focused($passwordFocused)

                        // Privacy agreement: wxapp style
                        HStack(spacing: 4) {
                            Button {
                                withAnimation(.spring(response: 0.2)) {
                                    privacyAgreed.toggle()
                                }
                            } label: {
                                Image(systemName: privacyAgreed ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 16))
                                    .foregroundColor(privacyAgreed ? Color(hex: "287A4B") : NBColors.control)
                            }

                            Text("我已阅读并同意")
                                .font(.system(size: 11))
                                .foregroundColor(NBColors.muted)

                            Button("《用户协议》") {
                                // TODO: Open user agreement
                            }
                            .font(.system(size: 11))
                            .foregroundColor(NBColors.link)

                            Text("和")
                                .font(.system(size: 11))
                                .foregroundColor(NBColors.muted)

                            Button("《隐私政策》") {
                                // TODO: Open privacy policy
                            }
                            .font(.system(size: 11))
                            .foregroundColor(NBColors.link)

                            Spacer()
                        }

                        // Error message
                        if let error = errorMessage {
                            Text(error)
                                .font(NBFont.captionLarge)
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        // Login button: wxapp: 44px, 8px radius
                        Button {
                            login()
                        } label: {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .tint(.white)
                                }
                                Text("登录")
                                    .font(.system(size: 14, weight: .bold))
                                    .tracking(4)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .foregroundColor(canLogin ? .white : NBColors.muted)
                            .background(canLogin ? NBColors.action : NBColors.softSurface)
                            .cornerRadius(Radius.button)
                        }
                        .disabled(!canLogin || isLoading)

                        // Account actions: wxapp style
                        HStack(spacing: Spacing.md) {
                            Button("忘记密码？") {
                                showForgotPassword = true
                            }
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.link)

                            Rectangle()
                                .fill(NBColors.line)
                                .frame(width: 0.75, height: 12)

                            Button("注册账号") {
                                showRegister = true
                            }
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.link)
                        }
                        .frame(minHeight: 44)
                    }
                    .padding(.horizontal, 20)

                    Spacer()
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showRegister) {
                RegisterView()
            }
            .sheet(isPresented: $showForgotPassword) {
                ForgotPasswordView(role: .client)
            }
            .onTapGesture {
                phoneFocused = false
                passwordFocused = false
            }
        }
    }

    // MARK: - Computed Properties

    private var canLogin: Bool {
        !phone.isEmpty && !password.isEmpty && privacyAgreed && !isLoading
    }

    // MARK: - Actions

    private func login() {
        guard canLogin else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                // First check phone to determine role
                let clientCheck: PhoneStatus = try await APIClient.shared.request(.checkPhone(role: .client, phone: phone))
                let techCheck: PhoneStatus = try await APIClient.shared.request(.checkPhone(role: .technician, phone: phone))

                let hasClient = clientCheck.exists
                let hasTechnician = techCheck.exists

                // Determine which role to login as
                if !hasClient && hasTechnician {
                    // Only technician account exists
                    try await appState.loginAsTechnician(phone: phone, password: password)
                } else {
                    // Default to client (also handles dual-role users)
                    try await appState.loginAsClient(phone: phone, password: password)
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// MARK: - Preview

#Preview {
    LoginView()
        .environmentObject(AppState.shared)
}
