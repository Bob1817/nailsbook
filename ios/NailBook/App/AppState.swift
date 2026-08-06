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
    @Published var currentRole: UserRole = .client
    private let apiClient = APIClient.shared

    var isAuthenticated: Bool {
        if case .unauthenticated = authStatus { return false }
        if case .unknown = authStatus { return false }
        return true
    }

    // MARK: - Bootstrap

    func restoreSession() async {
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
        } catch {
            // Token invalid, clear and go to login
            await TokenManager.shared.clearAll()
            authStatus = .unauthenticated
        }
    }

    // MARK: - Login

    func loginAsClient(phone: String, password: String) async throws {
        let response: ClientAuthResponse = try await apiClient.request(
            .clientLogin(phone: phone, password: password)
        )
        await TokenManager.shared.saveTokens(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            role: .client
        )
        currentRole = .client
        if let client = response.client {
            authStatus = .client(client)
        }
    }

    func loginAsTechnician(phone: String, password: String) async throws {
        let response: TechnicianAuthResponse = try await apiClient.request(
            .technicianLogin(phone: phone, password: password)
        )
        await TokenManager.shared.saveTokens(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            role: .technician
        )
        currentRole = .technician
        authStatus = .technician(response.technician)
    }

    // MARK: - Register

    func registerClient(phone: String, password: String, inviteCode: String) async throws {
        let response: ClientAuthResponse = try await apiClient.request(
            .clientRegister(phone: phone, password: password, inviteCode: inviteCode)
        )
        await TokenManager.shared.saveTokens(
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            role: .client
        )
        currentRole = .client
        if let client = response.client {
            authStatus = .client(client)
        }
    }

    // MARK: - Logout

    func logout() async {
        await TokenManager.shared.clearAll()
        authStatus = .unauthenticated
    }

    // MARK: - Role Switch

    func switchRole(to role: UserRole) async {
        currentRole = role
        await restoreSession()
    }
}
