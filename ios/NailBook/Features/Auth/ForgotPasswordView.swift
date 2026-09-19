import SwiftUI

struct ForgotPasswordView: View {
    var role: UserRole = .client
    @Environment(\.dismiss) private var dismiss
    @State private var phone = ""
    @State private var code = ""
    @State private var password = ""
    @State private var busy = false
    @State private var message: String?
    @State private var sent = false

    var body: some View {
        NavigationStack {
            Form {
                Section("验证手机号") {
                    TextField("手机号", text: $phone).keyboardType(.phonePad)
                    Button("发送验证码") { perform(reset: false) }.frame(minHeight: 44)
                    TextField("验证码", text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode)
                }
                Section("设置新密码") {
                    SecureField("新密码（至少 8 位，含字母和数字）", text: $password)
                    Button("重置密码") { perform(reset: true) }
                        .frame(minHeight: 44).disabled(!sent || code.isEmpty || !AccountValidation.validPassword(password))
                }
                if let message { Text(message) }
                if busy { ProgressView() }
            }
            .disabled(busy)
            .navigationTitle("忘记密码")
            .toolbar { Button("关闭") { dismiss() } }
        }
    }

    private func perform(reset: Bool) {
        guard !busy, phone.count == 11 else { message = "请输入正确的手机号"; return }
        busy = true
        Task {
            defer { busy = false }
            do {
                let body = reset ? ["phone": phone, "code": code, "newPassword": password] : ["phone": phone]
                try await APIClient.shared.requestVoid(.resource(role: role, path: "auth/forgot-password/\(reset ? "reset" : "send-code")", method: "POST", body: body))
                sent = true
                message = reset ? "密码已重置，请返回登录" : "验证码已发送"
            } catch { message = error.localizedDescription }
        }
    }
}
