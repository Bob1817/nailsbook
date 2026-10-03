import SwiftUI

// MARK: - Onboarding View (post-registration guidance)

struct OnboardingView: View {
    @EnvironmentObject var appState: AppState
    @State private var showBindSheet = false
    @State private var showActivateSheet = false
    @State private var showSkipConfirm = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Spacer()

                // Welcome header
                VStack(spacing: 16) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 48))
                        .foregroundColor(NBColors.action)

                    Text("欢迎加入 OnlyNail")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(NBColors.ink)

                    Text("选择一种方式开始你的美甲之旅")
                        .font(.system(size: 15))
                        .foregroundColor(NBColors.muted)
                }
                .padding(.bottom, 48)

                // Options
                VStack(spacing: 14) {
                    optionCard(
                        icon: "person.2.fill",
                        title: "绑定美甲师",
                        subtitle: "输入邀请码，绑定你常用的美甲师",
                        color: NBColors.action
                    ) {
                        showBindSheet = true
                    }

                    optionCard(
                        icon: "scissors",
                        title: "我是美甲师",
                        subtitle: "使用激活码开通美甲师身份",
                        color: NBColors.link
                    ) {
                        showActivateSheet = true
                    }

                    Button {
                        showSkipConfirm = true
                    } label: {
                        Text("稍后再说，先去逛逛")
                            .font(.system(size: 15))
                            .foregroundColor(NBColors.muted)
                            .frame(minHeight: 44)
                    }
                }
                .padding(.horizontal, 24)

                Spacer()
                Spacer()
            }
            .background(NBColors.page)
            .navigationBarHidden(true)
            .sheet(isPresented: $showBindSheet) {
                BindTechnicianSheet(appState: appState)
            }
            .sheet(isPresented: $showActivateSheet) {
                ActivateTechnicianSheet(appState: appState)
            }
            .alert("跳过引导？", isPresented: $showSkipConfirm) {
                Button("取消", role: .cancel) {}
                Button("确认跳过") {
                    Task { await appState.restoreSession() }
                }
            } message: {
                Text("你可以随时在\"我的\"页面绑定美甲师或激活美甲师身份")
            }
        }
    }

    private func optionCard(icon: String, title: String, subtitle: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14)
                        .fill(color.opacity(0.12))
                        .frame(width: 52, height: 52)
                    Image(systemName: icon)
                        .font(.system(size: 22))
                        .foregroundColor(color)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(NBColors.ink)
                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.muted)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(NBColors.control)
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(Radius.lg)
            .shadow(color: Color.black.opacity(0.05), radius: 8, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Bind Technician Sheet

struct BindTechnicianSheet: View {
    @ObservedObject var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var inviteCode = ""
    @State private var note = ""
    @State private var verifiedTech: TechnicianProfile?
    @State private var verifyError: String?
    @State private var submitError: String?
    @State private var loading = false
    @State private var submitted = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text("输入美甲师的邀请码或邀请链接")
                    .font(.system(size: 15))
                    .foregroundColor(NBColors.muted)

                // Invite code input
                HStack(spacing: 10) {
                    TextField("邀请码", text: $inviteCode)
                        .font(.system(size: 16))
                        .textInputAutocapitalization(.characters)
                        .padding(12)
                        .background(NBColors.page)
                        .cornerRadius(Radius.sm)

                    Button {
                        Task { await verifyCode() }
                    } label: {
                        Text(loading ? "验证中..." : "验证")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                            .frame(height: 44)
                            .padding(.horizontal, 16)
                            .background(inviteCode.isEmpty ? Color.gray : NBColors.action)
                            .cornerRadius(Radius.sm)
                    }
                    .disabled(inviteCode.isEmpty || loading)
                }

                // Verified result
                if let tech = verifiedTech {
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(NBColors.success)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("已确认：\(tech.name)")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(NBColors.ink)
                            Text(tech.phone)
                                .font(.system(size: 13))
                                .foregroundColor(NBColors.muted)
                        }
                    }
                    .padding(12)
                    .background(NBColors.success.opacity(0.08))
                    .cornerRadius(Radius.md)
                }

                if let err = verifyError {
                    Text(err)
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.danger)
                }

                // Note (optional)
                if verifiedTech != nil {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("备注（选填）")
                            .font(.system(size: 14))
                            .foregroundColor(NBColors.muted)
                        TextField("如：朋友推荐", text: $note)
                            .font(.system(size: 15))
                            .padding(12)
                            .background(NBColors.page)
                            .cornerRadius(Radius.sm)
                    }
                }

                if let err = submitError {
                    Text(err)
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.danger)
                }

                if submitted {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(NBColors.success)
                        Text("绑定申请已提交，等待美甲师审核")
                            .font(.system(size: 15))
                            .foregroundColor(NBColors.success)
                    }
                    .padding(12)
                    .background(NBColors.success.opacity(0.08))
                    .cornerRadius(Radius.md)
                }

                Spacer()
            }
            .padding(20)
            .navigationTitle("绑定美甲师")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("返回") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("确认绑定") {
                        Task { await submitBind() }
                    }
                    .foregroundColor(NBColors.action)
                    .disabled(verifiedTech == nil || loading || submitted)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func verifyCode() async {
        guard !inviteCode.isEmpty else { return }
        loading = true
        verifyError = nil
        verifiedTech = nil
        defer { loading = false }

        let code = extractCode(from: inviteCode)

        do {
            let tech: TechnicianProfile = try await APIClient.shared.request(.findTechnicianByInviteCode(code: code))
            verifiedTech = tech
        } catch {
            verifyError = "邀请码无效或已过期"
        }
    }

    private func submitBind() async {
        guard verifiedTech != nil else { return }
        loading = true
        submitError = nil
        defer { loading = false }

        let code = extractCode(from: inviteCode)

        do {
            try await APIClient.shared.requestVoid(.bindTechnician(inviteCode: code, note: note.isEmpty ? nil : note, source: "onboarding"))
            submitted = true
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            dismiss()
            await appState.restoreSession()
        } catch {
            submitError = error.localizedDescription
        }
    }

    private func extractCode(from input: String) -> String {
        // If it's a URL, extract the code parameter
        if input.contains("://") || input.contains("?") {
            if let url = URL(string: input),
               let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
               let codeItem = components.queryItems?.first(where: { $0.name == "code" || $0.name == "inviteCode" }),
               let value = codeItem.value {
                return value
            }
        }
        return input.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Activate Technician Sheet

struct ActivateTechnicianSheet: View {
    @ObservedObject var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var activationKey = ""
    @State private var showKey = false
    @State private var error: String?
    @State private var loading = false
    @State private var success = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text("输入管理员提供的激活码，开通美甲师身份")
                    .font(.system(size: 15))
                    .foregroundColor(NBColors.muted)

                // Activation key input
                HStack {
                    if showKey {
                        TextField("激活码", text: $activationKey)
                            .font(.system(size: 16, design: .monospaced))
                            .textInputAutocapitalization(.characters)
                    } else {
                        SecureField("激活码", text: $activationKey)
                            .font(.system(size: 16, design: .monospaced))
                    }

                    Button {
                        showKey.toggle()
                    } label: {
                        Image(systemName: showKey ? "eye.slash" : "eye")
                            .font(.system(size: 16))
                            .foregroundColor(NBColors.muted)
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(12)
                .background(NBColors.page)
                .cornerRadius(Radius.sm)

                if let err = error {
                    Text(err)
                        .font(.system(size: 13))
                        .foregroundColor(NBColors.danger)
                }

                if success {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(NBColors.success)
                        Text("激活成功！正在进入美甲师模式...")
                            .font(.system(size: 15))
                            .foregroundColor(NBColors.success)
                    }
                    .padding(12)
                    .background(NBColors.success.opacity(0.08))
                    .cornerRadius(Radius.md)
                }

                Button {
                    Task { await activate() }
                } label: {
                    HStack {
                        if loading {
                            ProgressView().scaleEffect(0.8).tint(.white)
                        }
                        Text(loading ? "激活中..." : "激活美甲师账户")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(activationKey.isEmpty ? Color.gray : NBColors.action)
                    .cornerRadius(Radius.lg)
                }
                .disabled(activationKey.isEmpty || loading || success)

                Spacer()
            }
            .padding(20)
            .navigationTitle("激活美甲师")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("返回") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func activate() async {
        guard !activationKey.isEmpty else { return }
        loading = true
        error = nil
        defer { loading = false }

        do {
            let response: TechnicianAuthResponse = try await APIClient.shared.request(.activateTechnician(activationKey: activationKey))
            // Store technician tokens
            try await TokenManager.shared.saveTokens(accessToken: response.accessToken, refreshToken: response.refreshToken, role: .technician)
            try await TokenManager.shared.setCurrentRole(.technician)
            success = true
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            dismiss()
            await appState.restoreSession()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingView().environmentObject(AppState())
}