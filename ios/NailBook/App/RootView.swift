import SwiftUI

struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            switch appState.authStatus {
            case .unknown:
                if let error = appState.sessionError {
                    VStack(spacing: 16) {
                        Text(error)
                        Button("重新连接") { Task { await appState.restoreSession() } }
                            .frame(minHeight: 44)
                        Button("返回登录") { Task { await appState.logout() } }
                            .frame(minHeight: 44)
                    }.padding()
                } else {
                    NBLoadingView()
                }
            case .unauthenticated:
                LoginView()
            case .client:
                ClientTabView()
            case .technician:
                TechnicianTabView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
    }
}
