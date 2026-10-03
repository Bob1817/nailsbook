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
    @State private var showAgreement = false
    @State private var showPrivacy = false

    // Focus state for input animations
    @FocusState private var phoneFocused: Bool
    @FocusState private var passwordFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                Color.white.ignoresSafeArea()

                // Centered content group: logo + form as one unit
                VStack(spacing: 24) {
                    Spacer()

                    // Logo
                    VStack(spacing: 10) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 22)
                                .fill(NBColors.action)
                                .frame(width: 72, height: 72)
                            Text("N")
                                .font(.system(size: 40, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .shadow(color: Color.black.opacity(0.2), radius: 16, y: 6)

                        Text("OnlyNail")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(NBColors.ink)
                            .tracking(2)

                        Text("让美丽更简单")
                            .font(.system(size: 13))
                            .foregroundColor(NBColors.muted)
                    }

                    // Form
                    VStack(spacing: 14) {
                        // Phone input
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
                        .frame(height: 50)
                        .padding(.horizontal, 18)
                        .background(NBColors.softSurface)
                        .cornerRadius(Radius.input)

                        // Password input
                        HStack(spacing: 12) {
                            Image(systemName: "lock")
                                .font(.system(size: 17))
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
                                    .font(.system(size: 18))
                                    .foregroundColor(NBColors.control.opacity(0.35))
                            }
                        }
                        .frame(height: 50)
                        .padding(.horizontal, 18)
                        .background(NBColors.softSurface)
                        .cornerRadius(Radius.input)
                        .focused($passwordFocused)

                        // Privacy agreement
                        HStack(spacing: 6) {
                            Button {
                                withAnimation(.spring(response: 0.2)) {
                                    privacyAgreed.toggle()
                                }
                                if privacyAgreed { errorMessage = nil }
                            } label: {
                                Image(systemName: privacyAgreed ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 20))
                                    .foregroundColor(privacyAgreed ? Color(hex: "287A4B") : NBColors.control)
                            }

                            Text("我已阅读并同意")
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.muted)

                            Button("《用户协议》") { showAgreement = true }
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.link)

                            Text("和")
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.muted)

                            Button("《隐私政策》") { showPrivacy = true }
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.link)

                            Spacer()
                        }

                        // Error message
                        if let error = errorMessage {
                            HStack(spacing: 6) {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .font(.system(size: 14))
                                Text(error)
                                    .font(.system(size: 13))
                            }
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(Color.red.opacity(0.08))
                            .cornerRadius(8)
                        }

                        // Login button - always tappable, shows hint when incomplete
                        Button {
                            if canLogin {
                                login()
                            } else {
                                errorMessage = loginHint
                            }
                        } label: {
                            HStack {
                                if isLoading { ProgressView().tint(.white) }
                                Text(isLoading ? "登录中..." : "登录")
                                    .font(.system(size: 15, weight: .bold))
                                    .tracking(4)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .foregroundColor(canLogin ? .white : NBColors.muted)
                            .background(canLogin ? NBColors.action : NBColors.softSurface)
                            .cornerRadius(Radius.button)
                        }
                        .disabled(isLoading)

                        // Forgot / Register
                        HStack(spacing: 16) {
                            Button("忘记密码？") { showForgotPassword = true }
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.link)

                            Rectangle().fill(NBColors.line).frame(width: 0.75, height: 12)

                            Button("注册账号") { showRegister = true }
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.link)
                        }
                        .frame(minHeight: 40)
                    }
                    .padding(.horizontal, 32)

                    Spacer()
                }
                .frame(maxWidth: .infinity)
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showRegister) { RegisterView() }
            .sheet(isPresented: $showForgotPassword) { ForgotPasswordView(role: .client) }
            .sheet(isPresented: $showAgreement) { AgreementSheet(title: "用户协议") }
            .sheet(isPresented: $showPrivacy) { AgreementSheet(title: "隐私政策") }
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

    private var loginHint: String {
        if phone.isEmpty { return "请输入手机号码" }
        if password.isEmpty { return "请输入密码" }
        if !privacyAgreed { return "请先阅读并同意用户协议和隐私政策" }
        return ""
    }

    // MARK: - Actions

    private func login() {
        guard !phone.isEmpty else { errorMessage = "请输入手机号码"; return }
        guard !password.isEmpty else { errorMessage = "请输入密码"; return }
        guard privacyAgreed else { errorMessage = "请先阅读并同意用户协议和隐私政策"; return }
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                // Check phone role
                let clientCheck: PhoneStatus = try await APIClient.shared.request(.checkPhone(role: .client, phone: phone))
                let techCheck: PhoneStatus = try await APIClient.shared.request(.checkPhone(role: .technician, phone: phone))

                let hasClient = clientCheck.exists
                let hasTechnician = techCheck.exists

                if !hasClient && !hasTechnician {
                    await MainActor.run { errorMessage = "该手机号尚未注册，请先注册账号" }
                    await MainActor.run { isLoading = false }
                    return
                }

                // Login based on role
                if !hasClient && hasTechnician {
                    try await appState.loginAsTechnician(phone: phone, password: password)
                } else {
                    try await appState.loginAsClient(phone: phone, password: password)
                }

                // Verify login succeeded
                if case .unauthenticated = appState.authStatus {
                    await MainActor.run { errorMessage = "登录失败，账号信息验证未通过" }
                }

            } catch {
                await MainActor.run { errorMessage = friendlyLoginError(error) }
            }
            await MainActor.run { isLoading = false }
        }
    }

    private func friendlyLoginError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            switch apiError {
            case .httpError(let code, let msg):
                if code == 401 { return "手机号或密码错误，请重试" }
                if code == 429 { return "操作过于频繁，请稍后再试" }
                return msg ?? "登录失败（\(code)），请稍后再试"
            case .credentialStorageFailed:
                return apiError.localizedDescription
            case .networkError:
                return "网络连接失败，请检查网络后重试"
            case .tokenRefreshFailed, .unauthorized:
                return "登录已过期，请重新登录"
            case .decodingError:
                return "服务器响应异常，请稍后再试"
            case .invalidResponse:
                return "服务器响应异常，请稍后再试"
            case .invalidURL:
                return "配置错误，请联系管理员"
            }
        }
        let desc = error.localizedDescription
        if desc.isEmpty || desc.contains("couldn't be completed") {
            return "登录失败，请检查网络后重试"
        }
        return "登录失败：\(desc)"
    }
}

// MARK: - Agreement Sheet (shared)

struct AgreementSheet: View {
    let title: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(title == "用户协议" ? userAgreementContent : privacyPolicyContent)
                        .font(.system(size: 14))
                        .foregroundColor(NBColors.ink)
                        .lineSpacing(1.6)
                }
                .padding(20)
            }
            .background(NBColors.page)
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("关闭") { dismiss() }
                }
            }
        }
    }

    private var userAgreementContent: String {
        "OnlyNail 用户协议\n\n本协议是您与 OnlyNail 平台之间关于使用平台服务所订立的契约。\n\n1. 服务内容\nOnlyNail 为美甲师和客户提供预约管理、作品展示、客户管理等服务。\n\n2. 用户注册\n用户需提供真实、准确的注册信息，并妥善保管账号密码。\n\n3. 用户行为规范\n用户不得利用平台从事违法违规活动，不得发布虚假信息。\n\n4. 预约与服务\n客户通过平台预约美甲服务，美甲师应按约定提供服务。\n\n5. 免责声明\n平台仅提供信息撮合服务，不对服务质量承担担保责任。\n\n如需查看完整协议内容，请联系客服。"
    }

    private var privacyPolicyContent: String {
        "OnlyNail 隐私政策\n\n我们重视您的隐私保护。本政策说明我们如何收集、使用和保护您的个人信息。\n\n1. 信息收集\n我们收集您注册时提供的姓名、手机号等基本信息，以及使用服务时产生的预约、消费记录。\n\n2. 信息使用\n您的信息仅用于提供和改进服务，不会向第三方出售。\n\n3. 信息保护\n我们采用加密存储和传输技术保护您的个人信息安全。\n\n4. 信息共享\n未经您同意，我们不会向第三方共享您的个人信息，法律法规要求除外。\n\n5. 您的权利\n您可以随时查看、修改或删除您的个人信息。\n\n如需了解完整隐私政策，请联系客服。"
    }
}

// MARK: - Preview

#Preview {
    LoginView()
        .environmentObject(AppState.shared)
}
