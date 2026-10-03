import SwiftUI
import Combine

@MainActor
class AppState: ObservableObject {
    static let shared = AppState()

    enum AuthStatus {
        case unknown
        case unauthenticated
        case client(ClientUser)
        case technician(TechnicianProfile)
    }

    @Published var authStatus: AuthStatus = .unknown
    @Published var sessionError: String?
    @Published var currentRole: UserRole = .client
    private let apiClient = APIClient.shared

    var isAuthenticated: Bool {
        if case .unauthenticated = authStatus { return false }
        if case .unknown = authStatus { return false }
        return true
    }

    // MARK: - Bootstrap

    func restoreSession() async {
        sessionError = nil
        guard let role = await TokenManager.shared.getCurrentRole() else {
            authStatus = .unauthenticated
            return
        }
        currentRole = role

        do {
            switch role {
            case .client:
                let user: ClientUser = try await apiClient.request(.clientMe)
                authStatus = .client(user)
            case .technician:
                let tech: TechnicianProfile = try await apiClient.request(.technicianMe)
                authStatus = .technician(tech)
            }
            await connectSocket()
            await requestPushPermission()
        } catch {
            switch error {
            case APIError.tokenRefreshFailed, APIError.unauthorized,
                 APIError.httpError(statusCode: 401, message: _):
                await TokenManager.shared.clearAll()
                authStatus = .unauthenticated
            default:
                sessionError = error.localizedDescription
            }
        }
    }

    // MARK: - Login

    func loginAsClient(phone: String, password: String) async throws {
        let response: ClientAuthResponse = try await apiClient.request(
            .clientLogin(phone: phone, password: password)
        )
        await TokenManager.shared.clearAll()
        try await TokenManager.shared.saveTokens(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            role: .client
        )
        if response.roles?.contains("technician") == true,
           let technician: TechnicianAuthResponse = try? await apiClient.request(.technicianLogin(phone: phone, password: password)) {
            try await TokenManager.shared.saveTokens(accessToken: technician.accessToken, refreshToken: technician.refreshToken, role: .technician)
        }
        try await TokenManager.shared.setCurrentRole(.client)
        currentRole = .client

        // 先用登录响应设置认证状态，保证登录成功
        // 登录响应的 technicians 在顶层，需合并进 ClientUser
        var client: ClientUser
        if let c = response.client {
            client = c
        } else {
            client = ClientUser(id: 0, phone: phone, status: nil)
        }
        // 合并登录响应中的绑定美甲师列表
        if client.technicians == nil || client.technicians?.isEmpty == true {
            client.technicians = response.technicians?.map {
                BoundTechnician(id: $0.id, name: $0.name, phone: $0.phone, isDefault: nil, bindingStatus: "active", invitationCode: $0.invitationCode, shopAddresses: nil)
            }
        }
        authStatus = .client(client)

        // 再拉取完整用户信息（含绑定的美甲师），失败时保留登录状态
        if let fullUser: ClientUser = try? await apiClient.request(.clientMe) {
            authStatus = .client(fullUser)
        }
        await connectSocket()
    }

    func loginAsTechnician(phone: String, password: String) async throws {
        let response: TechnicianAuthResponse = try await apiClient.request(
            .technicianLogin(phone: phone, password: password)
        )
        await TokenManager.shared.clearAll()
        try await TokenManager.shared.saveTokens(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            role: .technician
        )
        try await TokenManager.shared.setCurrentRole(.technician)
        currentRole = .technician

        // 直接用登录响应设置认证状态，避免 restoreSession 二次验证失败导致误判
        authStatus = .technician(response.technician)
        await connectSocket()
    }

    // MARK: - Register

    func registerClient(phone: String, password: String, inviteCode: String) async throws {
        let response: ClientAuthResponse = try await apiClient.request(
            .clientRegister(phone: phone, password: password, inviteCode: inviteCode)
        )
        await TokenManager.shared.clearAll()
        try await TokenManager.shared.saveTokens(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            role: .client
        )
        try await TokenManager.shared.setCurrentRole(.client)
        currentRole = .client
        if let client = response.client {
            authStatus = .client(client)
        }
        // 拉取完整用户信息（含绑定的美甲师）
        if let fullUser: ClientUser = try? await apiClient.request(.clientMe) {
            authStatus = .client(fullUser)
        }
    }

    // MARK: - Logout

    func logout() async {
        sessionError = nil
        ChatSocketManager.shared.disconnect()
        await TokenManager.shared.clearAll()
        authStatus = .unauthenticated
    }

    // MARK: - Role Switch

    func switchRole(to role: UserRole) async {
        sessionError = nil
        if role == .client, await TokenManager.shared.getAccessToken(for: .client) == nil {
            do {
                let response: ClientAuthResponse = try await apiClient.request(.resource(role: .technician, path: "auth/switch-to-client", method: "POST", body: [:]))
                try await TokenManager.shared.saveTokens(accessToken: response.accessToken, refreshToken: response.refreshToken, role: .client)
            } catch { sessionError = error.localizedDescription; return }
        }
        guard await TokenManager.shared.getAccessToken(for: role) != nil else {
            sessionError = "请通过切换账号，使用美甲师身份登录一次"; return
        }
        do {
            try await TokenManager.shared.setCurrentRole(role)
        } catch {
            sessionError = error.localizedDescription
            return
        }
        authStatus = .unknown
        await restoreSession()
    }

    // MARK: - Socket Connection

    private func connectSocket() async {
        guard let token = await TokenManager.shared.getAccessToken(for: currentRole) else { return }
        ChatSocketManager.shared.connect(token: token, role: currentRole)
    }

    // MARK: - Push Notifications

    func requestPushPermission() async {
        _ = await PushNotificationService.shared.requestPermission()
    }
}
