import SwiftUI

// MARK: - Register View (aligned with wxapp design)

struct RegisterView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss

    @State private var phone = ""
    @State private var credential = ""
    @State private var name = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var privacyAgreed = false
    @State private var showPassword = false

    // Credential validation
    @State private var credentialType: CredentialType = .none
    @State private var credentialChecking = false
    @State private var credentialValid = false
    @State private var credentialError = ""
    @State private var techName = ""

    // Focus states
    @FocusState private var credentialFocused: Bool
    @FocusState private var phoneFocused: Bool
    @FocusState private var nameFocused: Bool
    @FocusState private var passwordFocused: Bool
    @FocusState private var confirmPasswordFocused: Bool

    enum CredentialType {
        case none
        case activationKey
        case inviteCode
        case unknown
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.white
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    VStack(spacing: Spacing.sm) {
                        Text("注册账号")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(NBColors.ink)
                        Text("请使用邀请码/激活密钥进行注册")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                    }
                    .padding(.top, 40)
                    .padding(.bottom, 32)

                    ScrollView {
                        VStack(spacing: Spacing.md) {
                            // Credential input
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                inputField(
                                    placeholder: "激活密钥/邀请码",
                                    text: $credential,
                                    isFocused: credentialFocused
                                )
                                .focused($credentialFocused)
                                .onChange(of: credential) { newValue in
                                    analyzeCredential(newValue)
                                }

                                // Credential status
                                if credentialChecking {
                                    HStack(spacing: 4) {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                        Text("正在验证...")
                                            .font(.system(size: 12))
                                            .foregroundColor(NBColors.muted)
                                    }
                                } else if credentialType == .activationKey {
                                    HStack(spacing: 4) {
                                        Image(systemName: "key.fill")
                                            .font(.system(size: 12))
                                        Text("将创建美甲师账号，激活密钥会在注册时核验")
                                            .font(.system(size: 12))
                                    }
                                    .foregroundColor(NBColors.link)
                                } else if credentialType == .inviteCode && credentialValid {
                                    HStack(spacing: 4) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .font(.system(size: 12))
                                            .foregroundColor(NBColors.success)
                                        Text("注册后将自动绑定 \(techName)")
                                            .font(.system(size: 12))
                                            .foregroundColor(NBColors.success)
                                    }
                                } else if !credentialError.isEmpty {
                                    Text(credentialError)
                                        .font(.system(size: 12))
                                        .foregroundColor(.red)
                                }
                            }

                            // Name input (only for technician)
                            if credentialType == .activationKey {
                                inputField(
                                    placeholder: "姓名（至少2字）",
                                    text: $name,
                                    isFocused: nameFocused
                                )
                                .focused($nameFocused)
                            }

                            // Phone input
                            inputField(
                                placeholder: "手机号",
                                text: $phone,
                                keyboardType: .numberPad,
                                isFocused: phoneFocused
                            )
                            .focused($phoneFocused)

                            // Password input
                            passwordField(
                                placeholder: "密码（至少8位，包含字母和数字）",
                                text: $password,
                                isFocused: passwordFocused
                            )
                            .focused($passwordFocused)

                            // Confirm password input
                            passwordField(
                                placeholder: "确认密码",
                                text: $confirmPassword,
                                isFocused: confirmPasswordFocused
                            )
                            .focused($confirmPasswordFocused)

                            if !password.isEmpty && !confirmPassword.isEmpty && password != confirmPassword {
                                Text("两次密码不一致")
                                    .font(.system(size: 12))
                                    .foregroundColor(.red)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            // Privacy agreement
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
                                    // TODO
                                }
                                .font(.system(size: 11))
                                .foregroundColor(NBColors.link)

                                Text("和")
                                    .font(.system(size: 11))
                                    .foregroundColor(NBColors.muted)

                                Button("《隐私政策》") {
                                    // TODO
                                }
                                .font(.system(size: 11))
                                .foregroundColor(NBColors.link)

                                Spacer()
                            }

                            // Error message
                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 14))
                                    .foregroundColor(.red)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            // Register button
                            Button {
                                register()
                            } label: {
                                HStack {
                                    if isLoading {
                                        ProgressView()
                                            .tint(.white)
                                    }
                                    Text("注册")
                                        .font(.system(size: 14, weight: .bold))
                                        .tracking(4)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .foregroundColor(canSubmit ? .white : NBColors.muted)
                                .background(canSubmit ? NBColors.action : NBColors.softSurface)
                                .cornerRadius(Radius.button)
                            }
                            .disabled(!canSubmit || isLoading)
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") { dismiss() }
                        .foregroundColor(NBColors.ink)
                }
            }
            .onTapGesture {
                credentialFocused = false
                phoneFocused = false
                nameFocused = false
                passwordFocused = false
                confirmPasswordFocused = false
            }
        }
    }

    // MARK: - Input Components

    private func inputField(placeholder: String, text: Binding<String>, keyboardType: UIKeyboardType = .default, isFocused: Bool) -> some View {
        TextField(placeholder, text: text)
            .font(.system(size: 15))
            .foregroundColor(NBColors.ink)
            .keyboardType(keyboardType)
            .frame(height: 56)
            .padding(.horizontal, 14)
            .background(NBColors.softSurface)
            .cornerRadius(Radius.input)
    }

    private func passwordField(placeholder: String, text: Binding<String>, isFocused: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "lock")
                .font(.system(size: 18))
                .foregroundColor(NBColors.control.opacity(0.45))

            if showPassword {
                TextField(placeholder, text: text)
                    .font(.system(size: 15))
                    .foregroundColor(NBColors.ink)
            } else {
                SecureField(placeholder, text: text)
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
    }

    // MARK: - Computed Properties

    private var canSubmit: Bool {
        let credentialOk = credentialType == .activationKey || (credentialType == .inviteCode && credentialValid)
        let nameOk = credentialType != .activationKey || name.count >= 2
        let passwordOk = password.count >= 8 && password == confirmPassword && isValidPassword(password)
        let phoneOk = isValidPhone(phone)

        return credentialOk && nameOk && passwordOk && phoneOk && privacyAgreed && !isLoading
    }

    private func isValidPhone(_ phone: String) -> Bool {
        guard phone.count == 11 else { return false }
        return phone.hasPrefix("1") && phone.allSatisfy(\.isNumber)
    }

    // MARK: - Credential Analysis

    private func analyzeCredential(_ input: String) {
        let raw = input.trimmingCharacters(in: .whitespaces).uppercased()
        credential = raw

        if raw.isEmpty {
            credentialType = .none
            credentialValid = false
            credentialError = ""
            return
        }

        // 16 chars alphanumeric = activation key
        if raw.count == 16 && isAlphanumeric(raw) {
            credentialType = .activationKey
            credentialValid = true
            credentialError = ""
            return
        }

        // 4-12 chars alphanumeric = invite code
        if raw.count >= 4 && raw.count <= 12 && isAlphanumericOrDash(raw) {
            credentialType = .inviteCode
            credentialError = ""
            checkInviteCode(raw)
            return
        }

        credentialType = .unknown
        credentialValid = false
        credentialError = "无法识别，请检查邀请码或激活密钥"
    }

    private func isAlphanumeric(_ string: String) -> Bool {
        string.allSatisfy { $0.isLetter || $0.isNumber }
    }

    private func isAlphanumericOrDash(_ string: String) -> Bool {
        string.allSatisfy { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" }
    }

    private func checkInviteCode(_ code: String) {
        credentialChecking = true
        credentialValid = false
        techName = ""

        Task {
            do {
                let tech: TechnicianProfile? = try await APIClient.shared.request(.findTechnicianByInviteCode(code: code))
                await MainActor.run {
                    if let tech = tech, !tech.name.isEmpty {
                        credentialValid = true
                        techName = tech.name
                        credentialError = ""
                    } else {
                        credentialValid = false
                        credentialError = "邀请码无效，请联系美甲师重新获取"
                    }
                    credentialChecking = false
                }
            } catch {
                await MainActor.run {
                    credentialValid = false
                    credentialError = "邀请码无效，请联系美甲师重新获取"
                    credentialChecking = false
                }
            }
        }
    }

    // MARK: - Password Validation

    private func isValidPassword(_ password: String) -> Bool {
        password.count >= 8 &&
        password.range(of: "[a-zA-Z]", options: .regularExpression) != nil &&
        password.range(of: "[0-9]", options: .regularExpression) != nil
    }

    // MARK: - Register

    private func register() {
        guard canSubmit else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                if credentialType == .activationKey {
                    // Register as technician
                    try await registerTechnician()
                } else {
                    // Register as client
                    try await appState.registerClient(phone: phone, password: password, inviteCode: credential)
                }
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func registerTechnician() async throws {
        let response: TechnicianAuthResponse = try await APIClient.shared.request(
            .technicianRegister(key: credential, phone: phone, password: password)
        )
        await TokenManager.shared.clearAll()
        await TokenManager.shared.saveTokens(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            role: .technician
        )
        await TokenManager.shared.setCurrentRole(.technician)
        appState.currentRole = .technician
        appState.authStatus = .technician(response.technician)
    }
}

// MARK: - Preview

#Preview {
    RegisterView()
        .environmentObject(AppState.shared)
}
